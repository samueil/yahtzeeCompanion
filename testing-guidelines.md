# Testing Guidelines

## Arrange / Act / Assert

Structure every test in three clearly separated phases with a blank line between each:

```ts
it('calls onClick when pressed', async () => {
  // Arrange
  const mockOnClick = jest.fn();
  const user = userEvent.setup();
  render(<Die value={1} locked={false} onClick={mockOnClick} disabled={false} />);

  // Act
  await user.press(screen.getByRole('button', { name: 'Die with value 1' }));

  // Assert
  expect(mockOnClick).toHaveBeenCalledTimes(1);
});
```

The blank line before `expect` is not enforced by ESLint (no rule targets specific function calls), but it is a required convention. Reviewers will flag missing blank lines.

---

## Stack

| Tool | Role |
|---|---|
| Jest (jest-expo preset) | Test runner |
| @testing-library/react-native | Component rendering + queries |
| @testing-library/jest-native | Custom matchers (`toBeVisible`, etc.) |
| jest-setup.js | Global mocks for native modules |

Run tests: `npm test`
Type-check separately: `npx tsc --noEmit` (CI runs both)

---

## File Placement

Test files live in a `__tests__/` directory **adjacent to the file under test**:

```
src/lib/
  scoring.ts
  __tests__/
    scoring.test.ts        ✓

src/components/
  die.tsx
  __tests__/
    die.test.tsx           ✓
```

Do **not** put all tests in a single top-level `__tests__/` folder — this severs the file-to-test relationship and makes navigation harder.

---

## 1. Pure Function Tests (`src/lib/`)

Pure functions are the easiest to test. Import them directly, pass inputs, assert outputs. No mocks, no setup.

### DO — test with explicit inputs and human-readable descriptions

```ts
// src/lib/__tests__/scoring.test.ts
import { calculatePotentialScore } from '../scoring';
import { CATEGORIES } from '../../constants/categories';

describe('calculatePotentialScore', () => {
  const getCategory = (id: string) =>
    [...CATEGORIES.UPPER, ...CATEGORIES.LOWER].find((c) => c.id === id)!;

  it('scores Aces as the sum of all 1s', () => {
    const dice = [1, 1, 3, 4, 1];
    expect(calculatePotentialScore(dice, getCategory('aces'))).toBe(3);
  });

  it('returns 0 when no matching dice exist', () => {
    const dice = [2, 3, 4, 5, 6];
    expect(calculatePotentialScore(dice, getCategory('aces'))).toBe(0);
  });
});
```

### DO — group related tests with nested `describe`

```ts
describe('calculatePotentialScore', () => {
  describe('Upper Section', () => { ... });
  describe('Lower Section', () => { ... });
  describe('Edge Cases', () => { ... });
});
```

See `src/lib/__tests__/scoring.test.ts` for the full pattern with 80+ cases.

### DO — test edge cases explicitly

```ts
// Unordered dice should still match a straight
it('handles unordered dice for straights', () => {
  expect(calculatePotentialScore([4, 1, 3, 2, 6], getCategory('smallStraight'))).toBe(30);
});

// 5-of-a-kind is NOT a Full House in this implementation
it('scores 0 for Full House when all 5 dice match', () => {
  expect(calculatePotentialScore([5, 5, 5, 5, 5], getCategory('fullHouse'))).toBe(0);
});
```

### DON'T — test implementation details

```ts
// BAD: testing internal array shape, not the contract
it('builds a frequency map with 6 slots', () => {
  const freq = buildFrequencyMap([1, 1, 3]);
  expect(freq.length).toBe(6);
});
```

Test the public function's input/output contract, not how it works internally.

---

## 2. Worklet Functions (`src/lib/dice-processor.ts`)

Both `processDiceFrame` and `calculateCoordinateMapping` are marked `'worklet'`. Jest runs them as regular JS — the `'worklet'` directive is treated as a string literal and is harmless. Test them exactly like pure functions.

### DO — construct minimal tensor data to exercise a specific code path

