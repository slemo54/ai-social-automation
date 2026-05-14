const W = 1080;
const H = 1350;
const APP_VERSION = 'iwa-canvas-v2-course-card';

const presets = {
  level1: {
    label: 'Level 1',
    short: 'LEVEL 1',
    bg: '#138f8d',
    bg2: '#0a6c76',
    accent: '#f4d46f',
    dark: '#073b43',
    title: 'WSET LEVEL 1'
  },
  level2: {
    label: 'Level 2',
    short: 'LEVEL 2',
    bg: '#1f7db6',
    bg2: '#155c92',
    accent: '#f4d46f',
    dark: '#07365c',
    title: 'WSET LEVEL 2'
  },
  level3: {
    label: 'Level 3',
    short: 'LEVEL 3',
    bg: '#7f2638',
    bg2: '#38131e',
    accent: '#e8c775',
    dark: '#251017',
    title: 'WSET LEVEL 3'
  }
};

const defaults = {
  templateLevel: 'level2',
  courseTitle: 'WSET LEVEL 2',
  language: 'in English',
  date: '26 - 28 MAY 2026',
  location: 'AIS FVG, UDINE',
  educator: 'Giulia Stocchetti',
  examNote: 'Exam on July 3, 2026',
  bottomImageTheme: 'a realistic close-up of WSET Level 2 course material and wine education sheets with a clean premium look',
  headline: 'ITALIAN WINE ACADEMY',
  cta: 'WINE EDUCATION COURSE'
};

const examplePrompt = `template_level: level2
course_title: WSET LEVEL 2
language: in English
date: 26 - 28 MAY 2026
location: AIS FVG, UDINE
educator: Giulia Stocchetti
exam_note: Exam on July 3, 2026
bottom_image_theme: a realistic close-up of WSET Level 2 course material and wine education sheets with a clean premium look`;

const els = {
  canvas: document.querySelector('#posterCanvas'),
  promptInput: document.querySelector('#promptInput'),
  applyPrompt: document.querySelector('#applyPrompt'),
  resetBtn: document.querySelector('#resetBtn'),
  courseTitle: document.querySelector('#courseTitle'),
  language: document.querySelector('#language'),
  date: document.querySelector('#date'),
  location: document.querySelector('#location'),
  educator: document.querySelector('#educator'),
  examNote: document.querySelector('#examNote'),
  bottomImageTheme: document.querySelector('#bottomImageTheme'),
  logoFile: document.querySelector('#logoFile'),
  bottomFile: document.querySelector('#bottomFile'),
  imgZoom: document.querySelector('#imgZoom'),
  imgX: document.querySelector('#imgX'),
  imgY: document.querySelector('#imgY'),
  imagePrompt: document.querySelector('#imagePrompt'),
  copyImagePrompt: document.querySelector('#copyImagePrompt'),
  downloadBtn: document.querySelector('#downloadBtn'),
  downloadTop: document.querySelector('#downloadTop'),
  levelBtns: [...document.querySelectorAll('.levelBtn')]
};

let state = loadState();
let logoSrc = localStorage.getItem('iwaLogoSrc') || '';
let bottomSrc = localStorage.getItem('iwaBottomSrc') || '';
let imageControl = loadImageControl();
let drawVersion = 0;

function loadState() {
  try {
    const savedVersion = localStorage.getItem('iwaAppVersion');
    if (savedVersion !== APP_VERSION) {
      localStorage.removeItem('iwaForm');
      localStorage.setItem('iwaAppVersion', APP_VERSION);
      return { ...defaults };
    }
    return { ...defaults, ...JSON.parse(localStorage.getItem('iwaForm') || '{}') };
  } catch {
    return { ...defaults };
  }
}

function loadImageControl() {
  try {
    return { zoom: 1, x: 0, y: 0, ...JSON.parse(localStorage.getItem('iwaImageControl') || '{}') };
  } catch {
    return { zoom: 1, x: 0, y: 0 };
  }
}

function saveState() {
  localStorage.setItem('iwaForm', JSON.stringify(state));
  localStorage.setItem('iwaAppVersion', APP_VERSION);
}

