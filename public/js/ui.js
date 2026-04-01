// =====================
// UI Module
// =====================

import { showToast, escapeHtml, parseSize } from './utils.js';
import { generateImage, synthesize, downloadUrl } from './api.js';

// =====================
// State
// =====================
let currentImageUrl = null;
let currentAudioUrl = null;
let imgHistory = JSON.parse(localStorage.getItem('imgGenHistory') || '[]');

// =====================
// Tab Switching
// =====================
function activateTab(tabName) {
  document.querySelectorAll('.nav-item[data-tab]').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tabName)
  );
  document.querySelectorAll('.mobile-nav-item[data-tab]').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tabName)
  );
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'tab-' + tabName)
  );
}

document.querySelectorAll('.nav-item[data-tab], .mobile-nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

// =====================
// Image Generation
// =====================
const imgPrompt        = document.getElementById('imgPrompt');
const imgCharCount     = document.getElementById('imgCharCount');
const presetTags        = document.getElementById('presetTags');
const imgSize          = document.getElementById('imgSize');
const imgSeed          = document.getElementById('imgSeed');
const btnRandomSeed    = document.getElementById('btnRandomSeed');
const btnGenerateImg   = document.getElementById('btnGenerateImg');
const imageDisplay     = document.getElementById('imageDisplay');
const imageActions     = document.getElementById('imageActions');
const btnDownload      = document.getElementById('btnDownload');
const btnCopy          = document.getElementById('btnCopy');
const btnDelete        = document.getElementById('btnDelete');
const imgHistoryList   = document.getElementById('imgHistoryList');
const imgGenTime       = document.getElementById('imgGenTime');
const imgHistoryCount  = document.getElementById('imgHistoryCount');

function renderImage(url, fromHistory) {
  imageDisplay.innerHTML = '';
  const img = document.createElement('img');
  img.src = url;
  img.alt = 'Generated';
  img.onload = () => {
    imageDisplay.classList.add('has-image');
    imageActions.classList.add('visible');
    if (!fromHistory) {
      imgGenTime.textContent = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    }
  };
  imageDisplay.appendChild(img);
  currentImageUrl = url;
  if (!fromHistory) addToHistory(url);
}

function showLoadingImg() {
  imageDisplay.innerHTML =
    '<div class="img-loading"><div class="spinner"></div>' +
    '<div class="img-loading-text">AI 正在生成图片<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></div></div>';
  imageDisplay.classList.remove('has-image');
  imageActions.classList.remove('visible');
}

async function doGenerateImage() {
  const prompt = imgPrompt.value.trim();
  if (!prompt) { showToast('请输入提示词'); imgPrompt.focus(); return; }
  if (prompt.length > 1500) { showToast('提示词不能超过1500字'); return; }

  const size = parseSize(imgSize.value);
  btnGenerateImg.disabled = true;
  btnGenerateImg.textContent = '⏳ 生成中...';
  btnGenerateImg.classList.add('loading');
  showLoadingImg();

  try {
    const data = await generateImage(prompt, size.width, size.height);
    const url = data.image_url;
    if (!url) throw new Error('No image URL returned');
    renderImage(url);
  } catch (err) {
    imageDisplay.innerHTML =
      '<div style="text-align:center;color:var(--error);padding:20px;">' +
      '<div style="font-size:36px;margin-bottom:8px;">⚠</div>' +
      '<div style="font-size:13px;">' + escapeHtml(err.message) + '</div></div>';
    imageDisplay.classList.remove('has-image');
  } finally {
    btnGenerateImg.disabled = false;
    btnGenerateImg.textContent = '✦ 开始生成图片';
    btnGenerateImg.classList.remove('loading');
  }
}

imgPrompt.addEventListener('input', () => {
  imgCharCount.textContent = imgPrompt.value.length + ' / 2000';
});

presetTags.addEventListener('click', e => {
  const t = e.target.closest('.preset-tag');
  if (!t) return;
  document.querySelectorAll('.preset-tag').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  imgPrompt.value = t.dataset.prompt;
  imgCharCount.textContent = imgPrompt.value.length + ' / 2000';
  imgPrompt.focus();
});

btnRandomSeed.addEventListener('click', () => {
  imgSeed.value = Math.floor(Math.random() * 999999999);
});

btnGenerateImg.addEventListener('click', doGenerateImage);
imgPrompt.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') doGenerateImage();
});

