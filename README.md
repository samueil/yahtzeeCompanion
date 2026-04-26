# Yahtzee Companion 🎲

A React Native mobile app that uses a YOLOv8 machine learning model (via TensorFlow Lite) to detect dice values through the camera in real time. Players scan their physical dice after each roll, and the app tracks scores across a full 13-turn Yahtzee game.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Expo 55 + React Native 0.83.6 + React 19 |
| Language | TypeScript 6 (strict mode) |
| Styling | NativeWind 4 (Tailwind CSS utility classes on native) |
| ML inference | react-native-fast-tflite + YOLOv8 TFLite model |
| Camera | react-native-vision-camera 4 |
| Frame threading | react-native-worklets-core (off-thread frame processing) |
| Icons | lucide-nativewind |
| Testing | Jest (jest-expo preset) + `@testing-library/react-native` |

## 📐 Architecture

This project is built to achieve real-time dice detection on mobile devices without lagging the user interface. It accomplishes this by completely separating the UI thread from the camera and machine learning processing pipeline.

### The Machine Learning Pipeline
1. **Model:** A custom trained YOLOv8 model (`yolov8-dice.tflite`) placed in the `assets/` directory.
2. **Frame Processor:** The camera captures a raw frame and hands it to a C++ worklet background thread running at ~2 FPS (throttled to ensure zero UI lag).
3. **Resizing:** The raw frame is centre-cropped to a 1:1 square and synchronously resized to 640x640 (model input size).
4. **Inference:** The model executes `runSync` on the C++ thread, dropping frames if it falls behind to ensure zero camera preview lag.
5. **Parsing:** The raw output tensor (`[1, features, 8400]`) is parsed manually, applying probability checks and Non-Maximum Suppression (NMS) to detect distinct physical dice (1 through 6).
6. **Bridge to UI:** Detections are safely bridged back to the React UI using `Worklets.createRunOnJS`, drawing real-time Augmented Reality bounding boxes (`<AROverlay>`).

### Game State
`App.tsx` is the entry point and owns **all** game state. There is no external state management library — all state (dice values, locked states, rolls left, and scores) lives here and is passed down as props.

## 🚀 How to Run

Because this project relies on **custom C++ native code** (Vision Camera, Fast TFLite, Worklets), **it cannot be run inside the standard "Expo Go" app.** You must create a local native build.

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- **Java 17** (Strictly required for Android builds)
- Android Studio / Android SDK (for Android)
- Xcode (for iOS, Mac only)

### Development Commands

```bash
npm start              # Expo dev server
npm run ios            # Build and launch on iOS simulator/device
npm run android        # Build and launch on Android
npm run web            # Web version with mock DiceScanner (no camera)
npm test               # Run Jest test suite
npm run lint           # ESLint check
```

**Android Warning:** Ensure `JAVA_HOME` points to a JDK 17 installation. React Native's Android C++ build tools currently fail on Java 22+.