function saveImageControl() {
  localStorage.setItem('iwaImageControl', JSON.stringify(imageControl));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function cover(ctx, img, x, y, w, h, zoom = 1, ox = 0, oy = 0) {
  const scale = Math.max(w / img.width, h / img.height) * Number(zoom || 1);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2 + Number(ox || 0), y + (h - dh) / 2 + Number(oy || 0), dw, dh);
}

function fitFont(ctx, text, maxWidth, startSize, minSize, weight = '900', family = 'Arial, Helvetica, sans-serif') {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(String(text || '')).width <= maxWidth) return size;
    size -= 2;
  } while (size >= minSize);
  return minSize;
}

function fillFitted(ctx, text, x, y, maxWidth, startSize, minSize, options = {}) {
  const size = fitFont(ctx, text, maxWidth, startSize, minSize, options.weight || '900', options.family || 'Arial, Helvetica, sans-serif');
  ctx.font = `${options.weight || '900'} ${size}px ${options.family || 'Arial, Helvetica, sans-serif'}`;
  ctx.fillText(String(text || ''), x, y);
}

function wrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '').split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) current = test;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  lines.slice(0, maxLines).forEach((line, i) => {
    let out = line;
    if (i === maxLines - 1 && lines.length > maxLines) out = `${line.replace(/[,.!?;:]?$/, '')}…`;
    ctx.fillText(out, x, y + i * lineHeight);
  });
}

function drawLogoPlaceholder(ctx, x, y, size, preset) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = preset.accent;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = preset.dark;
  ctx.textAlign = 'center';
  ctx.font = '900 38px Arial, Helvetica, sans-serif';
  ctx.fillText('IWA', x + size / 2, y + size / 2 + 12);
  ctx.font = '800 11px Arial, Helvetica, sans-serif';
  ctx.fillText('ITALIAN WINE ACADEMY', x + size / 2, y + size - 24);
  ctx.restore();
}

function drawDetail(ctx, label, value, x, y, w, preset) {
  ctx.save();
  ctx.fillStyle = preset.bg;
  ctx.font = '900 20px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y);
  ctx.fillStyle = preset.dark;
  ctx.font = '900 38px Arial, Helvetica, sans-serif';
  wrapped(ctx, value, x, y + 44, w, 41, 2);
  ctx.restore();
}

