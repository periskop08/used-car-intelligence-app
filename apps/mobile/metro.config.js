const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Specify resolution search paths
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Block root React 18 so Metro never uses it
config.resolver.blockList = [
  new RegExp(`^${path.resolve(workspaceRoot, 'node_modules/react')}(/.*)?$`),
];

// 3. Strict resolveRequest interceptor to force React 19.1.0 singleton
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

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
