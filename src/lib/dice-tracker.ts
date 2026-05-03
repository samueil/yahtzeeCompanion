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

  // Filter to active tracks to avoid generating hypotheses from ghosts
  const activeTracks = state.tracks.filter((t) => t.missingFrames === 0);

  if (activeTracks.length > 0 && currentDetections.length > 0) {
    let maxScore = -1;
    // Always evaluate the "no movement" hypothesis first.
    const hypotheses = [{ tx: 0, ty: 0, isZero: true }];

    // Optimization: Only use the top 10 most confident new detections to generate hypotheses
    // to prevent O(N^4) explosion if there is heavy noise/clutter.
    const reliableDetections = [...currentDetections]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    // Generate translation hypotheses from all pairs of active track -> reliable detection
    for (const track of activeTracks) {
      const tLast = track.history[track.history.length - 1];
      const tCx = tLast.x + tLast.width / 2;
      const tCy = tLast.y + tLast.height / 2;
      for (const det of reliableDetections) {
        hypotheses.push({
          tx: det.x + det.width / 2 - tCx,
          ty: det.y + det.height / 2 - tCy,
          isZero: false,
        });
      }
    }

    // Score each hypothesis by how many dice align with it
    const perfectScore = activeTracks.length;

    for (const hyp of hypotheses) {
      let score = hyp.isZero ? 0.5 : 0; // Bias towards staying still
      const claimedDetections = new Set<number>();
      let rawMatches = 0;

      for (const track of activeTracks) {
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
            rawMatches += 1;
            // Small tie-breaker to favor hypotheses that preserve face values
            if (det.value === tLast.value) {
              score += 0.1;
            }
            claimedDetections.add(i);
            matched = true;
            break; // Move to next track
          }
        }

        // If a hypothesis causes an active track to completely miss any new detections,
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

      // Early short-circuit: If we perfectly matched all active tracks, we don't need to check worse hypotheses.
      // We subtract the 0.5 zero-bias from maxScore to see if we hit the raw perfect score.
      if (Math.floor(maxScore) >= perfectScore && rawMatches === perfectScore) {
        break;
      }
    }
  }
  // --- Step 1: Match Tracks using Predicted Positions (Global Closest Pair) ---
  // To prevent "ID stealing" (where track 1 steals the detection meant for track 2
  // just because track 1 was evaluated first), we calculate ALL distances first,
  // then match the absolute closest pairs globally.

  const distances: { trackIdx: number; detIdx: number; dist: number }[] = [];

  for (let tIdx = 0; tIdx < state.tracks.length; tIdx++) {
    const track = state.tracks[tIdx];
    const lastSeen = track.history[track.history.length - 1];
    const predictedCx = lastSeen.x + lastSeen.width / 2 + bestTx;
    const predictedCy = lastSeen.y + lastSeen.height / 2 + bestTy;

    for (let dIdx = 0; dIdx < unmatchedDetections.length; dIdx++) {
      const det = unmatchedDetections[dIdx];
      const detCx = det.x + det.width / 2;
      const detCy = det.y + det.height / 2;
      const dist = Math.sqrt(
        Math.pow(detCx - predictedCx, 2) + Math.pow(detCy - predictedCy, 2),
      );

      if (dist < TRACKING_DISTANCE_THRESHOLD) {
        distances.push({ trackIdx: tIdx, detIdx: dIdx, dist });
      }
    }
  }

  // Sort all possible matches by distance (closest first)
  distances.sort((a, b) => a.dist - b.dist);

  const matchedTracks = new Set<number>();
  const matchedDetections = new Set<number>();

  for (const match of distances) {
    if (
      matchedTracks.has(match.trackIdx) ||
      matchedDetections.has(match.detIdx)
    ) {
      continue; // One of these has already been claimed by a closer match
    }

    matchedTracks.add(match.trackIdx);
    matchedDetections.add(match.detIdx);

    const track = state.tracks[match.trackIdx];
    const matchedDetection = {
      ...unmatchedDetections[match.detIdx],
      id: track.id,
    };

    const newHistory = [...track.history, matchedDetection];
    if (newHistory.length > HISTORY_SIZE) {
      newHistory.shift();
    }

    newTracks.push({
      id: track.id,
      history: newHistory,
      missingFrames: 0,
    });
  }

  // Handle tracks that didn't find a match (Missing Frames)
  for (let tIdx = 0; tIdx < state.tracks.length; tIdx++) {
    if (!matchedTracks.has(tIdx)) {
      const track = state.tracks[tIdx];
      if (track.missingFrames < MAX_MISSING_FRAMES) {
        const lastSeen = track.history[track.history.length - 1];
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

  // Remove the claimed detections from unmatchedDetections so they aren't created as new tracks.
  // We iterate backwards to avoid messing up indices.
  const sortedMatchedDetections = Array.from(matchedDetections).sort(
    (a, b) => b - a,
  );
  for (const detIdx of sortedMatchedDetections) {
    unmatchedDetections.splice(detIdx, 1);
  }

  // --- Step 2: Create new tracks for remaining unmatched detections ---
  let newNextId = state.nextId;
  for (const det of unmatchedDetections) {
    const id = `die-${newNextId++}`;
    const newDetection = { ...det, id };
    newTracks.push({
      id,
      history: [newDetection],
      missingFrames: 0,
    });
  }

  // --- Step 3: Generate the "stabilized" current state ---
  // We ONLY return tracks that were physically matched or newly created in THIS frame.
  // We do NOT return "missing" tracks (missingFrames > 0), so we don't draw ghost overlays.
  // Their history is still kept in the `state` so they can be re-linked if they reappear.
  const visibleTracks = newTracks.filter((t) => t.missingFrames === 0);

  const stabilizedDetections = visibleTracks.map((t) => {
    const latest = t.history[t.history.length - 1];

    if (latest.overrideValue) {
      return {
        ...latest,
        value: latest.overrideValue,
        historyLength: t.history.length,
      };
    }

    const stabilizedValue = getMostFrequentValue(t.history);

    return {
      ...latest,
      value: stabilizedValue,
      historyLength: t.history.length,
    };
  });

  return {
    state: { nextId: newNextId, tracks: newTracks },
    stabilizedDetections,
  };
}
