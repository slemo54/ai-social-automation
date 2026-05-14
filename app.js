const W = 1080;
const H = 1350;

const presets = {
  level1: { label: 'Level 1', bg: '#0f8f8f', bg2: '#126f7d', accent: '#f3d98a', dark: '#083b44', title: 'WSET LEVEL 1' },
  level2: { label: 'Level 2', bg: '#1f7db6', bg2: '#145d94', accent: '#f9d66b', dark: '#0b355a', title: 'WSET LEVEL 2' },
  level3: { label: 'Level 3', bg: '#762133', bg2: '#32121c', accent: '#e7c67a', dark: '#241016', title: 'WSET LEVEL 3' }
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
let imageControl = { zoom: 1, x: 0, y: 0 };
let drawVersion = 0;

function loadState() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem('iwaForm') || '{}') };
  } catch {
    return { ...defaults };
  }
}

function saveState() {
  localStorage.setItem('iwaForm', JSON.stringify(state));
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
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function cover(ctx, img, x, y, w, h, zoom = 1, ox = 0, oy = 0) {
  const scale = Math.max(w / img.width, h / img.height) * Number(zoom || 1);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2 + Number(ox || 0), y + (h - dh) / 2 + Number(oy || 0), dw, dh);
}

function wrapped(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '').split(' ');
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
  ctx.fillStyle = 'rgba(255,255,255,.94)';
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = preset.accent;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.fillStyle = preset.dark;
  ctx.textAlign = 'center';
  ctx.font = '800 38px Arial, Helvetica, sans-serif';
  ctx.fillText('IWA', x + size / 2, y + size / 2 + 12);
  ctx.font = '700 12px Arial, Helvetica, sans-serif';
  ctx.fillText('ITALIAN WINE ACADEMY', x + size / 2, y + size - 28);
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

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, preset.bg);
  bg.addColorStop(1, preset.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = .13;
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 82; i++) {
    const x = (i * 137) % W;
    const y = (i * 89) % 850;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = .18;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  for (let i = -220; i < W; i += 190) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 420, 820);
    ctx.stroke();
  }
  ctx.restore();

  if (logo) {
    ctx.save();
    roundRect(ctx, 64, 54, 170, 170, 85);
    ctx.fillStyle = 'rgba(255,255,255,.94)';
    ctx.fill();
    ctx.clip();
    cover(ctx, logo, 74, 64, 150, 150, 1, 0, 0);
    ctx.restore();
  } else {
    drawLogoPlaceholder(ctx, 64, 54, 150, preset);
  }

  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.font = '700 28px Arial, Helvetica, sans-serif';
  ctx.fillText('COURSE ANNOUNCEMENT', 1010, 94);
  ctx.fillStyle = preset.accent;
  ctx.font = '800 44px Arial, Helvetica, sans-serif';
  ctx.fillText(preset.label.toUpperCase(), 1010, 146);
  ctx.restore();

  ctx.save();
  roundRect(ctx, 70, 265, 940, 100, 30);
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.shadowColor = 'rgba(0,0,0,.22)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 14;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = preset.dark;
  ctx.textAlign = 'center';
  ctx.font = '900 62px Arial Black, Impact, Arial, sans-serif';
  ctx.fillText(String(state.courseTitle || preset.title).toUpperCase(), 540, 334);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '900 78px Arial Black, Impact, Arial, sans-serif';
  ctx.fillText(String(state.headline || 'ITALIAN WINE ACADEMY').toUpperCase(), 540, 465);
  ctx.fillStyle = 'rgba(255,255,255,.84)';
  ctx.font = '700 33px Arial, Helvetica, sans-serif';
  ctx.fillText(String(state.cta || 'WINE EDUCATION COURSE').toUpperCase(), 540, 520);
  ctx.restore();

  ctx.save();
  roundRect(ctx, 88, 588, 904, 252, 36);
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.shadowColor = 'rgba(0,0,0,.2)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 12;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const detail = [
    ['LANGUAGE', state.language], ['DATE', state.date], ['LOCATION', state.location], ['EDUCATOR', state.educator]
  ];
  const xs = [140, 575];
  const ys = [652, 735];
  detail.forEach(([label, value], i) => {
    const x = xs[i % 2];
    const y = ys[Math.floor(i / 2)];
    ctx.fillStyle = preset.bg;
    ctx.font = '800 18px Arial, Helvetica, sans-serif';
    ctx.fillText(label, x, y);
    ctx.fillStyle = preset.dark;
    ctx.font = '800 31px Arial, Helvetica, sans-serif';
    wrapped(ctx, value, x, y + 42, 370, 34, 2);
  });
  ctx.restore();

  ctx.save();
  roundRect(ctx, 88, 875, 904, 78, 24);
  ctx.fillStyle = preset.accent;
  ctx.fill();
  ctx.fillStyle = preset.dark;
  ctx.textAlign = 'center';
  ctx.font = '900 30px Arial, Helvetica, sans-serif';
  wrapped(ctx, state.examNote, 540, 924, 820, 34, 1);
  ctx.restore();

  const imgY = 985;
  const imgH = 365;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, imgY, W, imgH);
  ctx.clip();
  if (bottom) {
    cover(ctx, bottom, 0, imgY, W, imgH, imageControl.zoom, imageControl.x, imageControl.y);
  } else {
    const fallback = ctx.createLinearGradient(0, imgY, W, H);
    fallback.addColorStop(0, preset.dark);
    fallback.addColorStop(1, preset.bg);
    ctx.fillStyle = fallback;
    ctx.fillRect(0, imgY, W, imgH);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.textAlign = 'center';
    ctx.font = '800 40px Arial, Helvetica, sans-serif';
    ctx.fillText('UPLOAD GPT IMAGE HERE', 540, imgY + 178);
    ctx.font = '500 24px Arial, Helvetica, sans-serif';
    ctx.fillText('Use the bottom image generated separately with GPT Image', 540, imgY + 220);
  }
  const overlay = ctx.createLinearGradient(0, imgY, 0, H);
  overlay.addColorStop(0, 'rgba(0,0,0,.06)');
  overlay.addColorStop(1, 'rgba(0,0,0,.42)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, imgY, W, imgH);
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.font = '700 22px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('italianwineacademy.org', 1015, 1310);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  roundRect(ctx, 70, 246, 940, 7, 4);
  ctx.fill();
  ctx.fillStyle = preset.accent;
  roundRect(ctx, 70, 246, 260, 7, 4);
  ctx.fill();
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
  return `Create only the bottom photographic image for an Italian Wine Academy ${preset.label} WSET course social post. Theme: ${state.bottomImageTheme}. Format: wide horizontal crop for the lower section of a 1080x1350 Instagram post. Style: realistic premium wine education photography, clean desk, course materials, wine glasses or bottles if relevant, elegant academy look. Avoid any text, logo, watermark, distorted hands, random labels, or fake certification marks.`;
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
els.imgZoom.addEventListener('input', () => { imageControl.zoom = els.imgZoom.value; draw(); });
els.imgX.addEventListener('input', () => { imageControl.x = els.imgX.value; draw(); });
els.imgY.addEventListener('input', () => { imageControl.y = els.imgY.value; draw(); });
els.copyImagePrompt.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.imagePrompt.value);
  els.copyImagePrompt.textContent = 'Copiato';
  setTimeout(() => { els.copyImagePrompt.textContent = 'Copia'; }, 1500);
});
els.downloadBtn.addEventListener('click', downloadPng);
els.downloadTop.addEventListener('click', downloadPng);

els.promptInput.value = examplePrompt;
refreshUI();
