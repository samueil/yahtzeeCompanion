import { X } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface DiceScannerProps {
  neededCount: number;
  onScanComplete: (diceValues: number[]) => void;
  onClose: () => void;
}

// We only mock the camera, so isCameraReady is always true
const isCameraReady = true;

export const DiceScanner = ({
  neededCount,
  onScanComplete,
  onClose,
}: DiceScannerProps) => {
  const handleSimulatedScan = () => {
    const mockResult = Array.from({ length: neededCount }, () =>
      Math.ceil(Math.random() * 6),
    );
    onScanComplete(mockResult);
  };

  return (
    <View style={styles.scannerContainer}>
      <View style={styles.webCameraMock}>
        <Text style={styles.webCameraText}>
          [ Camera not available on Web ]
        </Text>
        <Text style={styles.webCameraSubText}>Using simulated dice rolls.</Text>
      </View>

      <Pressable onPress={onClose} style={styles.closeButton}>
        <X size={32} color={'white'} />
      </Pressable>

      <View style={styles.captureArea}>
        <Pressable
          onPress={handleSimulatedScan}
          disabled={!isCameraReady}
          style={[
            styles.captureButton,
            isCameraReady
              ? styles.captureButtonActive
              : styles.captureButtonDisabled,
          ]}
        >
          <View
            style={[
              styles.captureInnerButton,
              isCameraReady && styles.captureInnerButtonActive,
            ]}
          />
        </Pressable>
        <Text
          style={[
            styles.captureHint,
            isCameraReady && styles.captureHintActive,
          ]}
        >
          {isCameraReady ? 'TAP TO SIMULATE' : 'Waiting for dice...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 50,
  },
  webCameraMock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  webCameraText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  webCameraSubText: {
    color: '#64748b',
    fontSize: 14,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 32,
  },
  captureArea: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  captureButtonActive: {
    borderColor: '#00FF00',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  captureButtonDisabled: {
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  captureInnerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  captureInnerButtonActive: {
    backgroundColor: 'white',
  },
  captureHint: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 10,
    color: 'white',
    opacity: 0.7,
  },
  captureHintActive: {
    color: '#00FF00',
    opacity: 1,
    fontWeight: 'bold',
  },
});