async function draw() {
  const myVersion = ++drawVersion;
  const ctx = els.canvas.getContext('2d');
  const preset = presets[state.templateLevel] || presets.level2;
  const [logo, bottom] = await Promise.all([
    logoSrc ? loadImage(logoSrc).catch(() => null) : loadImage('./public/iwa-logo.png').catch(() => null),
    bottomSrc ? loadImage(bottomSrc).catch(() => null) : Promise.resolve(null)
  ]);
  if (myVersion !== drawVersion) return;

  els.canvas.width = W;
  els.canvas.height = H;
  ctx.clearRect(0, 0, W, H);

  const topH = 825;
  const photoY = 825;
  const photoH = H - photoY;

  const bg = ctx.createLinearGradient(0, 0, W, topH);
  bg.addColorStop(0, preset.bg);
  bg.addColorStop(1, preset.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, topH);

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let x = -260; x < W + 240; x += 165) {
    ctx.beginPath();
    ctx.moveTo(x, -30);
    ctx.lineTo(x + 360, topH + 30);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 120; i++) {
    const x = (i * 97) % W;
    const y = (i * 61) % topH;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Header
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(134, 118, 72, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.clip();
    cover(ctx, logo, 68, 52, 132, 132, 1, 0, 0);
    ctx.restore();
  } else {
    drawLogoPlaceholder(ctx, 62, 46, 144, preset);
  }

  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px Arial, Helvetica, sans-serif';
  ctx.fillText('COURSE ANNOUNCEMENT', 1000, 93);
  ctx.fillStyle = preset.accent;
  ctx.font = '900 58px Arial Black, Arial, sans-serif';
  ctx.fillText(preset.short, 1000, 155);
  ctx.restore();

  // Main white course badge
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, .22)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, 78, 240, 924, 130, 28);
  ctx.fillStyle = '#f8fbfb';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = preset.dark;
  ctx.textAlign = 'center';
  fillFitted(ctx, String(state.courseTitle || preset.title).toUpperCase(), 540, 324, 800, 76, 42, { weight: '900', family: 'Arial Black, Arial, sans-serif' });
  ctx.restore();

  // Academy line, now fitted instead of clipped
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  fillFitted(ctx, 'ITALIAN WINE ACADEMY', 540, 452, 950, 74, 44, { weight: '900', family: 'Arial Black, Arial, sans-serif' });
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.font = '900 34px Arial, Helvetica, sans-serif';
  ctx.fillText(String(state.language || '').toUpperCase(), 540, 505);
  ctx.restore();

  // Details card
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.18)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, 88, 568, 904, 205, 28);
  ctx.fillStyle = 'rgba(255,255,255,.94)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  drawDetail(ctx, 'DATE', state.date, 145, 630, 365, preset);
  drawDetail(ctx, 'LOCATION', state.location, 585, 630, 365, preset);
  drawDetail(ctx, 'EDUCATOR', state.educator, 145, 728, 790, preset);
  ctx.restore();

  // Exam ribbon
  ctx.save();
  roundRect(ctx, 88, 793, 904, 66, 18);
  ctx.fillStyle = preset.accent;
  ctx.fill();
  ctx.fillStyle = preset.dark;
  ctx.textAlign = 'center';
  fillFitted(ctx, state.examNote, 540, 836, 830, 31, 22, { weight: '900' });
  ctx.restore();

  // Bottom GPT image section
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, photoY, W, photoH);
  ctx.clip();
  if (bottom) {
    cover(ctx, bottom, 0, photoY, W, photoH, imageControl.zoom, imageControl.x, imageControl.y);
  } else {
    const fallback = ctx.createLinearGradient(0, photoY, W, H);
    fallback.addColorStop(0, '#d8e6e8');
    fallback.addColorStop(1, preset.dark);
    ctx.fillStyle = fallback;
    ctx.fillRect(0, photoY, W, photoH);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.textAlign = 'center';
    ctx.font = '900 42px Arial, Helvetica, sans-serif';
    ctx.fillText('CARICA QUI L’IMMAGINE GPT', 540, photoY + 226);
    ctx.font = '700 24px Arial, Helvetica, sans-serif';
    ctx.fillText('La parte inferiore resta fotografica e sostituibile', 540, photoY + 265);
  }
  const overlay = ctx.createLinearGradient(0, photoY, 0, H);
  overlay.addColorStop(0, 'rgba(0,0,0,.04)');
  overlay.addColorStop(.55, 'rgba(0,0,0,.08)');
  overlay.addColorStop(1, 'rgba(0,0,0,.38)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, photoY, W, photoH);
  ctx.restore();

  // Separation and footer
  ctx.save();
  ctx.fillStyle = preset.accent;
  ctx.fillRect(0, photoY - 8, W, 8);
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.textAlign = 'right';
  ctx.font = '900 22px Arial, Helvetica, sans-serif';
  ctx.fillText('italianwineacademy.org', 1000, 1310);
  ctx.restore();
}

function refreshUI() {
  els.promptInput.value ||= examplePrompt;
  els.courseTitle.value = state.courseTitle;
  els.language.value = state.language;
  els.date.value = state.date;
  els.location.value = state.location;
  els.educator.value = state.educator;
  els.examNote.value = state.examNote;
  els.bottomImageTheme.value = state.bottomImageTheme;
  els.imgZoom.value = imageControl.zoom;
  els.imgX.value = imageControl.x;
  els.imgY.value = imageControl.y;
  els.levelBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.level === state.templateLevel));
  els.imagePrompt.value = makeImagePrompt();
  draw();
}