btnDownload.addEventListener('click', async () => {
  if (!currentImageUrl) return;
  try {
    const res = await fetch('/api/download-image?url=' + encodeURIComponent(currentImageUrl));
    if (!res.ok) throw new Error('下载失败');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'ai-image-' + Date.now() + '.jpg';
    a.click();
    URL.revokeObjectURL(objectUrl);
    showToast('下载成功', 'success');
  } catch {
    showToast('下载失败，请稍后重试');
  }
});

btnCopy.addEventListener('click', () => {
  if (!currentImageUrl) return;
  navigator.clipboard.writeText(currentImageUrl)
    .then(() => showToast('图片地址已复制', 'success'))
    .catch(() => showToast('复制失败'));
});

btnDelete.addEventListener('click', () => {
  imageDisplay.innerHTML =
    '<div class="placeholder-icon">🎨</div>' +
    '<div class="placeholder-text">输入提示词开始生成<br/><small>生成的图片将显示在这里</small></div>';
  imageDisplay.classList.remove('has-image');
  imageActions.classList.remove('visible');
  currentImageUrl = null;
  imgGenTime.textContent = '';
});

function addToHistory(url) {
  imgHistory.unshift(url);
  if (imgHistory.length > 30) imgHistory = imgHistory.slice(0, 30);
  localStorage.setItem('imgGenHistory', JSON.stringify(imgHistory));
  renderImgHistory();
}

function renderImgHistory() {
  imgHistoryCount.textContent = imgHistory.length > 0 ? imgHistory.length + ' 张' : '';
  if (imgHistory.length === 0) {
    imgHistoryList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
    return;
  }
  imgHistoryList.innerHTML = imgHistory.map(u =>
    '<div class="history-item" data-url="' + escapeHtml(u) + '">' +
    '<img src="' + escapeHtml(u) + '" alt="h" loading="lazy"/>' +
    '<div class="history-overlay">👁</div></div>'
  ).join('');
}

imgHistoryList.addEventListener('click', e => {
  const it = e.target.closest('.history-item');
  if (!it) return;
  renderImage(it.dataset.url, true);
});

renderImgHistory();

// =====================
// TTS
// =====================
const ttsText          = document.getElementById('ttsText');
const ttsCharCount     = document.getElementById('ttsCharCount');
const voiceGrid        = document.getElementById('voiceGrid');
const ttsSpeed         = document.getElementById('ttsSpeed');
const ttsSpeedVal      = document.getElementById('ttsSpeedVal');
const btnSynthesize    = document.getElementById('btnSynthesize');
const ttsPlayer        = document.getElementById('ttsPlayer');
const ttsPlaceholder   = document.getElementById('ttsPlaceholder');
const ttsAudio         = document.getElementById('ttsAudio');
const ttsTextPreview   = document.getElementById('ttsTextPreview');
const btnDownloadAudio = document.getElementById('btnDownloadAudio');
const btnCopyAudioUrl  = document.getElementById('btnCopyAudioUrl');
const btnClearAudio    = document.getElementById('btnClearAudio');
const ttsWaveform      = document.getElementById('ttsWaveform');

let selectedVoice = 'male-qn-qingse';

// Build waveform bars
(function buildWaveform() {
  for (let i = 0; i < 48; i++) {
    const bar = document.createElement('div');
    bar.className = 'wave-bar';
    bar.style.height = Math.random() * 20 + 6 + 'px';
    ttsWaveform.appendChild(bar);
  }
})();

ttsText.addEventListener('input', () => {
  ttsCharCount.textContent = ttsText.value.length + ' / 5000';
});

ttsSpeed.addEventListener('input', () => {
  ttsSpeedVal.textContent = parseFloat(ttsSpeed.value).toFixed(1) + 'x';
});

voiceGrid.addEventListener('click', e => {
  const b = e.target.closest('.voice-btn');
  if (!b) return;
  document.querySelectorAll('.voice-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  selectedVoice = b.dataset.voice;
});

async function doSynthesize() {
  const text = ttsText.value.trim();
  if (!text) { showToast('请输入文本内容'); ttsText.focus(); return; }
  if (text.length > 3000) { showToast('文本不能超过3000字'); return; }

  btnSynthesize.disabled = true;
  btnSynthesize.textContent = '⏳ 合成中...';

  try {
    const data = await synthesize(text, selectedVoice, ttsSpeed.value);
    const url = data.audio_url;
    if (!url) throw new Error('No audio URL returned');
    currentAudioUrl = url;
    ttsTextPreview.textContent = text;
    ttsAudio.src = url;
    ttsPlaceholder.style.display = 'none';
    ttsPlayer.style.display = 'flex';
    showToast('语音合成成功', 'success');
  } catch (err) {
    showToast(err.message || '合成失败');
  } finally {
    btnSynthesize.disabled = false;
    btnSynthesize.textContent = '✦ 开始合成语音';
  }
}

btnSynthesize.addEventListener('click', doSynthesize);
ttsText.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') doSynthesize();
});

