# Yahtzee Companion 🎲

A React Native (Expo) app that acts as a digital companion for physical Yahtzee games. Features a digital scorecard and an AR-powered dice scanner using a custom YOLOv8 machine learning model to automatically count your dice rolls.

## 📐 Architecture & Tech Stack

This project is built to achieve real-time (30-60 FPS) dice detection on mobile devices without lagging the user interface. It accomplishes this by completely separating the UI thread from the camera and machine learning processing pipeline.

**Core Tech Stack:**
- **UI Framework:** React Native with Expo (TypeScript)
- **Camera:** [`react-native-vision-camera`](https://github.com/mrousavy/react-native-vision-camera) (Allows raw frame access natively)
- **Threading:** [`react-native-worklets-core`](https://github.com/margelo/react-native-worklets-core) (Executes ML logic on a background C++ thread)
- **Machine Learning:** [`react-native-fast-tflite`](https://github.com/mrousavy/react-native-fast-tflite) (Runs TensorFlow Lite models inside the Vision Camera frame processor)
- **Image Processing:** [`vision-camera-resize-plugin`](https://github.com/mrousavy/vision-camera-resize-plugin) (Handles dynamic image scaling to model requirements)

### The Machine Learning Pipeline
1. **Model:** A custom trained YOLOv8 model (`yolov8-dice.tflite`) exported from Roboflow and placed in the `assets/` directory.
2. **Frame Processor:** The camera captures a raw frame and hands it to a C++ worklet background thread (`runAtTargetFps`).
3. **Resizing:** The raw frame is synchronously resized (e.g. to 640x640) and converted to a `Float32Array`.
4. **Inference:** The model executes `runSync` on the C++ thread, dropping frames if it falls behind to ensure zero camera preview lag.
5. **Parsing:** The raw 3D tensor (`[1, 10, 8400]`) is parsed manually, applying probability checks and Non-Maximum Suppression (NMS) to detect distinct physical dice (1 through 6).
6. **Bridge to UI:** Detections are safely bridged back to the React UI using `Worklets.createRunOnJS`, drawing real-time Augmented Reality bounding boxes (`<AROverlay>`).

## 🚀 How to Run & Collaborate

Because this project relies on **custom C++ native code** (Vision Camera, Fast TFLite, Worklets), **it cannot be run inside the standard "Expo Go" app.** You must create a local native build using `expo run:android` or `expo run:ios`.

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- Android Studio / Android SDK (for Android builds)
- Xcode (for iOS builds, Mac only)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running on Android
This will compile the native Android project, install the APK on your emulator or connected physical device, and start the Expo Metro Bundler.
```bash
npm run android
```

### Running on iOS (Mac Only)
This will install CocoaPods, compile the native iOS project, install the app on your simulator or connected physical device, and start the Expo Metro Bundler.
```bash
npm run ios
```

### Running on Web
The app is fully compatible with the Web, though standard web browsers lack the C++ Native Modules to access raw camera frames and hardware-accelerated TFLite. 

When running on the web, the app dynamically mocks the `<DiceScanner>` with a "Simulate Roll" interface so you can still play the game and test UI logic!
```bash
npm run web
```

## 🛠️ Project Structure
- `App.tsx` - The main entry point, rendering the scorecard, sections, and bottom control deck.
- `src/components/` - UI elements (`die.tsx`, `ar-overlay.tsx`) and the camera integration (`dice-scanner.tsx`).
  - `dice-scanner.web.tsx` - The fallback mock for the web platform.
- `src/constants/` - Yahtzee category rules.
- `src/utils/scoring.ts` - Algorithms for validating and scoring different Yahtzee combinations.
- `src/domain/` - Typescript interfaces for the ML pipeline (`DiceDetection`).

## ⚠️ Known Issues / TODO
- **Roll Dice Behaviour without Scanner:** Introduce perstistence for setting whether the Button rolls random dice, or opens the camera.
- **Multiplayer:** Setup Option to add at least one Player
- **YOLOv8 Output Parser Tuning:** The C++ worklet currently extracts bounding boxes using a hardcoded tensor parser designed for an exported YOLOv8 shape. Depending on the exact `.tflite` model used, the `numFeatures` vs `numAnchors` transposed shape may need calibration to ensure bounding boxes render at the correct sizes.
