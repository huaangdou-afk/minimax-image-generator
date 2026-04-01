const express = require('express');
const axios = require('axios');
const path = require('path');
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

// API Key from environment variable
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
// API: Image Generation
// =====================
app.post('/api/generate', async (req, res) => {
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
// API: Text-to-Speech
// =====================
app.post('/api/tts', async (req, res) => {
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
// Fallback: Serve index.html
// =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
