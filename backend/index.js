const express = require('express');
const path = require('path');

// Ensure module resolution works from backend node_modules and monorepo root
module.paths.unshift(path.resolve(__dirname, 'node_modules'));
module.paths.unshift(path.resolve(__dirname, '../node_modules'));

try {
  require('module-alias/register');
} catch (e) {
  // Continue if not required by bundler
}

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env.local'), override: true });

let app;
try {
  app = require('./src/app.cjs');
} catch (e1) {
  try {
    app = require('./src/app.js');
  } catch (e2) {
    try {
      app = require('./src/app');
    } catch (e3) {
      app = require(path.resolve(__dirname, 'src', 'app'));
    }
  }
}

module.exports = app;
