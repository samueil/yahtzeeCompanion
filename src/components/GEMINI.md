# src/components

## Exports

All components are re-exported through `index.ts`. Import from `src/components`, not individual files:

```ts
import { Die, DiceScanner, AROverlay, CaptureButton, CloseButton } from './src/components';
```

## Platform-Specific Files

`DiceScanner` has two implementations selected at build time by React Native's file extension resolver:

| File | Target | Purpose |
|---|---|---|
| `dice-scanner.tsx` | iOS + Android | Full camera + TFLite ML pipeline |
| `dice-scanner.web.tsx` | Web | Random-roll simulator (no camera access) |

**Keep the props interface identical** between both files. Any change to `DiceScanner` props must be applied in both.

## Component Reference

### `Die`

Renders a single die face.

```ts
interface DieProps {
  value: number;      // 1–6
  locked: boolean;    // shows locked visual state
  disabled: boolean;  // prevents tap interaction (before first roll)
  onClick: () => void;
}
```

### `CaptureButton`

A dedicated button component for capturing the scanned dice frame.

### `CloseButton`

A reusable close button component for dismissing modals or overlays.

### `AROverlay`

Renders real-time bounding boxes over the camera feed. Receives `DiceDetection[]` bridged from the worklet thread.

Confidence-based colour coding:
- `< 0.6` → red (low confidence)
- `0.6 – 0.85` → yellow (medium)
- `≥ 0.85` → green (high)

This threshold logic lives in `ar-overlay.tsx` — adjust it there if you retrain or swap the model.

### `DiceScanner` (native)

Full-screen camera modal.

```ts
interface DiceScannerProps {
  neededCount: number;                         // unlocked dice slots to fill
  onScanComplete: (values: number[]) => void;  // called with confirmed dice values
  onClose: () => void;
}
```

Internal state: `detections: DiceDetection[]` (live worklet output) and `isCameraReady: boolean`.

The frame processor worklet runs at ~2 FPS — this is intentional to avoid UI thread contention. Do not remove the frame rate cap.

Camera permissions are handled by the `useCameraPermissions` hook (`src/hooks/`), which requests permission on mount and surfaces a `permissionError` boolean if denied.