btnDownloadAudio.addEventListener('click', () => {
  if (!currentAudioUrl) return;
  downloadUrl(currentAudioUrl, 'ai-voice-' + Date.now() + '.mp3');
});

btnCopyAudioUrl.addEventListener('click', () => {
  if (!currentAudioUrl) return;
  navigator.clipboard.writeText(currentAudioUrl)
    .then(() => showToast('链接已复制', 'success'))
    .catch(() => showToast('复制失败'));
});

btnClearAudio.addEventListener('click', () => {
  ttsAudio.src = '';
  currentAudioUrl = null;
  ttsPlayer.style.display = 'none';
  ttsPlaceholder.style.display = 'flex';
});

// =====================
// Gallery
// =====================
const gallerySearch     = document.getElementById('gallerySearch');
const galleryCatFilters = document.getElementById('galleryCatFilters');
const galleryGrid       = document.getElementById('galleryGrid');
const galleryCount      = document.getElementById('galleryCount');
const galleryModal      = document.getElementById('galleryModal');
const modalTitle        = document.getElementById('modalTitle');
const modalMeta         = document.getElementById('modalMeta');
const modalPrompt       = document.getElementById('modalPrompt');
const modalClose        = document.getElementById('modalClose');
const modalUseCn        = document.getElementById('modalUseCn');
const modalUseEn        = document.getElementById('modalUseEn');

const catLabels = {
  portrait:'📸肖像', fashion:'👗时尚', product:'📦产品', '3d':'🎨3D渲染',
  fantasy:'🐉奇幻', anime:'🎭动漫', landscape:'🏔️风景', logo:'🏷️Logo',
  cyberpunk:'🌃赛博朋克', vintage:'📻复古', painting:'🖼️绘画',
  steampunk:'⚙️蒸汽朋克', minimalist:'⬜极简', food:'🍜美食',
  character:'👤人物', comics:'📚漫画', chinese:'🇨🇳中式', other:'📎其他',
};
const catColors = {
  portrait:'#ec4899', fashion:'#f43f5e', product:'#8b5cf6', '3d':'#06b6d4',
  fantasy:'#f59e0b', anime:'#ec4899', landscape:'#22c55e', logo:'#3b82f6',
  cyberpunk:'#8b5cf6', vintage:'#78716c', painting:'#e879f9', steampunk:'#d97706',
  minimalist:'#94a3b8', food:'#f97316', character:'#f43f5e', comics:'#6366f1',
  chinese:'#ef4444', other:'#64748b',
};

let allPrompts = [];
let activeCategory = 'all';
let searchQuery = '';
let currentModalPrompt = '';
let currentPromptId = null;

async function loadPrompts() {
  try {
    const r = await fetch('./prompts.json');
    const d = await r.json();
    allPrompts = d.prompts || [];
    renderCategoryFilters(d.categories || []);
    renderGallery();
  } catch {
    galleryGrid.innerHTML = '<div class="gallery-loading">加载失败，请刷新重试</div>';
  }
}

function renderCategoryFilters(cats) {
  const all = ['all', ...cats];
  galleryCatFilters.innerHTML = all.map(c =>
    '<button class="gallery-cat-btn' + (c === 'all' ? ' active' : '') + '" data-cat="' + escapeHtml(c) + '">' +
    (c === 'all' ? '🌐全部' : escapeHtml(catLabels[c] || c)) + '</button>'
  ).join('');
  galleryCatFilters.querySelectorAll('.gallery-cat-btn').forEach(b => {
    b.addEventListener('click', () => {
      activeCategory = b.dataset.cat;
      galleryCatFilters.querySelectorAll('.gallery-cat-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderGallery();
    });
  });
}

function filterPrompts() {
  return allPrompts.filter(p => {
    const mc = activeCategory === 'all' || p.categories.includes(activeCategory);
    const q = searchQuery.toLowerCase();
    const ms = !q || p.title.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q);
    return mc && ms;
  });
}

