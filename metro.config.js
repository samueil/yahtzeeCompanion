const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add .tflite to the list of asset extensions
config.resolver.assetExts.push('tflite');

// Force all three.js imports to use the same file to avoid "Multiple instances" warning
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/three/build/three.cjs'),
      type: 'sourceFile',
    };
  }

  // Chain to the default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
