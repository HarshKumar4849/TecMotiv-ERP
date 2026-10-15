const express = require('express');
const path = require('path');
const fs = require('fs');

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

const candidatePaths = [
  './src/app.cjs',
  './src/app.js',
  './src/app',
  path.resolve(__dirname, 'src', 'app.cjs'),
  path.resolve(__dirname, 'src', 'app.js'),
  path.resolve(__dirname, 'src', 'app'),
  path.resolve(__dirname, '../src', 'app.cjs'),
  path.resolve(__dirname, '../src', 'app.js'),
  path.resolve(__dirname, '../src', 'app'),
  path.resolve(process.cwd(), 'backend', 'src', 'app'),
  path.resolve(process.cwd(), 'src', 'app'),
  '/var/task/backend/src/app',
  '/var/task/src/app'
];

let app = null;
let lastError = null;

for (const p of candidatePaths) {
  try {
    app = require(p);
    if (app) break;
  } catch (err) {
    lastError = err;
  }
}

if (!app) {
  console.error('Failed to locate app module. Directory debug:', {
    __dirname,
    cwd: process.cwd(),
    dirnameFiles: fs.existsSync(__dirname) ? fs.readdirSync(__dirname) : null,
    cwdFiles: fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()) : null,
    varTask: fs.existsSync('/var/task') ? fs.readdirSync('/var/task') : null,
  });
  throw lastError || new Error('App module could not be loaded from any known path');
}

module.exports = app;
