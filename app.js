// Lumen Studio: one image, two text blocks, every social media format.
// All layout is in each format's own pixel space; previews are the same drawing scaled down.

const FORMATS = [
  { id: "post",   name: "Instagram post",  w: 1080, h: 1350 },
  { id: "square", name: "Square",          w: 1080, h: 1080 },
  { id: "story",  name: "Story / Reel",    w: 1080, h: 1920, safeTop: 250, safeBottom: 330 },
  { id: "event",  name: "Facebook event",  w: 1920, h: 1005 },
  { id: "link",   name: "Link preview",    w: 1200, h: 630 },
  { id: "wide",   name: "Widescreen 16:9", w: 1920, h: 1080 },
];

// Measured from the Lumen Project Instagram posts, in px at 1080 on the short side.
const TYPE = { size: 56, lineHeight: 1.04, tracking: 0.03, marginX: 50, marginY: 88 };
const EMPTY_BG = "#111111";
const MAX_SOURCE = 5000;   // longest side kept for export
const MAX_PREVIEW = 1600;  // longest side used for the live previews
const STORE_KEY = "lumen-studio-v1";

const DEFAULTS = {
  top: "LUMEN\nPROJECT\n//",
  bottom: "",
  color: "#f2c12e",
  weight: "600",
  size: 100,
  margin: 100,
  upper: true,
  bw: false,
  brightness: 100,
  contrast: 100,
  fileType: "jpeg",
  enabled: { post: true, square: true, story: true, event: false, link: false, wide: false },
};

const $ = (id) => document.getElementById(id);
const state = load();
const views = {};          // per format: { fx, fy, zoom } — image point at frame centre, zoom ≥ 1
const cards = {};          // per format: { el, frame, canvas, zoom }
let image = null;          // { full, small, w, h, name }
let processed = { key: "", small: null };

FORMATS.forEach((f) => (views[f.id] = { fx: 0.5, fy: 0.5, zoom: 1 }));