```ts
// src/lib/__tests__/dice-processor.test.ts
it('parses a transposed [1, 11, 8400] tensor and returns the correct die value', () => {
  const numAnchors = 8400;
  const numFeatures = 11;
  const tensor = new Float32Array(numFeatures * numAnchors);

  tensor[0 * numAnchors + 0] = 0.5;  // cx
  tensor[1 * numAnchors + 0] = 0.5;  // cy
  tensor[2 * numAnchors + 0] = 0.1;  // w
  tensor[3 * numAnchors + 0] = 0.1;  // h
  tensor[9 * numAnchors + 0] = 0.95; // class 6 (index 4+5)

  const results = processDiceFrame({
    outputTensor: tensor,
    outputShape: [1, 11, 8400],
    cropY: 420,
    cropSize: 1080,
    confidenceThreshold: 0.15,
  });

  expect(results).toHaveLength(1);
  expect(results[0].value).toBe(6);
  expect(results[0].confidence).toBeCloseTo(0.95);
});
```

See `src/lib/__tests__/dice-processor.test.ts` for coordinate mapping assertions using `toBeCloseTo`.

### DON'T — try to test worklet execution via the native bridge

```ts
// BAD: the native bridge doesn't exist in Jest
const frame = camera.getFrame();
const result = frameProcessor(frame); // will throw
```

Test the pure parsing functions directly. The bridge integration is covered by running on device.

### DO — assert the full result object in one `expect`

Multiple sequential `expect(result.field).toBe(...)` calls stop at the first failure, hiding subsequent mismatches. Use a single `toEqual` so Jest reports every wrong field at once:

```ts
// GOOD — all mismatched fields shown in one failure
expect(calculateCoordinateMapping(config)).toEqual({
  sensorCropSize: 480,
  sensorCropX: 80,
  sensorCropY: 0,
  screenCropSize: expect.closeTo(500, 4),
  screenCropY: expect.closeTo(0, 4),
  screenOffsetX: expect.closeTo(0, 4),
});

// BAD — stops at the first failure; subsequent fields are unknown
expect(result.sensorCropSize).toBe(480);
expect(result.screenCropSize).toBeCloseTo(500, 4);
expect(result.screenCropY).toBeCloseTo(0, 4);
expect(result.screenOffsetX).toBeCloseTo(0, 4);
```

Use `expect.closeTo(value, numDigits)` inside `toEqual` for floating-point fields. This is available from Jest 28 (included via jest-expo).

---

## 3. Component Tests (`src/components/`)

Use `@testing-library/react-native`. Query by accessibility role or label first — this ensures the component is accessible and tests survive visual refactors.

### DO — use `screen` for all queries, not the `render` return value

```ts
// GOOD
render(<Die value={3} locked={false} onClick={() => {}} disabled={false} />);
expect(screen.getByRole('button', { name: 'Die with value 3' })).toBeVisible();

// BAD — destructuring from render() is the old API; avoid it
const { getByRole } = render(<Die value={3} locked={false} onClick={() => {}} disabled={false} />);
expect(getByRole('button', { name: 'Die with value 3' })).toBeVisible();
```

`screen` always reflects the currently rendered output. Destructuring binds queries to one render call and becomes stale after re-renders.

### DO — query by role and accessible name

```ts
// src/components/__tests__/die.test.tsx
it('renders with an accessible name', () => {
  render(<Die value={3} locked={false} onClick={() => {}} disabled={false} />);
  expect(screen.getByRole('button', { name: 'Die with value 3' })).toBeVisible();
});

it('includes locked state in the accessible name', () => {
  render(<Die value={6} locked={true} onClick={() => {}} disabled={false} />);
  expect(screen.getByRole('button', { name: 'Die with value 6, locked' })).toBeVisible();
});
```

### DO — use `userEvent` for interactions (not `fireEvent`)

`userEvent` simulates real user gestures including pointer events. `fireEvent` bypasses them.