function renderGallery() {
  const f = filterPrompts();
  galleryCount.textContent = '共 ' + f.length + ' / ' + allPrompts.length + ' 个提示词';
  if (f.length === 0) {
    galleryGrid.innerHTML = '<div class="gallery-loading">没有找到匹配的提示词</div>';
    return;
  }
  galleryGrid.innerHTML = f.map(p => {
    const cats = p.categories.slice(0, 3).map(c =>
      '<span class="gallery-cat-tag" style="border-color:' + (catColors[c] || '#8b5cf6') + '40;' +
      'background:' + (catColors[c] || '#8b5cf6') + '15;color:' + (catColors[c] || '#8b5cf6') + '">' +
      escapeHtml(catLabels[c] || c) + '</span>'
    ).join('');
    const preview = escapeHtml(p.prompt.substring(0, 150)) + (p.prompt.length > 150 ? '...' : '');
    const hasCn = p.promptCn && p.promptCn.length > 20;
    const hasEn = p.promptEn && p.promptEn.length > 20;
    return '<div class="gallery-card" data-id="' + p.id + '">' +
      '<div class="gallery-card-header">' +
      '<div class="gallery-card-title">' + escapeHtml(p.title) + '</div>' +
      '<div class="gallery-card-id">#' + p.id + '</div></div>' +
      '<div class="gallery-card-cats">' + cats + '</div>' +
      '<div class="gallery-card-preview">' + preview + '</div>' +
      '<div class="gallery-card-use">' +
      (hasCn ? '<button class="gallery-use-cn">📝中文</button>' : '') +
      (hasEn ? '<button class="gallery-use-en">🌐英文</button>' : '<button class="gallery-use-btn">📝使用</button>') +
      '</div></div>';
  }).join('');
}

galleryGrid.addEventListener('click', e => {
  const card = e.target.closest('.gallery-card');
  if (!card) return;
  const btn = e.target.closest('.gallery-use-cn, .gallery-use-en, .gallery-use-btn');
  const id = parseInt(card.dataset.id);
  const p = allPrompts.find(x => x.id === id);
  if (!p) return;

  const promptToUse = btn?.classList.contains('gallery-use-en')
    ? (p.promptEn || p.prompt)
    : (p.promptCn || p.prompt);

  if (btn?.classList.contains('gallery-use-cn') || btn?.classList.contains('gallery-use-en')) {
    activateTab('image');
    document.getElementById('imgPrompt').value = promptToUse;
    document.getElementById('imgCharCount').textContent = promptToUse.length + ' / 2000';
    showToast('提示词已填入！', 'success');
  } else {
    currentPromptId = p.id;
    currentModalPrompt = promptToUse;
    modalTitle.textContent = p.title;
    modalMeta.textContent = '#' + p.id + (p.source ? ' · 来源: ' + p.source : '');
    modalPrompt.textContent = promptToUse;
    modalUseCn.style.display = (p.promptCn && p.promptCn.length > 20) ? '' : 'none';
    modalUseEn.style.display = (p.promptEn && p.promptEn.length > 20) ? '' : 'none';
    galleryModal.classList.add('open');
  }
});

gallerySearch.addEventListener('input', () => {
  searchQuery = gallerySearch.value;
  renderGallery();
});

modalClose.addEventListener('click', () => galleryModal.classList.remove('open'));
galleryModal.addEventListener('click', e => {
  if (e.target === galleryModal) galleryModal.classList.remove('open');
});

modalUseCn.addEventListener('click', () => {
  const p = allPrompts.find(x => x.id === currentPromptId);
  const t = p ? (p.promptCn || p.prompt) : currentModalPrompt;
  activateTab('image');
  galleryModal.classList.remove('open');
  document.getElementById('imgPrompt').value = t;
  document.getElementById('imgCharCount').textContent = t.length + ' / 2000';
  showToast('中文提示词已填入！', 'success');
});

modalUseEn.addEventListener('click', () => {
  const p = allPrompts.find(x => x.id === currentPromptId);
  const t = p ? (p.promptEn || p.prompt) : currentModalPrompt;
  activateTab('image');
  galleryModal.classList.remove('open');
  document.getElementById('imgPrompt').value = t;
  document.getElementById('imgCharCount').textContent = t.length + ' / 2000';
  showToast('英文提示词已填入！', 'success');
});

// Lazy-load gallery when gallery tab is first clicked
const galleryNavBtn = document.querySelector('.nav-item[data-tab="gallery"]');
let galleryLoaded = false;
galleryNavBtn.addEventListener('click', () => {
  if (!galleryLoaded) { galleryLoaded = true; loadPrompts(); }
});

loadPrompts();