// ---------------------------------------------------------------- state

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return { ...DEFAULTS, ...saved, enabled: { ...DEFAULTS.enabled, ...(saved.enabled || {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
}

// ---------------------------------------------------------------- image

async function loadImage(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    $("dropText").textContent = "Couldn't read that image (HEIC? Try a JPG or PNG)";
    return;
  }
  const full = scaledCopy(img, MAX_SOURCE);
  image = { full, small: scaledCopy(full, MAX_PREVIEW), w: full.width, h: full.height, name: file.name };
  processed = { key: "", small: null };
  FORMATS.forEach((f) => (views[f.id] = { fx: 0.5, fy: 0.5, zoom: 1 }));
  Object.values(cards).forEach((c) => (c.zoom.value = 100));

  $("thumb").src = url;
  $("thumb").hidden = false;
  $("drop").classList.add("has-image");
  document.body.classList.add("has-image");
  $("dropText").textContent = "Replace image";
  $("clearImage").hidden = false;
  render();
}

function clearImage() {
  image = null;
  processed = { key: "", small: null };
  $("thumb").hidden = true;
  $("thumb").removeAttribute("src");
  $("drop").classList.remove("has-image");
  document.body.classList.remove("has-image");
  $("dropText").textContent = "Drop an image, click to choose, or paste";
  $("clearImage").hidden = true;
  $("file").value = "";
  render();
}

function scaledCopy(src, max) {
  const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
  const k = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement("canvas");
  c.width = Math.round(sw * k);
  c.height = Math.round(sh * k);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

// Black & white, brightness and contrast, done on pixels so every browser exports the same thing.
function filterKey() {
  return `${state.bw}|${state.brightness}|${state.contrast}`;
}

function isNeutral() {
  return !state.bw && +state.brightness === 100 && +state.contrast === 100;
}

function applyFilters(src) {
  if (isNeutral()) return src;
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  const b = state.brightness / 100, k = state.contrast / 100;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) lut[i] = (i * b - 128) * k + 128;
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i], g = px[i + 1], bl = px[i + 2];
    if (state.bw) r = g = bl = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    px[i] = lut[r | 0];
    px[i + 1] = lut[g | 0];
    px[i + 2] = lut[bl | 0];
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function previewSource() {
  const key = filterKey();
  if (processed.key !== key) processed = { key, small: applyFilters(image.small) };
  return processed.small;
}

// ---------------------------------------------------------------- layout + drawing

function coverScale(fmt) {
  return Math.max(fmt.w / image.w, fmt.h / image.h);
}

// Keep the image covering the frame; returns its placement in format pixels.
function place(fmt, view) {
  const s = coverScale(fmt) * view.zoom;
  const dw = image.w * s, dh = image.h * s;
  const x = clamp(fmt.w / 2 - view.fx * dw, fmt.w - dw, 0);
  const y = clamp(fmt.h / 2 - view.fy * dh, fmt.h - dh, 0);
  view.fx = (fmt.w / 2 - x) / dw;
  view.fy = (fmt.h / 2 - y) / dh;
  return { x, y, dw, dh };
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function lines(text) {
  const t = text.replace(/\s+$/, "");
  if (!t) return [];
  return (state.upper ? t.toUpperCase() : t).split("\n");
}

function fontSpec(px) {
  return `${state.weight} ${px}px Barlow, "Helvetica Neue", Arial, sans-serif`;
}

function draw(ctx, fmt, source) {
  ctx.fillStyle = EMPTY_BG;
  ctx.fillRect(0, 0, fmt.w, fmt.h);

  if (image) {
    const p = place(fmt, views[fmt.id]);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, p.x, p.y, p.dw, p.dh);
  }

  const u = Math.min(fmt.w, fmt.h) / 1080;
  const m = state.margin / 100;
  const fs = TYPE.size * u * (state.size / 100);
  const lh = fs * TYPE.lineHeight;
  const mx = TYPE.marginX * u * m;
  const top = Math.max(TYPE.marginY * u * m, fmt.safeTop || 0);
  const bottom = Math.max(TYPE.marginY * u * m, fmt.safeBottom || 0);

  ctx.font = fontSpec(fs);
  ctx.fillStyle = state.color;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const cap = ctx.measureText("H").actualBoundingBoxAscent || fs * 0.7;
  const track = fs * TYPE.tracking;

  lines(state.top).forEach((line, i) => drawLine(ctx, line, mx, top + cap + i * lh, track));
  const low = lines(state.bottom);
  low.forEach((line, i) => drawLine(ctx, line, mx, fmt.h - bottom - (low.length - 1 - i) * lh, track));
}

function drawLine(ctx, text, x, y, track) {
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = `${track}px`;
    ctx.fillText(text, x, y);
    return;
  }
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + track;
  }
}

// ---------------------------------------------------------------- fonts

let fontReady = Promise.resolve();

function loadFont() {
  const text = lines(state.top).join("") + lines(state.bottom).join("") + "H";
  fontReady = document.fonts.load(fontSpec(56), text).catch(() => {});
  return fontReady;
}

// ---------------------------------------------------------------- previews

let queued = false;

function render() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    const source = image ? previewSource() : null;
    FORMATS.forEach((fmt) => {
      const card = cards[fmt.id];
      if (!state.enabled[fmt.id]) return;
      const cssW = card.frame.clientWidth;
      if (!cssW) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(cssW * dpr), h = Math.round((cssW * fmt.h) / fmt.w * dpr);
      if (card.canvas.width !== w || card.canvas.height !== h) {
        card.canvas.width = w;
        card.canvas.height = h;
      }
      const ctx = card.canvas.getContext("2d");
      ctx.setTransform(w / fmt.w, 0, 0, h / fmt.h, 0, 0);
      draw(ctx, fmt, source);
    });
  });
}

