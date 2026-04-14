# src/lib — Pure Business Logic

All functions here are pure (no React, no side effects, no imports from `components/`). They are unit-tested directly.

## scoring.ts

`calculatePotentialScore(dice: number[], category: Category): number`

The single entry point for scoring. Computes what a given set of 5 dice would score in a given category. Called on every render to show live potential scores while the user holds dice — keep it cheap.

**Upper section** (`aces` through `sixes`): sums all dice that match `category.val`.

**Lower section:**

| Category id | Rule | Fixed score |
|---|---|---|
| `threeOfAKind` | Any 3+ of a kind | Sum of all dice |
| `fourOfAKind` | Any 4+ of a kind | Sum of all dice |
| `fullHouse` | 3 of one + 2 of another | 25 |
| `smallStraight` | 4 consecutive values | 30 |
| `largeStraight` | 5 consecutive values | 40 |
| `chance` | Always | Sum of all dice |
| `yahtzee` | All 5 match | 50 |

Upper bonus (+35) is calculated in `App.tsx` from the running upper total, not here.

## dice-processor.ts

Frame processing for the YOLOv8 detection pipeline. Both exported functions are marked `'worklet'` — they execute on the worklet thread, not the JS thread. **Do not call any React API or use `console.log` inside them.**

---

### `calculateCoordinateMapping(config: FrameLayoutConfig)`

Maps camera sensor space → screen coordinates so the `AROverlay` bounding boxes land in the right place.

The pipeline it accounts for:
1. **Sensor orientation** — We assume Portrait, as it's enforced by `app.json`. The shorter dimension of the raw frame becomes the physical width of the video.
2. **Cover scaling** — the camera feed fills the screen, clipping edges; we find the max scale factor
3. **1:1 centre crop** — only the square centre of the frame is passed to the model; everything outside is ignored

Returns: `{ screenCropY, screenCropSize, screenOffsetX, sensorCropX, sensorCropY, sensorCropSize }`

These values are consumed by `DiceScanner` to position the crop guide overlay and by `AROverlay` to map detection coordinates.

---

### `processDiceFrame(options: ProcessDiceFrameOptions): DiceDetection[]`

Parses the raw YOLOv8 TFLite output tensor into a list of detected dice.

**Tensor layout:** YOLOv8 can output either `[1, features, 8400]` (transposed) or `[1, 8400, features]`. The function auto-detects the layout by comparing `outputShape[1]` vs `outputShape[2]`.

**Feature vector:** `[cx, cy, w, h, class_0, class_1, ..., class_5]`
- Indices 0–3: normalised bounding box centre + size (0.0–1.0 relative to the 640×640 input)
- Indices 4–9: class probabilities for dice faces 1–6 (class index 0 = face 1)
- Any extra features (index 10+) are ignored

**Coordinate denormalisation:** normalised coords are multiplied by `cropSize` (the on-screen pixel size of the square crop) and offset by `cropY` / `offsetX` to get absolute screen positions.

**NMS:** detections are sorted by confidence descending, then any box whose centre is within 30px of an already-accepted box is dropped as a duplicate.

**`confidenceThreshold`** is set by the caller (currently `0.15` in `DiceScanner`). Tune it there, not here.
