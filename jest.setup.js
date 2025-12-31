/**
 * Jest Setup File
 * Loads environment variables from .env.local for integration tests
 */

const { config } = require('dotenv');
const { resolve } = require('path');

// Load .env.local for local development/testing (quiet mode)
config({ path: resolve(__dirname, '.env.local'), quiet: true });