function buildCards() {
  const tpl = $("cardTpl");
  const stage = $("stage");
  const toggles = $("formatToggles");
  const ro = new ResizeObserver(render);

  FORMATS.forEach((fmt) => {
    const el = tpl.content.firstElementChild.cloneNode(true);
    const ar = fmt.w / fmt.h;
    el.style.setProperty("--ar", `${fmt.w} / ${fmt.h}`);
    el.style.setProperty("--card-w", `${Math.round(Math.min(560, 430 * ar))}px`);
    el.querySelector(".card__name").textContent = fmt.name;
    el.querySelector(".card__size").textContent = `${fmt.w}×${fmt.h}`;
    const card = {
      el,
      frame: el.querySelector(".card__frame"),
      canvas: el.querySelector(".card__canvas"),
      zoom: el.querySelector(".card__zoom"),
    };
    cards[fmt.id] = card;
    stage.append(el);
    ro.observe(card.frame);

    card.zoom.addEventListener("input", () => {
      views[fmt.id].zoom = card.zoom.value / 100;
      render();
    });
    el.querySelector(".card__reset").addEventListener("click", () => {
      views[fmt.id] = { fx: 0.5, fy: 0.5, zoom: 1 };
      card.zoom.value = 100;
      render();
    });
    el.querySelector(".card__dl").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const blob = await exportBlob(fmt);
        downloadBlob(blob, fileName(fmt));
      } finally {
        btn.disabled = false;
      }
    });
    attachGestures(fmt, card);

    const label = document.createElement("label");
    label.className = "check";
    label.innerHTML = `<input type="checkbox"> ${fmt.name} <span>${fmt.w}×${fmt.h}</span>`;
    const box = label.querySelector("input");
    box.checked = !!state.enabled[fmt.id];
    box.addEventListener("change", () => {
      state.enabled[fmt.id] = box.checked;
      save();
      syncCards();
    });
    toggles.append(label);
  });
  syncCards();
}

function syncCards() {
  FORMATS.forEach((f) => (cards[f.id].el.hidden = !state.enabled[f.id]));
  render();
}

// Drag to move the image, pinch (trackpad or two fingers) to zoom.
function attachGestures(fmt, card) {
  const pointers = new Map();
  let pinch = null;

  const setZoom = (z) => {
    const v = views[fmt.id];
    v.zoom = clamp(z, 1, 4);
    card.zoom.value = Math.round(v.zoom * 100);
    render();
  };

  card.frame.addEventListener("pointerdown", (e) => {
    if (!image) return;
    card.frame.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    card.frame.classList.add("is-dragging");
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: views[fmt.id].zoom };
    }
  });

  card.frame.addEventListener("pointermove", (e) => {
    const prev = pointers.get(e.pointerId);
    if (!prev || !image) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, now);
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      setZoom(pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.dist));
      return;
    }
    const k = fmt.w / card.frame.clientWidth;
    const p = place(fmt, views[fmt.id]);
    views[fmt.id].fx -= ((now.x - prev.x) * k) / p.dw;
    views[fmt.id].fy -= ((now.y - prev.y) * k) / p.dh;
    render();
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) card.frame.classList.remove("is-dragging");
  };
  card.frame.addEventListener("pointerup", end);
  card.frame.addEventListener("pointercancel", end);

  card.frame.addEventListener("wheel", (e) => {
    if (!image || !e.ctrlKey) return;   // trackpad pinch arrives as ctrl+wheel; plain scroll stays page scroll
    e.preventDefault();
    setZoom(views[fmt.id].zoom * Math.exp(-e.deltaY * 0.01));
  }, { passive: false });

  card.frame.addEventListener("dblclick", () => {
    views[fmt.id] = { fx: 0.5, fy: 0.5, zoom: 1 };
    card.zoom.value = 100;
    render();
  });
}

// ---------------------------------------------------------------- export

let fullProcessed = { key: "", canvas: null };

async function exportBlob(fmt) {
  await loadFont();
  let source = null;
  if (image) {
    const key = filterKey();
    if (fullProcessed.key !== key || fullProcessed.image !== image) {
      fullProcessed = { key, image, canvas: applyFilters(image.full) };
    }
    source = fullProcessed.canvas;
  }
  const c = document.createElement("canvas");
  c.width = fmt.w;
  c.height = fmt.h;
  draw(c.getContext("2d"), fmt, source);
  const type = state.fileType === "png" ? "image/png" : "image/jpeg";
  return new Promise((resolve) => c.toBlob(resolve, type, 0.92));
}

