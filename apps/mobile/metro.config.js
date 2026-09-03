const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Specify resolution search paths (prioritize mobile app local node_modules)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Block root React & native singleton packages so Metro never loads duplicate native views
config.resolver.blockList = [
  new RegExp(`^${path.resolve(workspaceRoot, 'node_modules/react')}(/.*)?$`),
  new RegExp(`^${path.resolve(workspaceRoot, 'node_modules/react-native-safe-area-context')}(/.*)?$`),
  new RegExp(`^${path.resolve(workspaceRoot, 'node_modules/react-native-screens')}(/.*)?$`),
];

// 3. Strict resolveRequest interceptor to force singletons for ALL monorepo dependencies
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/react/index.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react/jsx-runtime' || moduleName === 'react/jsx-runtime.js') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/react/jsx-runtime.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react/jsx-dev-runtime' || moduleName === 'react/jsx-dev-runtime.js') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react-native-safe-area-context') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/react-native-safe-area-context/lib/commonjs/index.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react-native-screens') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/react-native-screens/lib/commonjs/index.js'),
      type: 'sourceFile',
    };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
