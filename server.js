const express = require('express');
const axios = require('axios');
const path = require('path');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Constants
const API_BASE = 'https://api.minimaxi.com';
const MAX_PROMPT_LENGTH = 1500;
const MAX_TTS_LENGTH = 3000;
const MAX_IMAGE_DIM = 2048;
const MAX_IMAGE_DIM_MIN = 256;

// Middleware
app.use(express.json());
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      'script-src':     ["'self'", "'unsafe-inline'"],
      'script-src-attr': ["'unsafe-inline'"],
      'style-src':      ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src':       ["'self'", 'https://fonts.gstatic.com'],
      'img-src':        ["'self'", 'data:', 'https:', 'blob:'],
      'media-src':      ["'self'", 'https://minimax-algeng-chat-tts.oss-cn-wulanchabu.aliyuncs.com', 'https://hailuo-image-algeng-data.oss-cn-wulanchabu.aliyuncs.com'],
      'connect-src':    ["'self'"],
    },
  },
}));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Image generation rate limit exceeded.' },
});

const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TTS rate limit exceeded.' },
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Download rate limit exceeded.' },
});

app.use(globalLimiter);

// Request traceId middleware
app.use((req, res, next) => {
  req.traceId = genTraceId();
  next();
});

// Static files with cache control for prompts.json
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('prompts.json')) {
      res.set('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// API Key from environment variable — server holds the key, users don't need to input anything
const API_KEY = process.env.MINIMAX_API_KEY;

// =====================
// Shared Helpers
// =====================
function validateApiKey(res, traceId) {
  if (!API_KEY) {
    res.status(500).json({ error: 'Server API key not configured', traceId });
    return false;
  }
  return true;
}

function formatError(error) {
  return error.response?.data?.base_resp?.status_msg
    || error.response?.data?.status_msg
    || error.message;
}

function genTraceId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// =====================
// API: Key Status
// =====================
app.get('/api/key-status', (req, res) => {
  res.json({ configured: !!API_KEY });
});

// =====================
// API: Image Generation (proxy to MiniMax)
// =====================
app.post('/api/generate', generateLimiter, async (req, res) => {
  const { prompt, width, height } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required', traceId: req.traceId });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({
      error: `Prompt exceeds ${MAX_PROMPT_LENGTH} character limit (current: ${prompt.length})`,
      traceId: req.traceId,
    });
  }

  if (!validateApiKey(res, req.traceId)) return;

  // Validate dimensions
  let w = parseInt(width) || 1024;
  let h = parseInt(height) || 1024;
  w = Math.max(MAX_IMAGE_DIM_MIN, Math.min(MAX_IMAGE_DIM, w));
  h = Math.max(MAX_IMAGE_DIM_MIN, Math.min(MAX_IMAGE_DIM, h));

  try {
    const response = await axios.post(
      `${API_BASE}/v1/image_generation`,
      {
        model: 'image-01',
        prompt: prompt.trim(),
        width: w,
        height: h,
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

    const data = response.data;

    if (data.base_resp && data.base_resp.status_code !== 0) {
      return res.status(400).json({
        error: data.base_resp.status_msg || 'Image generation failed',
        traceId: req.traceId,
      });
    }

    const imageUrl = data.data?.image_urls?.[0];
    if (!imageUrl) {
      return res.status(500).json({ error: 'No image URL in response', traceId: req.traceId });
    }

    res.json({ image_url: imageUrl, id: data.id });
  } catch (error) {
    console.error('[%s] Image error:', req.traceId, formatError(error));
    res.status(error.response?.status || 500).json({ error: formatError(error), traceId: req.traceId });
  }
});

// =====================
// API: Text-to-Speech (proxy to MiniMax)
// =====================
app.post('/api/tts', ttsLimiter, async (req, res) => {
  const { text, voice_id, speed, model } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text is required', traceId: req.traceId });
  }

  if (text.length > MAX_TTS_LENGTH) {
    return res.status(400).json({
      error: `Text exceeds ${MAX_TTS_LENGTH} character limit (current: ${text.length})`,
      traceId: req.traceId,
    });
  }

  if (!validateApiKey(res, req.traceId)) return;

  try {
    const response = await axios.post(
      `${API_BASE}/v1/t2a_v2`,
      {
        model: model || 'speech-2.8-hd',
        text: text.trim(),
        voice_setting: {
          voice_id: voice_id || 'male-qn-qingse',
          speed: Math.min(2.0, Math.max(0.5, parseFloat(speed) || 1.0)),
        },
        output_format: 'url',
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const data = response.data;

    if (data.base_resp && data.base_resp.status_code !== 0) {
      return res.status(400).json({
        error: data.base_resp.status_msg || 'TTS generation failed',
        traceId: req.traceId,
      });
    }

    const audioUrl = data.data?.audio;
    if (!audioUrl) {
      return res.status(500).json({ error: 'No audio URL in response', traceId: req.traceId });
    }

    res.json({
      audio_url: audioUrl,
      extra_info: data.extra_info || {},
    });
  } catch (error) {
    console.error('[%s] TTS error:', req.traceId, formatError(error));
    res.status(error.response?.status || 500).json({ error: formatError(error), traceId: req.traceId });
  }
});

// =====================
// API: Download Image (proxy to avoid CORS)
// =====================
app.get('/api/download-image', downloadLimiter, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required', traceId: req.traceId });

  // SSRF protection: validate URL scheme and hostname
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format', traceId: req.traceId });
  }
  const allowedProtocols = ['http:', 'https:'];
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed', traceId: req.traceId });
  }
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '169.254.169.254'];
  const hostname = parsedUrl.hostname;
  const isBlockedHost = blockedHosts.includes(hostname);
  const isPrivateRange = hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
  if (isBlockedHost || isPrivateRange) {
    return res.status(400).json({ error: 'Access to internal/private networks is not allowed', traceId: req.traceId });
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxRedirects: 5,
      headers: { 'Accept': 'image/*' },
    });
    const contentType = response.headers['content-type'] || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'URL does not point to an image', traceId: req.traceId });
    }
    const base64 = Buffer.from(response.data).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    res.json({ dataUrl, contentType });
  } catch (error) {
    console.error('[%s] Download error:', req.traceId || 'unknown', error.message);
    res.status(500).json({ error: 'Download failed', traceId: req.traceId });
  }
});

