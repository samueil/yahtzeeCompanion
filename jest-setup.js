jest.mock('react-native-reanimated', () => {
  return require('react-native-reanimated/mock');
});

jest.mock('react-native-worklets-core', () => {
  return {
    Worklets: {
      createRunInContextFn: jest.fn(),
      createContext: jest.fn(),
    },
  };
});

jest.mock('@react-three/fiber/native', () => ({
  useFrame: jest.fn(),
}));
