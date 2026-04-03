// Test setup - runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';

// BASE_URL: localhost by default in test env, override with BASE_URL env var
if (!process.env.BASE_URL) {
  process.env.BASE_URL = 'http://localhost:3000';
}

// Skip live MiniMax API tests (image gen + TTS) by default — too slow for CI
// Set RUN_LIVE_API_TESTS=1 to enable them
process.env.SKIP_LIVE_API = process.env.SKIP_LIVE_API !== '0' ? '1' : '0';

console.log(`Testing against: ${process.env.BASE_URL}, live API: ${process.env.SKIP_LIVE_API === '0' ? 'ENABLED' : 'SKIPPED'}`);
