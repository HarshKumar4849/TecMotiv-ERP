require('module-alias/register');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env.local'), override: true });

const app = require('./src/app');

module.exports = app;

