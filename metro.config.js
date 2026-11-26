const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Reduce la cantidad de procesos de compilación simultáneos.
config.maxWorkers = 2;

module.exports = config;