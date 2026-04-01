// =====================
// API Layer (backend proxy mode — no user API key needed)
// =====================

import { showToast } from './utils.js';

const API_BASE_IMG = '/api/generate';
const API_BASE_TTS = '/api/tts';

/**
 * Generic POST request to the backend API proxy.
 * @param {string} url
 * @param {object} body
 * @returns {Promise<object>}
 */
export async function apiCall(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/**
 * Generate an image via the backend proxy.
 * @param {string} prompt
 * @param {number} width
 * @param {number} height
 * @returns {Promise<{ image_url: string, id: string }>}
 */
export async function generateImage(prompt, width, height) {
  return apiCall(API_BASE_IMG, {
    model: 'image-01',
    prompt,
    width,
    height,
  });
}

/**
 * Synthesize text to speech via the backend proxy.
 * @param {string} text
 * @param {string} voiceId
 * @param {number} speed
 * @returns {Promise<{ audio_url: string }>}
 */
export async function synthesize(text, voiceId, speed) {
  return apiCall(API_BASE_TTS, {
    model: 'speech-2.8-hd',
    text,
    voice_setting: {
      voice_id: voiceId,
      speed: Math.min(2.0, Math.max(0.5, parseFloat(speed) || 1.0)),
    },
    output_format: 'url',
  });
}

/**
 * Download a remote URL as a blob and trigger browser download.
 * @param {string} url
 * @param {string} filename
 */
export async function downloadUrl(url, filename) {
  try {
    const r = await fetch(url);
    const b = await r.blob();
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(u);
    showToast('下载成功', 'success');
  } catch {
    showToast('下载失败');
  }
}
