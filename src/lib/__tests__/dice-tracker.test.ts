import type { DiceDetection } from '../../domain/dice-detection';
import type { DieValue } from '../../domain/die-value';
import { createInitialTrackerState, updateDiceTracks } from '../dice-tracker';

describe('dice-tracker', () => {
  const mockDetection = (
    x: number,
    y: number,
    value: DieValue = 1,
  ): DiceDetection => ({
    x,
    y,
    width: 50,
    height: 50,
    value,
    confidence: 0.9,
  });

  it('assigns unique IDs to new detections', () => {
    const state = createInitialTrackerState();
    const { state: nextState, stabilizedDetections } = updateDiceTracks(state, [
      mockDetection(10, 10),
      mockDetection(100, 100),
    ]);

    expect(stabilizedDetections).toHaveLength(2);
    expect(stabilizedDetections[0].id).toBe('die-1');
    expect(stabilizedDetections[1].id).toBe('die-2');
    expect(nextState.nextId).toBe(3);
  });

  it('keeps the same ID for a die that moves slightly', () => {
    const state = createInitialTrackerState();
    // Frame 1
    const { state: state1, stabilizedDetections: det1 } = updateDiceTracks(
      state,
      [mockDetection(10, 10)],
    );
    expect(det1[0].id).toBe('die-1');

    // Frame 2: Moved 20px
    const { stabilizedDetections: det2 } = updateDiceTracks(state1, [
      mockDetection(30, 30),
    ]);
    expect(det2[0].id).toBe('die-1');
    expect(det2[0].x).toBe(30);
  });

  it('stabilizes the value using history (voting)', () => {
    let state = createInitialTrackerState();

    // 3 frames of value 6
    for (let i = 0; i < 3; i++) {
      const res = updateDiceTracks(state, [mockDetection(10, 10, 6)]);
      state = res.state;
    }

    // 1 frame of value 1 (a glitch)
    const { stabilizedDetections } = updateDiceTracks(state, [
      mockDetection(10, 10, 1),
    ]);

    // Should still report 6 because it's the most frequent in history
    expect(stabilizedDetections[0].value).toBe(6);
  });

  it('recovers a die and its ID after a flicker (missing frames)', () => {
    let state = createInitialTrackerState();

    // Frame 1: Detection exists
    const res1 = updateDiceTracks(state, [mockDetection(10, 10)]);
    state = res1.state;
    expect(res1.stabilizedDetections).toHaveLength(1);
    const originalId = res1.stabilizedDetections[0].id;

    // Frame 2: Detection is missing
    const res2 = updateDiceTracks(state, []);
    state = res2.state;
    expect(res2.stabilizedDetections).toHaveLength(0); // Should not draw ghost

    // Frame 3: Detection returns
    const res3 = updateDiceTracks(state, [mockDetection(12, 12)]);
    expect(res3.stabilizedDetections).toHaveLength(1);
    expect(res3.stabilizedDetections[0].id).toBe(originalId);
  });

  it('compensates for global camera movement (constellation matching)', () => {
    let state = createInitialTrackerState();

    // Two dice at 10,10 and 50,10
    const res1 = updateDiceTracks(state, [
      mockDetection(10, 10),
      mockDetection(50, 10),
    ]);
    state = res1.state;

    // Huge camera pan: dice are now at 510, 510 and 550, 510
    // This is a 500px jump, far beyond the 80px threshold!
    const res2 = updateDiceTracks(state, [
      mockDetection(510, 510),
      mockDetection(550, 510),
    ]);

    // Should successfully match IDs because it detected the constellation shift
    expect(res2.stabilizedDetections).toHaveLength(2);
    expect(res2.stabilizedDetections.map((d) => d.id)).toContain('die-1');
    expect(res2.stabilizedDetections.map((d) => d.id)).toContain('die-2');
  });

  it('prevents greedy ID swapping when a nearby die is removed', () => {
    let state = createInitialTrackerState();

    // Frame 1: Three dice close to each other
    // Track 1 is at x=100. Track 2 is at x=150. Track 3 is at x=200.
    const res1 = updateDiceTracks(state, [
      mockDetection(100, 100), // die-1
      mockDetection(150, 100), // die-2
      mockDetection(200, 100), // die-3
    ]);
    state = res1.state;

    // Frame 2: The first die (die-1 at x=100) is removed.
    // If the algorithm is greedy, Track 1 might steal the detection at x=150
    // before Track 2 gets a chance to claim it.
    const res2 = updateDiceTracks(state, [
      mockDetection(150, 100),
      mockDetection(200, 100),
    ]);

    expect(res2.stabilizedDetections).toHaveLength(2);
    const remainingIds = res2.stabilizedDetections.map((d) => d.id);

    // It should keep die-2 and die-3. die-1 should be missing.
    expect(remainingIds).not.toContain('die-1');
    expect(remainingIds).toContain('die-2');
    expect(remainingIds).toContain('die-3');

    // Verify that die-2 is still attached to the detection at x=150
    const die2 = res2.stabilizedDetections.find((d) => d.id === 'die-2');
    expect(die2?.x).toBe(150);
  });

  it('respects manual overrides immediately', () => {
    const state = createInitialTrackerState();

    const detection = mockDetection(10, 10, 6);
    detection.overrideValue = 1;

    const { stabilizedDetections } = updateDiceTracks(state, [detection]);

    expect(stabilizedDetections[0].value).toBe(1);
  });
});
