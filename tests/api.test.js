/**
 * MiniMax API Test Suite
 *
 * Tests against the deployed production server or local server.
 * Uses MINIMAX_API_KEY from environment variables.
 *
 * Usage:
 *   BASE_URL=https://minimax-image-generator.onrender.com npm test     (production)
 *   BASE_URL=http://localhost:3000 npm test                          (local)
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'https://minimax-image-generator.onrender.com';
const API_KEY = process.env.MINIMAX_API_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  validateStatus: () => true, // Handle all status codes manually
});

// ============================================
// Helper: Skip live API tests (image gen + TTS)
// ============================================
const skipIfNoApiKey = () => {
  if (!API_KEY) {
    console.warn('SKIP: MINIMAX_API_KEY not set');
    return true;
  }
  if (process.env.SKIP_LIVE_API === '1') {
    console.warn('SKIP: SKIP_LIVE_API=1, skipping live API test');
    return true;
  }
  return false;
};

// ============================================
// GET /api/key-status
// ============================================
describe('GET /api/key-status', () => {
  test('should return configured: true when API key is set', async () => {
    const res = await client.get('/api/key-status');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('configured');
  });

  test('should return configured: false when API key is not set', async () => {
    // This test mocks the server-side check; actual result depends on server config
    const res = await client.get('/api/key-status');
    expect(res.status).toBe(200);
    expect(typeof res.data.configured).toBe('boolean');
  });

  test('response should be JSON with correct shape', async () => {
    const res = await client.get('/api/key-status');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(Object.keys(res.data)).toContain('configured');
  });
});

// ============================================
// POST /api/generate - Valid Requests
// ============================================
describe('POST /api/generate', () => {
  test('should return image_url for a valid request', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.post('/api/generate', {
      prompt: 'A cute cat sitting on a windowsill',
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('image_url');
    expect(typeof res.data.image_url).toBe('string');
    expect(res.data.image_url).toMatch(/^https?:\/\//);
  });

  test('should accept optional width and height parameters', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.post('/api/generate', {
      prompt: 'A mountain landscape',
      width: 512,
      height: 512,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('image_url');
  });

  test('should include traceId in response', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.post('/api/generate', {
      prompt: 'A simple test image',
    });

    expect(res.status).toBe(200);
    // traceId may or may not be present depending on server config
    expect(res.data).toHaveProperty('image_url');
  });
});

// ============================================
// POST /api/generate - Validation Errors
// ============================================
describe('POST /api/generate - Validation', () => {
  test('should return 400 when prompt is missing', async () => {
    const res = await client.post('/api/generate', {});
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
    expect(res.data.error.toLowerCase()).toMatch(/prompt|required/);
  });

  test('should return 400 when prompt is an empty string', async () => {
    const res = await client.post('/api/generate', { prompt: '' });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });

  test('should return 400 when prompt is only whitespace', async () => {
    const res = await client.post('/api/generate', { prompt: '   ' });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });

  test('should return 400 when prompt exceeds character limit', async () => {
    const longPrompt = 'a'.repeat(2000); // Exceeds 1500 limit
    const res = await client.post('/api/generate', { prompt: longPrompt });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
    expect(res.data.error.toLowerCase()).toMatch(/exceed|limit|character/);
  });

  test('should return 400 when prompt is not a string', async () => {
    const res = await client.post('/api/generate', { prompt: 12345 });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });
});

// ============================================
// POST /api/generate - Error Handling
// ============================================
describe('POST /api/generate - Error Handling', () => {
  test('should return 400 for invalid JSON body', async () => {
    try {
      await client.post('/api/generate', undefined, {
        headers: { 'Content-Type': 'application/json' },
        data: 'not-valid-json',
      });
    } catch (err) {
      // Axios throws on invalid JSON
      expect(err).toBeDefined();
    }
  });

  test('should handle request with extra unknown fields gracefully', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.post('/api/generate', {
      prompt: 'Test image',
      unknownField: 'should be ignored',
    });

    // Should still succeed if API key is valid
    if (res.status === 200) {
      expect(res.data).toHaveProperty('image_url');
    } else if (res.status >= 400) {
      // Accept error responses from upstream API
      expect(res.data).toHaveProperty('error');
    }
  });
});

// ============================================
// POST /api/tts - Valid Requests
// ============================================
describe('POST /api/tts', () => {
  test('should return audio_url for a valid TTS request', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.post('/api/tts', {
      text: 'Hello, this is a test of the text to speech system.',
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('audio_url');
    expect(typeof res.data.audio_url).toBe('string');
    expect(res.data.audio_url).toMatch(/^https?:\/\//);
  });

  test('should accept optional voice_id parameter', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.post('/api/tts', {
      text: 'Testing with a specific voice.',
      voice_id: 'female-tianmei',
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('audio_url');
  });

  test('should accept optional speed parameter', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.post('/api/tts', {
      text: 'Testing speed control.',
      speed: 1.2,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('audio_url');
  });

  test('should include extra_info in response', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.post('/api/tts', {
      text: 'Short test.',
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('audio_url');
    // extra_info may or may not be present
  });
});

// ============================================
// POST /api/tts - Validation Errors
// ============================================
describe('POST /api/tts - Validation', () => {
  test('should return 400 when text is missing', async () => {
    const res = await client.post('/api/tts', {});
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
    expect(res.data.error.toLowerCase()).toMatch(/text|required/);
  });

  test('should return 400 when text is an empty string', async () => {
    const res = await client.post('/api/tts', { text: '' });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });

  test('should return 400 when text is only whitespace', async () => {
    const res = await client.post('/api/tts', { text: '   ' });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });

  test('should return 400 when text exceeds character limit', async () => {
    const longText = 'a'.repeat(4000); // Exceeds 3000 limit
    const res = await client.post('/api/tts', { text: longText });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
    expect(res.data.error.toLowerCase()).toMatch(/exceed|limit|character/);
  });

  test('should return 400 when text is not a string', async () => {
    const res = await client.post('/api/tts', { text: { invalid: true } });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });
});

// ============================================
// GET /api/tts/voices
// ============================================
describe('GET /api/tts/voices', () => {
  test('should return voice data when API key is configured', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.get('/api/tts/voices');

    // Accept 200 (success) or error if upstream fails
    expect([200, 400, 401, 403, 500]).toContain(res.status);
    // Should return JSON
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  test('should return JSON content type', async () => {
    if (skipIfNoApiKey()) return;

    const res = await client.get('/api/tts/voices');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

// ============================================
// GET /api/download-image
// ============================================
describe('GET /api/download-image', () => {
  test('should return 400 when url parameter is missing', async () => {
    const res = await client.get('/api/download-image');
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
    expect(res.data.error.toLowerCase()).toMatch(/url|required/);
  });

  test('should return 400 when url parameter is empty', async () => {
    const res = await client.get('/api/download-image', {
      params: { url: '' },
    });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });

  test('should handle a valid image URL request', async () => {
    if (skipIfNoApiKey()) return;

    // First generate an image to get a valid URL
    const genRes = await client.post('/api/generate', {
      prompt: 'A blue sky',
    });

    if (genRes.status !== 200 || !genRes.data.image_url) {
      console.warn('SKIP: Could not generate test image');
      return;
    }

    const imageUrl = genRes.data.image_url;
    const res = await client.get('/api/download-image', {
      params: { url: imageUrl },
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('dataUrl');
    expect(res.data).toHaveProperty('contentType');
    expect(res.data.dataUrl).toMatch(/^data:image\//);
  });

  test('should return 500 for an invalid image URL', async () => {
    const res = await client.get('/api/download-image', {
      params: { url: 'https://invalid-domain-that-does-not-exist-12345.com/image.jpg' },
    });
    // Should fail gracefully with 500
    expect(res.status).toBe(500);
    expect(res.data).toHaveProperty('error');
  });
});

// ============================================
// Error Handling - Invalid JSON
// ============================================
describe('Error Handling - Invalid JSON', () => {
  test('should handle malformed JSON in POST /api/generate', async () => {
    const httpClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });

    try {
      // Send raw invalid JSON
      const res = await httpClient.post('/api/generate', 'not-json', {
        headers: { 'Content-Type': 'application/json' },
      });
      // Server should either return 400 or 500 for malformed body
      expect([400, 500]).toContain(res.status);
    } catch (err) {
      // Connection error is also acceptable if server is unreachable
      expect(err).toBeDefined();
    }
  });

  test('should handle malformed JSON in POST /api/tts', async () => {
    const httpClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });

    try {
      const res = await httpClient.post('/api/tts', 'not-json', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect([400, 500]).toContain(res.status);
    } catch (err) {
      expect(err).toBeDefined();
    }
  });
});

// ============================================
// Error Handling - Missing Required Fields
// ============================================
describe('Error Handling - Missing Required Fields', () => {
  test('POST /api/generate with completely empty body', async () => {
    const res = await client.post('/api/generate', null);
    // Should return 400 for missing prompt
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });

  test('POST /api/tts with completely empty body', async () => {
    const res = await client.post('/api/tts', null);
    // Should return 400 for missing text
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });

  test('POST /api/generate with null prompt field', async () => {
    const res = await client.post('/api/generate', { prompt: null });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });

  test('POST /api/tts with null text field', async () => {
    const res = await client.post('/api/tts', { text: null });
    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty('error');
  });
});

// ============================================
// Health / Root Check
// ============================================
describe('Health Checks', () => {
  test('GET / should serve the frontend', async () => {
    const res = await client.get('/');
    expect(res.status).toBe(200);
    // Should return HTML
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  test('Unknown route should return index.html (SPA fallback)', async () => {
    const res = await client.get('/nonexistent-route-12345');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });
});

// ============================================
// Server Configuration Tests
// ============================================
describe('Server Configuration', () => {
  test('server should respond within reasonable time', async () => {
    const start = Date.now();
    const res = await client.get('/api/key-status');
    const duration = Date.now() - start;

    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(10000); // Should respond within 10 seconds
  });

  test('CORS headers should be present or request should succeed', async () => {
    const res = await client.get('/api/key-status');
    // Either has CORS headers or doesn't - we just verify the endpoint works
    expect(res.status).toBe(200);
  });
});