// =====================
// API: Download TTS Audio (proxy to avoid Aliyun OSS 403)
// =====================
app.get('/api/tts/audio', downloadLimiter, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format', traceId: req.traceId });
  }
  const allowedProtocols = ['http:', 'https:'];
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed', traceId: req.traceId });
  }
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '169.254.169.254'];
  const hostname = parsedUrl.hostname;
  const isBlockedHost = blockedHosts.includes(hostname);
  const isPrivateRange = hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
  if (isBlockedHost || isPrivateRange) {
    return res.status(400).json({ error: 'Access to internal/private networks is not allowed', traceId: req.traceId });
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxRedirects: 5,
      headers: { 'Accept': 'audio/*' },
    });
    const contentType = response.headers['content-type'] || 'audio/mpeg';
    if (!contentType.startsWith('audio/')) {
      return res.status(400).json({ error: 'URL does not point to an audio file', traceId: req.traceId });
    }
    res.json({ dataUrl: `data:${contentType};base64,${Buffer.from(response.data).toString('base64')}`, contentType });
  } catch (error) {
    console.error('[%s] Audio download error:', req.traceId || 'unknown', error.message);
    res.status(500).json({ error: 'Download failed', traceId: req.traceId });
  }
});

// =====================
// API: Get Available Voices
// =====================
app.get('/api/tts/voices', async (req, res) => {
  if (!validateApiKey(res, req.traceId)) return;

  try {
    const response = await axios.get(
      `${API_BASE}/v1/get_voice`,
      {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        timeout: 10000,
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: formatError(error) || 'Failed to get voices',
      traceId: req.traceId,
    });
  }
});

// =====================
// API: Style Analysis (vision model analyzes uploaded image)
// =====================
const analyzeStyleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Style analysis rate limit exceeded.' },
});

app.post('/api/analyze-style', analyzeStyleLimiter, async (req, res) => {
  if (!validateApiKey(res, req.traceId)) return;

  const { imageUrl } = req.body || {};
  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'imageUrl is required', traceId: req.traceId });
  }

  // Reject internal/private URLs to prevent SSRF
  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl.startsWith('data:') ? 'http://localhost' : imageUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid imageUrl', traceId: req.traceId });
  }
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '169.254.169.254'];
  const hostname = parsedUrl.hostname;
  const isPrivateRange =
    hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
  if (blockedHosts.includes(hostname) || isPrivateRange) {
    return res.status(400).json({ error: 'Access to internal/private networks is not allowed', traceId: req.traceId });
  }

  try {
    const response = await axios.post(
      `${API_BASE}/v1/chat/completions`,
      {
        model: 'MiniMax-VL-01',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              {
                type: 'text',
                text: '分析这张图片的风格特点，返回5-8个风格标签（如：写实、扁平插画、水彩、国风、赛博朋克等），用逗号分隔，只需返回标签，不要其他描述。',
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const raw = response.data?.choices?.[0]?.message?.content || '';
    const tags = raw
      .split(/[,，]/)
      .map(t => t.trim())
      .filter(t => t.length > 0 && t.length <= 15)
      .slice(0, 8);

    if (tags.length === 0) {
      return res.json({ styles: ['通用风格'], raw });
    }

    res.json({ styles: tags, raw });
  } catch (error) {
    console.error(`[${req.traceId}] Style analysis error:`, error.message);
    res.status(error.response?.status || 500).json({
      error: formatError(error) || 'Style analysis failed',
      traceId: req.traceId,
    });
  }
});

// =====================
// Global Error Handler
// =====================
// eslint-disable-next-line no-unused-vars -- Express error handler requires 4 args, next is unused
app.use((err, req, res, next) => {
  console.error('[%s] Unhandled error:', req.traceId || 'unknown', err.message);
  if (!res.headersSent && typeof res.status === 'function') {
    res.status(500).json({ error: 'Internal server error', traceId: req.traceId });
  }
});

// =====================
// Fallback: Serve index.html
// =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