function makeImagePrompt() {
  const preset = presets[state.templateLevel] || presets.level2;
  return `Create only the bottom photographic image for an Italian Wine Academy ${preset.label} WSET course social post. Theme: ${state.bottomImageTheme}. Format: wide horizontal crop for the bottom 40% of a 1080x1350 Instagram course announcement. Style: realistic premium wine education photography, clean academy desk, course materials, wine glasses or bottles if relevant, elegant lighting. Avoid all text, logos, watermarks, fake labels, badges, distorted hands, or certification marks.`;
}

function normalizeKey(key) {
  return key.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function parsePrompt() {
  const map = {
    template_level: 'templateLevel', level: 'templateLevel', course_title: 'courseTitle', title: 'courseTitle',
    language: 'language', date: 'date', dates: 'date', location: 'location', place: 'location',
    educator: 'educator', teacher: 'educator', exam_note: 'examNote', exam: 'examNote',
    bottom_image_theme: 'bottomImageTheme', image_theme: 'bottomImageTheme', headline: 'headline', cta: 'cta'
  };
  els.promptInput.value.split(/\r?\n/).forEach(line => {
    const match = line.trim().match(/^([^:]+):\s*(.+)$/);
    if (!match) return;
    const key = map[normalizeKey(match[1])];
    if (!key) return;
    let value = match[2].trim().replace(/^["']|["']$/g, '');
    if (key === 'templateLevel') {
      const clean = value.toLowerCase().replace(/\s+/g, '');
      if (['level1', '1', 'wsetlevel1'].includes(clean)) value = 'level1';
      if (['level2', '2', 'wsetlevel2'].includes(clean)) value = 'level2';
      if (['level3', '3', 'wsetlevel3'].includes(clean)) value = 'level3';
      if (!presets[value]) return;
    }
    state[key] = value;
  });
  saveState();
  refreshUI();
}

function bindInput(id, key) {
  els[id].addEventListener('input', () => {
    state[key] = els[id].value;
    saveState();
    refreshUI();
  });
}

function downloadPng() {
  const slug = `${state.courseTitle}-${state.location}-${state.date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'iwa-course-post';
  const a = document.createElement('a');
  a.download = `${slug}-1080x1350.png`;
  a.href = els.canvas.toDataURL('image/png');
  a.click();
}

['courseTitle', 'language', 'date', 'location', 'educator', 'examNote', 'bottomImageTheme'].forEach(key => bindInput(key, key));
els.applyPrompt.addEventListener('click', parsePrompt);
els.resetBtn.addEventListener('click', () => {
  state = { ...defaults };
  bottomSrc = '';
  imageControl = { zoom: 1, x: 0, y: 0 };
  els.promptInput.value = examplePrompt;
  localStorage.removeItem('iwaForm');
  localStorage.removeItem('iwaBottomSrc');
  localStorage.removeItem('iwaImageControl');
  saveState();
  refreshUI();
});
els.levelBtns.forEach(btn => btn.addEventListener('click', () => {
  state.templateLevel = btn.dataset.level;
  state.courseTitle = presets[state.templateLevel].title;
  saveState();
  refreshUI();
}));
els.logoFile.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  logoSrc = await fileToDataUrl(file);
  localStorage.setItem('iwaLogoSrc', logoSrc);
  draw();
});
els.bottomFile.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  bottomSrc = await fileToDataUrl(file);
  localStorage.setItem('iwaBottomSrc', bottomSrc);
  draw();
});
els.imgZoom.addEventListener('input', () => { imageControl.zoom = Number(els.imgZoom.value); saveImageControl(); draw(); });
els.imgX.addEventListener('input', () => { imageControl.x = Number(els.imgX.value); saveImageControl(); draw(); });
els.imgY.addEventListener('input', () => { imageControl.y = Number(els.imgY.value); saveImageControl(); draw(); });
els.copyImagePrompt.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.imagePrompt.value);
  els.copyImagePrompt.textContent = 'Copiato';
  setTimeout(() => { els.copyImagePrompt.textContent = 'Copia'; }, 1500);
});
els.downloadBtn.addEventListener('click', downloadPng);
els.downloadTop.addEventListener('click', downloadPng);

els.promptInput.value = examplePrompt;
refreshUI();