function slug(text) {
  return text
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function fileName(fmt) {
  const name = slug(state.bottom) || slug(state.top) || "lumen";
  const ext = state.fileType === "png" ? "png" : "jpg";
  return `${name}-${fmt.id}-${fmt.w}x${fmt.h}.${ext}`;
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function exportAll() {
  const btn = $("exportAll");
  const chosen = FORMATS.filter((f) => state.enabled[f.id]);
  if (!chosen.length) return;
  btn.disabled = true;
  btn.textContent = "Exporting…";
  try {
    if (window.JSZip && chosen.length > 1) {
      const zip = new JSZip();
      for (const fmt of chosen) zip.file(fileName(fmt), await exportBlob(fmt));
      const name = slug(state.bottom) || slug(state.top) || "lumen";
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${name}-social.zip`);
    } else {
      for (const fmt of chosen) downloadBlob(await exportBlob(fmt), fileName(fmt));
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Download all";
  }
}

// ---------------------------------------------------------------- controls

function bindControls() {
  const text = (id, key) => {
    const el = $(id);
    el.value = state[key];
    el.addEventListener("input", () => {
      state[key] = el.value;
      save();
      loadFont().then(render);
      render();
    });
  };
  text("topText", "top");
  text("bottomText", "bottom");

  const range = (id, key) => {
    const el = $(id), out = $(id + "Out");
    el.value = state[key];
    out.textContent = state[key];
    el.addEventListener("input", () => {
      state[key] = +el.value;
      out.textContent = el.value;
      save();
      render();
    });
  };
  range("size", "size");
  range("margin", "margin");
  range("brightness", "brightness");
  range("contrast", "contrast");

  const check = (id, key, after) => {
    const el = $(id);
    el.checked = state[key];
    el.addEventListener("change", () => {
      state[key] = el.checked;
      save();
      after?.();
      render();
    });
  };
  check("bw", "bw");
  check("upper", "upper", syncCase);

  const select = (id, key, after) => {
    const el = $(id);
    el.value = state[key];
    el.addEventListener("change", () => {
      state[key] = el.value;
      save();
      after?.();
      render();
    });
  };
  select("weight", "weight", () => loadFont().then(render));
  select("fileType", "fileType");

  const setColor = (c) => {
    state.color = c;
    $("color").value = c;
    document.querySelectorAll(".swatch[data-color]").forEach((s) => s.classList.toggle("is-active", s.dataset.color === c));
    save();
    render();
  };
  document.querySelectorAll(".swatch[data-color]").forEach((s) => s.addEventListener("click", () => setColor(s.dataset.color)));
  $("color").addEventListener("input", (e) => setColor(e.target.value));
  setColor(state.color);
  syncCase();

  $("file").addEventListener("change", (e) => loadImage(e.target.files[0]));
  $("clearImage").addEventListener("click", clearImage);
  $("exportAll").addEventListener("click", exportAll);
  $("resetAll").addEventListener("click", () => {
    try { localStorage.removeItem(STORE_KEY); } catch {}
    location.reload();
  });

  // Drop anywhere on the page; paste from the clipboard.
  const drop = $("drop");
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("is-over");
  });
  window.addEventListener("dragleave", (e) => {
    if (!e.relatedTarget) drop.classList.remove("is-over");
  });
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("is-over");
    loadImage([...e.dataTransfer.files].find((f) => f.type.startsWith("image/")));
  });
  window.addEventListener("paste", (e) => {
    const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
    if (file) loadImage(file);
  });
}

function syncCase() {
  ["topText", "bottomText"].forEach((id) => $(id).classList.toggle("is-mixed", !state.upper));
}

bindControls();
buildCards();
loadFont().then(render);