```ts
it('calls onClick when pressed', async () => {
  const mockOnClick = jest.fn();
  const user = userEvent.setup();

  render(<Die value={1} locked={false} onClick={mockOnClick} disabled={false} />);
  await user.press(screen.getByRole('button', { name: 'Die with value 1' }));

  expect(mockOnClick).toHaveBeenCalledTimes(1);
});
```

### DO — use `testId` only when no accessibility selector exists

`testId` is acceptable for purely visual elements with no semantic role (e.g. coloured bounding boxes in `AROverlay`):

```ts
// Justified: detection boxes have no semantic role; we're testing computed style values
const redBox = screen.getByTestId('detection-box-0');
expect(redBox.props.style).toEqual(
  expect.objectContaining({ borderColor: 'rgba(255, 0, 30, 0.8)' }),
);
```

### DO — verify callbacks receive correct arguments

```ts
it('calls onDetectionSatisfied(true) when enough high-confidence dice are detected', () => {
  const mockOnDetectionSatisfied = jest.fn();
  const detections: DiceDetection[] = [
    { value: 1, x: 10, y: 10, width: 50, height: 50, confidence: 0.8 },
    { value: 2, x: 70, y: 70, width: 50, height: 50, confidence: 0.9 },
  ];
  render(
    <AROverlay
      detections={detections}
      targetCount={2}
      onDetectionSatisfied={mockOnDetectionSatisfied}
    />,
  );
  expect(mockOnDetectionSatisfied).toHaveBeenCalledWith(true);
});
```

See `src/components/__tests__/ar-overlay.test.tsx` for the full confidence colour-mapping pattern.

### DON'T — use snapshot tests

```ts
// BAD
expect(render(<Die value={3} ... />).toJSON()).toMatchSnapshot();
```

Snapshots are brittle (break on any Tailwind class reorder), give no signal about correctness, and add noise to diffs. Test specific behaviour instead.

### DON'T — assert on NativeWind `className` strings

```ts
// BAD: testing implementation detail, not observable behaviour
expect(element.props.className).toContain('bg-primary');
```

Assert on visual props (`style`) or accessible state instead.

### DON'T — test React Native internals

```ts
// BAD: not our code
expect(SafeAreaView).toBeDefined();
```

---

## 4. Mocking Native Modules

Native modules (`react-native-reanimated`, `react-native-worklets-core`, etc.) are mocked globally in `jest-setup.js`:

```js
// jest-setup.js
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createRunInContextFn: jest.fn(),
    createContext: jest.fn(),
  },
}));
```

**When adding a new native dependency:** add its mock to `jest-setup.js` before writing any tests that import it. Without a mock, Jest will throw at import time.

### DON'T — mock internal project modules

```ts
// BAD: mocking our own scoring logic defeats the test
jest.mock('../../lib/scoring', () => ({ calculatePotentialScore: () => 42 }));
```

Mock at system boundaries (native APIs, camera, TFLite), not between your own modules.

### DON'T — test the platform split file indirectly

`dice-scanner.web.tsx` and `dice-scanner.tsx` have separate responsibilities. Test them separately if needed. Don't assume the Jest environment resolves to the native file — jest-expo uses a specific resolver.

---

## 5. What Not to Test

| Scenario | Why |
|---|---|
| TFLite model accuracy | Test the tensor parser (`processDiceFrame`), not the model weights |
| Expo / React Native framework code | Not our code, not our responsibility |
| NativeWind class ordering | Covered by ESLint + Prettier in `npm run lint` |
| Camera lifecycle (open/close) | Requires a real device; covered by manual QA |
| Yahtzee upper bonus calculation | Lives in `App.tsx` inline — if extracted, test it |

---

## 6. CI Requirements

All of the following must pass on every PR:

```
npx tsc --noEmit    # no type errors
npm run lint        # ESLint clean
npm test            # all Jest tests pass
npm run build:check # Expo bundle builds
```

Tests run on Node 22 / Ubuntu in GitHub Actions (`.github/workflows/ci.yml`). Do not write tests that depend on macOS-specific paths or iOS simulator availability.
