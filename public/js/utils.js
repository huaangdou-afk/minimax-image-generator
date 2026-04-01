// =====================
// Utility Functions
// =====================

/**
 * Show a toast notification.
 * @param {string} msg
 * @param {'success'|'error'} type
 */
export function showToast(msg, type = 'error') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type === 'success' ? ' success' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} s
 * @returns {string}
 */
export function escapeHtml(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parse a size ratio string (e.g. "16:9") and return pixel dimensions.
 * @param {string} ratio - Size ratio string like "16:9"
 * @returns {{ width: number, height: number }}
 */
export function parseSize(ratio) {
  const [w, h] = ratio.split(':').map(Number);
  const max = 1024;
  return { width: max, height: Math.round(max * h / w) };
}
