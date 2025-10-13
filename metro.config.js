const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add path mapping support
config.resolver.alias = {
  '@': path.resolve(__dirname, './'),
};

module.exports = config;
