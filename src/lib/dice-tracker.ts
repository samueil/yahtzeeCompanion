import type { DiceDetection } from '../domain/dice-detection';
import type { DieValue } from '../domain/die-value';

// Maximum distance a die center can move between frames to be considered the same die.
const TRACKING_DISTANCE_THRESHOLD = 80;
// How many frames a die can be "missing" before we stop tracking it completely.
const MAX_MISSING_FRAMES = 5;
// How many previous detections to keep for voting and smoothing.
const HISTORY_SIZE = 10;

export interface TrackedDie {
  id: string;
  history: DiceDetection[];
  missingFrames: number;
}

export interface TrackerState {
  nextId: number;
  tracks: TrackedDie[];
}

export function createInitialTrackerState(): TrackerState {
  return {
    nextId: 1,
    tracks: [],
  };
}

function getMostFrequentValue(history: DiceDetection[]): DieValue {
  'worklet';
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let maxCount = 0;
  let mostFrequentValue = history[history.length - 1].value;

  for (const det of history) {
    counts[det.value]++;
    if (counts[det.value] > maxCount) {
      maxCount = counts[det.value];
      mostFrequentValue = det.value;
    }
  }

  return mostFrequentValue;
}

export function updateDiceTracks(
  state: TrackerState,
  currentDetections: DiceDetection[],
): { state: TrackerState; stabilizedDetections: DiceDetection[] } {
  'worklet';
  const newTracks: TrackedDie[] = [];
  const unmatchedDetections = [...currentDetections];

  // --- Step 0: Predict Camera Movement (Constellation Matching) ---
  let bestTx = 0;
  let bestTy = 0;

  if (state.tracks.length > 0 && currentDetections.length > 0) {
    let maxScore = -1;
    // Always evaluate the "no movement" hypothesis first.
    // We give it a slight artificial boost so that if it ties with a random shift,
    // we prefer to assume the camera didn't move.
    const hypotheses = [{ tx: 0, ty: 0, isZero: true }];

    // Generate translation hypotheses from all pairs of old track -> new detection
    for (const track of state.tracks) {
      const tLast = track.history[track.history.length - 1];
      const tCx = tLast.x + tLast.width / 2;
      const tCy = tLast.y + tLast.height / 2;
      for (const det of currentDetections) {
        hypotheses.push({
          tx: det.x + det.width / 2 - tCx,
          ty: det.y + det.height / 2 - tCy,
          isZero: false,
        });
      }
    }

    // Score each hypothesis by how many dice align with it
    for (const hyp of hypotheses) {
      let score = hyp.isZero ? 0.5 : 0; // Bias towards staying still
      const claimedDetections = new Set<number>();

      for (const track of state.tracks) {
        const tLast = track.history[track.history.length - 1];
        const predictedCx = tLast.x + tLast.width / 2 + hyp.tx;
        const predictedCy = tLast.y + tLast.height / 2 + hyp.ty;

        let matched = false;
        for (let i = 0; i < currentDetections.length; i++) {
          if (claimedDetections.has(i)) continue; // Don't let two old tracks claim the same new detection

          const det = currentDetections[i];
          const detCx = det.x + det.width / 2;
          const detCy = det.y + det.height / 2;
          const dist = Math.sqrt(
            Math.pow(detCx - predictedCx, 2) + Math.pow(detCy - predictedCy, 2),
          );

          if (dist < TRACKING_DISTANCE_THRESHOLD) {
            score += 1;
            // Small tie-breaker to favor hypotheses that preserve face values
            if (det.value === tLast.value) {
              score += 0.1;
            }
            claimedDetections.add(i);
            matched = true;
            break; // Move to next track
          }
        }

        // If a hypothesis causes an old track to completely miss any new detections,
        // penalize it slightly to prefer hypotheses that match more of the total constellation.
        if (!matched) {
          score -= 0.2;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestTx = hyp.tx;
        bestTy = hyp.ty;
      }
    }
  }

  // --- Step 1: Match Tracks using Predicted Positions ---
  for (const track of state.tracks) {
    let bestMatchIdx = -1;
    let minDistance = TRACKING_DISTANCE_THRESHOLD;

    const lastSeen = track.history[track.history.length - 1];
    // Apply the predicted camera movement to the old position
    const predictedCx = lastSeen.x + lastSeen.width / 2 + bestTx;
    const predictedCy = lastSeen.y + lastSeen.height / 2 + bestTy;

    for (let i = 0; i < unmatchedDetections.length; i++) {
      const det = unmatchedDetections[i];
      const detCx = det.x + det.width / 2;
      const detCy = det.y + det.height / 2;

      const dist = Math.sqrt(
        Math.pow(detCx - predictedCx, 2) + Math.pow(detCy - predictedCy, 2),
      );

      if (dist < minDistance) {
        minDistance = dist;
        bestMatchIdx = i;
      }
    }

    if (bestMatchIdx !== -1) {
      // We found a match! Update the track.
      const matchedDetection = unmatchedDetections[bestMatchIdx];
      matchedDetection.id = track.id; // Assign the persistent ID

      const newHistory = [...track.history, matchedDetection];
      if (newHistory.length > HISTORY_SIZE) {
        newHistory.shift(); // Keep only the last N items
      }

      newTracks.push({
        id: track.id,
        history: newHistory,
        missingFrames: 0,
      });

      // Remove from unmatched so it isn't matched again
      unmatchedDetections.splice(bestMatchIdx, 1);
    } else {
      // No match found. The die is missing in this frame.
      if (track.missingFrames < MAX_MISSING_FRAMES) {
        // Shift the "revived" detection by the camera movement so it follows the screen!
        const shiftedLastSeen: DiceDetection = {
          ...lastSeen,
          x: lastSeen.x + bestTx,
          y: lastSeen.y + bestTy,
        };

        const newHistory = [...track.history, shiftedLastSeen];
        if (newHistory.length > HISTORY_SIZE) {
          newHistory.shift();
        }

        newTracks.push({
          id: track.id,
          history: newHistory,
          missingFrames: track.missingFrames + 1,
        });
      }
    }
  }

  // --- Step 2: Create new tracks for remaining unmatched detections ---
  let newNextId = state.nextId;
  for (const det of unmatchedDetections) {
    const id = `die-${newNextId++}`;
    det.id = id;
    newTracks.push({
      id,
      history: [det],
      missingFrames: 0,
    });
  }

  // --- Step 3: Generate the "stabilized" current state ---
  // We ONLY return tracks that were physically matched or newly created in THIS frame.
  // We do NOT return "missing" tracks (missingFrames > 0), so we don't draw ghost overlays.
  // Their history is still kept in the `state` so they can be re-linked if they reappear.
  const activeTracks = newTracks.filter((t) => t.missingFrames === 0);

  const stabilizedDetections = activeTracks.map((t) => {
    const latest = t.history[t.history.length - 1];

    if (latest.overrideValue) {
      return {
        ...latest,
        value: latest.overrideValue,
      };
    }

    const stabilizedValue = getMostFrequentValue(t.history);

    return {
      ...latest,
      value: stabilizedValue,
    };
  });

  return {
    state: { nextId: newNextId, tracks: newTracks },
    stabilizedDetections,
  };
}
