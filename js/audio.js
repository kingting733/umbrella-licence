// audio.js — 擔遮考牌嘅聲音：背景音樂、音效、雨聲全部用 Web Audio 即時合成（冇外部音檔、冇版權問題）
//  - 背景音樂：audio/{menu,quiz,road}.mp3（ElevenLabs Music 生成、make_loops.py 剪成無縫循環）；未載入 / 載入失敗就用下面嘅合成音樂頂住
//    挑戰模式每加速一級，播放速度 +5%（最多 +25%）
//  - iPhone：設 navigator.audioSession = 'playback'，靜音掣開咗都照出聲；舊 iOS 用一段無聲 <audio> 頂住
const pref = (k, d) => { try { const v = localStorage.getItem('umbrella.' + k); return v == null ? d : v === '1'; } catch (e) { return d; } };
const keep = (k, v) => { try { localStorage.setItem('umbrella.' + k, v ? '1' : '0'); } catch (e) { /* 私隱模式 */ } };
export const prefs = { music: pref('music', true), sfx: pref('sfx', true) };

const MUS_VOL = .34;
let ctx = null, out, sfxBus, musBus, rainBus, noiseBuf, dropBuf, rain = null, rainMode = 'off';
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// ---------- 開聲（要喺用家撳掣嗰下叫）----------
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* 唔支援 */ }
    try { ctx = new AC(); } catch (e) { return null; }
    build(ctx);
    if (!navigator.audioSession && /iP(hone|ad|od)/.test(navigator.userAgent)) silentKeeper();
    document.addEventListener('visibilitychange', () => { if (!ctx) return; (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => {}); });
    setInterval(sched, 25);
    [track, 'road', 'menu', 'quiz'].forEach(n => n && loadTrack(n));
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return ctx;
}
function build(c) {
  ctx = c;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .25;
  out = ctx.createGain(); out.gain.value = .9; out.connect(comp); comp.connect(ctx.destination);
  const bus = v => { const g = ctx.createGain(); g.gain.value = v; g.connect(out); return g; };
  sfxBus = bus(prefs.sfx ? 1 : 0); rainBus = bus(prefs.sfx ? 1 : 0); musBus = bus(prefs.music ? MUS_VOL : 0);
  const sr = ctx.sampleRate;
  noiseBuf = ctx.createBuffer(1, sr * 2, sr); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  // 雨點打落遮面：疏落、高低唔同嘅細「滴」聲
  dropBuf = ctx.createBuffer(1, sr * 3, sr); const dd = dropBuf.getChannelData(0);
  for (let k = 0; k < 700; k++) {
    const at = Math.floor(Math.random() * (dd.length - 600)), a = .25 + Math.random() * .75, w = 2 * Math.PI * (900 + Math.random() * 2600) / sr, tau = 30 + Math.random() * 90;
    for (let i = 0; i < 600; i++) dd[at + i] += a * Math.exp(-i / tau) * Math.sin(i * w);
  }
  rain = null; rainMode = 'off';
}
function silentKeeper() {
  // 0.5 秒無聲 WAV，循環播：舊 iPhone 要有 <audio> 喺度播，Web Audio 先唔會跟靜音掣
  const n = 4000, b = new ArrayBuffer(44 + n), v = new DataView(b), s = (o, t) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  s(0, 'RIFF'); v.setUint32(4, 36 + n, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); s(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  try { const a = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' }))); a.loop = true; a.setAttribute('playsinline', ''); a.play().catch(() => {}); } catch (e) { /* 算 */ }
}

// ---------- 開關 ----------
export function setPref(k, on) {
  prefs[k] = on; keep(k, on); if (!ctx) return;
  const t = ctx.currentTime;
  if (k === 'music') { musBus.gain.setTargetAtTime(on ? MUS_VOL : 0, t, .08); if (on) nextT = t + .05; }
  else { sfxBus.gain.setTargetAtTime(on ? 1 : 0, t, .05); rainBus.gain.setTargetAtTime(on ? 1 : 0, t, .2); }
}

// ---------- 基本聲源 ----------
function env(g, t, vol, a, dur) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur); }
function panTo(node, pan, dest) { if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(dest); } else node.connect(dest); }
function tone(f, t, dur, { type = 'sine', vol = .2, a = .004, slide = 0, lp = 0, dest = sfxBus, pan = 0 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  env(g, t, vol, a, dur);
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); fl.connect(g); } else o.connect(g);
  panTo(g, pan, dest); o.start(t); o.stop(t + dur + .05);
}
function hiss(t, dur, { vol = .2, type = 'bandpass', f = 1000, f2 = 0, q = 1, a = .005, dest = sfxBus, pan = 0 } = {}) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf;
  fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
  env(g, t, vol, a, dur); s.connect(fl); fl.connect(g); panTo(g, pan, dest);
  s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
}

// ---------- 音效 ----------
const fx = fn => (...args) => { if (ctx && prefs.sfx) fn(ctx.currentTime + .005, ...args); };
export const sfx = {
  tap: fx(t => { tone(1500, t, .045, { type: 'triangle', vol: .28, slide: 950 }); }),
  tick: fx(t => { tone(1250, t, .06, { vol: .3, slide: 950 }); }),                       // 木魚咁「得」一聲
  count: fx(t => { tone(660, t, .16, { type: 'triangle', vol: .32 }); tone(1320, t, .08, { vol: .08 }); }),
  go: fx(t => { tone(990, t, .35, { type: 'triangle', vol: .3 }); tone(1980, t, .25, { vol: .1 }); tone(495, t, .3, { type: 'triangle', vol: .18 }); }),
  // 把遮：舉高 = 向上「呼」、壓低 = 向下「呼」（左右聲道跟方向）、收遮 = 「刷」+ 扣帶「嗒」、開遮 = 「噗」
  raise: fx(t => { hiss(t, .2, { f: 600, f2: 2400, q: 1.3, vol: 2 }); }),
  lower: fx((t, dir) => { hiss(t, .22, { f: 2200, f2: 520, q: 1.3, vol: 2.6, pan: dir * .6 }); }),
  close: fx(t => { hiss(t, .14, { f: 2600, f2: 700, q: 2, vol: .32 }); tone(320, t + .11, .05, { type: 'square', lp: 1600, vol: .14 }); hiss(t + .11, .03, { type: 'highpass', f: 3000, vol: .12 }); }),
  open: fx(t => { hiss(t, .22, { type: 'lowpass', f: 300, f2: 2800, q: .7, vol: .28 }); tone(95, t + .14, .2, { vol: .3, slide: 58 }); }),
  // 錯開：水滴「啵」；PERFECT：水滴 + 叮叮叮
  ok: fx(t => { tone(620, t, .09, { vol: .32, slide: 1400 }); tone(930, t + .07, .12, { vol: .22, slide: 2000 }); }),
  perfect: fx(t => { tone(620, t, .08, { vol: .28, slide: 1400 }); [1568, 2093, 2637].forEach((f, i) => { tone(f, t + .05 + i * .055, .32, { type: 'triangle', vol: .17 }); tone(f * 2, t + .05 + i * .055, .18, { vol: .04 }); }); hiss(t + .05, .35, { type: 'highpass', f: 7000, vol: .05 }); }),
  // 犯錯
  bump: fx(t => { tone(150, t, .28, { vol: .55, slide: 45 }); hiss(t, .14, { type: 'lowpass', f: 900, vol: .4 }); tone(110, t + .04, .32, { type: 'sawtooth', lp: 700, vol: .16, slide: 90 }); }),
  poke: fx(t => { hiss(t, .05, { type: 'highpass', f: 2500, vol: .25 }); for (let i = 0; i < 6; i++) tone(i % 2 ? 300 : 420, t + .03 + i * .055, .07, { type: 'triangle', vol: .2 * (1 - i / 7) }); }),   // 「啵～吘」彈弓聲
  scrape: fx(t => { hiss(t, .55, { f: 3200, f2: 1700, q: 9, vol: .45 }); hiss(t, .5, { f: 5200, q: 14, vol: .2 }); tone(523, t, .5, { type: 'square', lp: 2400, vol: .08 }); tone(784, t, .4, { type: 'square', lp: 2400, vol: .05 }); tone(130, t, .25, { vol: .35, slide: 60 }); }),
  splash: fx(t => { hiss(t, .55, { type: 'lowpass', f: 5000, f2: 380, q: .6, vol: .5 }); [0, .06, .13].forEach((d, i) => tone(500 + i * 260, t + d, .08, { vol: .14, slide: 1300 + i * 300 })); }),
  warn: fx(t => { tone(1180, t, .09, { type: 'triangle', vol: .26 }); tone(1180, t + .14, .09, { type: 'triangle', vol: .26 }); }),
  speed: fx(t => { hiss(t, .6, { f: 400, f2: 4200, q: 2, vol: .9 }); tone(440, t, .6, { type: 'sawtooth', lp: 2000, vol: .1, slide: 880 }); }),
  step: fx((t, side) => { hiss(t, .07, { type: 'lowpass', f: 900, f2: 300, vol: .7, pan: side }); hiss(t + .01, .05, { type: 'highpass', f: 4000, vol: .12, pan: side }); }),
  stamp: fx(t => { tone(90, t, .2, { vol: .55, slide: 48 }); hiss(t, .09, { type: 'lowpass', f: 1400, vol: .4 }); }),
  siren: fx(t => {
    const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = 'sawtooth'; fl.type = 'lowpass'; fl.frequency.value = 2500;
    for (let i = 0; i < 4; i++) { o.frequency.setValueAtTime(650, t + i * .25); o.frequency.linearRampToValueAtTime(1050, t + i * .25 + .125); o.frequency.linearRampToValueAtTime(650, t + i * .25 + .25); }
    g.gain.setValueAtTime(.16, t); g.gain.linearRampToValueAtTime(.0001, t + 1); o.connect(fl); fl.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 1.05);
  }),
  win: fx(t => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * .1, .22, { type: 'triangle', vol: .24 })); [523, 659, 784, 1047].forEach(f => tone(f, t + .42, 1.1, { type: 'triangle', vol: .12, a: .01 })); hiss(t + .42, .8, { type: 'highpass', f: 7000, vol: .04 }); }),
  // 肥佬：「wah wah wah waaah」
  fail: fx(t => {
    [[392, 0, .32], [370, .34, .32], [349, .68, .32], [330, 1.02, .95]].forEach(([f, d, len], i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.Q.value = 3;
      fl.frequency.setValueAtTime(350, t + d); fl.frequency.linearRampToValueAtTime(1400, t + d + .12); fl.frequency.linearRampToValueAtTime(500, t + d + len);
      if (i === 3) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = 9; l.connect(lg); lg.connect(o.frequency); l.start(t + d + .2); l.stop(t + d + len + .05); }
      env(g, t + d, .26, .03, len); o.connect(fl); fl.connect(g); g.connect(sfxBus); o.start(t + d); o.stop(t + d + len + .05);
    });
  }),
  right: fx(t => { [[1319, 0], [1760, .1]].forEach(([f, d]) => { tone(f, t + d, .4, { type: 'triangle', vol: .24 }); tone(f * 2.76, t + d, .15, { vol: .04 }); }); }),
  wrong: fx(t => { tone(140, t, .38, { type: 'square', lp: 900, vol: .2 }); tone(148, t, .38, { type: 'square', lp: 900, vol: .16 }); }),
  page: fx(t => { hiss(t, .13, { f: 2200, f2: 4800, q: .8, vol: .6 }); }),
  cash: fx(t => { hiss(t, .06, { type: 'highpass', f: 3500, vol: .2 }); tone(2093, t + .05, .16, { type: 'triangle', vol: .2 }); tone(2637, t + .12, .5, { type: 'triangle', vol: .22 }); tone(5274, t + .12, .2, { vol: .04 }); }),
};

// ---------- 雨聲 ----------
// [沙沙底噪, 高頻絲絲, 雨打遮面] ；closed = 收咗遮淋緊雨（大聲啲、刺耳啲）；covered = 瓦遮頭底
const RAIN = { off: [0, 0, 0], menu: [.022, .006, 0], open: [.028, .007, .055], closed: [.12, .04, 0], covered: [.014, .004, 0] };
export function ambience(mode) {
  if (!ctx || mode === rainMode) return; rainMode = mode;
  if (!rain) {
    const mk = (buf, type, f, q) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(rainBus); s.start(0, Math.random() * 1.8); return g; };
    rain = [mk(noiseBuf, 'bandpass', 1400, .4), mk(noiseBuf, 'highpass', 6500, .5), mk(dropBuf, 'lowpass', 2600, .5)];
  }
  const v = RAIN[mode] || RAIN.off, t = ctx.currentTime;
  rain.forEach((g, i) => g.gain.setTargetAtTime(v[i], t, mode === 'closed' ? .12 : .3));
}

// ---------- 背景音樂（16 分音符步進器，提早 0.15 秒排定）----------
let track = null, step = 0, nextT = 0, tempo = 1, semis = 0;
// 音樂檔：[loopStart, loopEnd]（秒，嚟自 audio/loops.json；檔頭尾各有 0.3 秒重複，避開 mp3 補白）
const FILES = { road: [.3, 18.30107], menu: [.3, 20.29238], quiz: [.3, 24.30152] }, FILE_GAIN = .62;
const TRACK_GAIN = { road: 1.2 };   // 路試音樂大聲 20%（使用者 2026-11-11）
const bufs = {}, loading = {}; let fileSrc = null;
function loadTrack(name) {
  if (!FILES[name] || bufs[name] || loading[name] || !ctx) return;
  loading[name] = fetch(new URL(`../audio/${name}.mp3?v=15`, import.meta.url)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
    .then(b => { bufs[name] = b; if (track === name && !fileSrc) startFile(name, .8); })
    .catch(() => { loading[name] = null; });   // 載入失敗：繼續用合成音樂
}
const fileRate = () => 1 + Math.min(5, semis) * .05;
function startFile(name, fadeIn) {
  const [ls, le] = FILES[name], t = ctx.currentTime + .02, s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = bufs[name]; s.loop = true; s.loopStart = ls; s.loopEnd = le; s.playbackRate.value = fileRate();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(FILE_GAIN * (TRACK_GAIN[name] || 1), t + fadeIn); s.connect(g); g.connect(musBus); s.start(t, ls);
  fileSrc = { s, g };
}
function stopFile(fade) {
  if (!fileSrc) return; const { s, g } = fileSrc, t = ctx.currentTime; fileSrc = null;
  g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); s.stop(t + fade + .05);
}
export function music(name) {
  if (name === track) return; track = name; step = 0; tempo = 1; semis = 0;
  if (!ctx) return;
  nextT = ctx.currentTime + .1; stopFile(.4);
  if (name && bufs[name]) startFile(name, .05);
}
export function musicSpeed(mul, tr = 0) { tempo = mul; semis = tr; if (fileSrc) fileSrc.s.playbackRate.setTargetAtTime(fileRate(), ctx.currentTime, .3); }
function sched() { if (ctx && track && !fileSrc && prefs.music && ctx.state === 'running') schedTo(ctx.currentTime + .15); }
function schedTo(until) {
  const T = TRACKS[track]; if (!T) return;
  if (nextT < ctx.currentTime - .05) nextT = ctx.currentTime + .03;   // 分頁返嚟 / 剛開音樂：唔好一次過補晒
  while (nextT < until) {
    const spb = 60 / (T.bpm * tempo) / 4; let t = nextT; if (T.swing && step % 2) t += spb * T.swing;
    T.play(step % 64, t, spb, Math.floor(step / 64)); nextT += spb; step++;
  }
}

// 樂器
function keys(m, t, dur, vol) { const f = mtof(m + semis); tone(f, t, dur, { vol, a: .01, dest: musBus }); tone(f * 2, t, dur * .45, { vol: vol * .22, dest: musBus }); tone(f * 3, t, .07, { type: 'triangle', vol: vol * .07, dest: musBus }); }
function bass(m, t, dur, vol) { const f = mtof(m + semis); tone(f, t, dur, { type: 'sawtooth', lp: 650, vol, a: .006, dest: musBus }); tone(f, t, dur, { vol: vol * .9, a: .006, dest: musBus }); }
function pluck(m, t, dur, vol, pan = 0) { tone(mtof(m + semis), t, dur, { type: 'triangle', vol, a: .003, dest: musBus, pan }); }
function stab(m, t, dur, vol) { tone(mtof(m + semis), t, dur, { type: 'square', lp: 1700, vol, a: .003, dest: musBus }); }
function lead(m, t, dur, vol) { const f = mtof(m + semis); tone(f, t, dur, { type: 'triangle', vol, a: .015, dest: musBus }); tone(f * 2, t, dur * .7, { vol: vol * .18, a: .015, dest: musBus }); }
function kick(t, vol) { tone(150, t, .16, { vol, a: .002, slide: 44, dest: musBus }); hiss(t, .012, { type: 'highpass', f: 3000, vol: vol * .15, dest: musBus }); }
function snare(t, vol) { hiss(t, .15, { type: 'highpass', f: 1400, vol, dest: musBus }); tone(210, t, .07, { type: 'triangle', vol: vol * .5, slide: 150, dest: musBus }); }
function brush(t, vol) { hiss(t, .12, { f: 3200, q: .6, vol, a: .012, dest: musBus }); }
function hat(t, vol, open) { hiss(t, open ? .13 : .035, { type: 'highpass', f: 7500, vol, dest: musBus }); }
function wood(t, hi) { tone(hi ? 1450 : 1050, t, .05, { vol: .26, slide: hi ? 1150 : 820, dest: musBus }); }
function drip(t, k) { const f = 1100 + (k * 397 % 900); tone(f, t, .09, { vol: .12, slide: f * 1.9, dest: musBus }); }
const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

const TRACKS = {
  // 等雨停：Cmaj9 – Am9 – Dm9 – G13，80 BPM，搖擺 lo-fi + 偶然雨滴
  menu: {
    bpm: 80, swing: .3,
    chords: [[52, 55, 59, 62], [52, 55, 59, 60], [53, 57, 60, 64], [53, 59, 62, 64]], roots: [48, 45, 50, 43],
    mel: [[[2, 76, 2], [4, 79, 4], [10, 74, 4]], [[2, 72, 2], [4, 76, 6], [12, 71, 2]], [[0, 69, 2], [2, 72, 2], [4, 77, 4], [10, 76, 2], [12, 74, 4]], [[4, 71, 2], [6, 74, 2], [8, 79, 6]]],
    play(s, t, spb, loop) {
      const bar = s >> 4, i = s & 15, ch = this.chords[bar], r = this.roots[bar];
      if (i === 0) ch.forEach(m => keys(m, t, spb * 7, .1)); if (i === 6) ch.forEach(m => keys(m, t, spb * 3, .06));
      if (i === 0) bass(r, t, spb * 6, .2); if (i === 10) bass(r + 7, t, spb * 2.5, .15); if (i === 14) bass(r + 12, t, spb * 1.5, .12);
      if (i === 0 || i === 10) kick(t, .35); if (i === 4 || i === 12) brush(t, .12); if (i % 2 === 0) hat(t, .035); else hat(t, .018);
      if (loop % 2 === 1) for (const [at, m, d] of this.mel[bar]) if (at === i) keys(m, t, spb * d * 1.1, .085);
      if (hash(s + loop * 64) < .05) drip(t + spb * .5, s + loop);
    },
  },
  // 筆試：Am – F – Dm – E7，100 BPM，撥弦分解和弦 + 時鐘「得、督」
  quiz: {
    bpm: 100,
    chords: [[57, 60, 64, 69], [57, 60, 65, 69], [57, 62, 65, 69], [56, 59, 62, 64]], roots: [45, 41, 50, 40],
    pat: [0, 2, 1, 2, 3, 2, 1, 2],
    play(s, t, spb, loop) {
      const bar = s >> 4, i = s & 15, ch = this.chords[bar], r = this.roots[bar];
      if (i % 4 === 0) wood(t, i % 8 === 0);
      if (i % 2 === 0) pluck(ch[this.pat[i >> 1]] + (loop % 2 && i >= 8 ? 12 : 0), t, spb * 1.6, .13, ((i >> 1) % 2 ? .25 : -.25));
      if (i === 0 || i === 8) bass(r, t, spb * 1.4, .2);
      if (bar === 3 && i === 12) pluck(68, t, spb * 3, .1);
    },
  },
  // 路試：Fmaj7 – G – Em7 – Am（王道進行），112 BPM，八度跳低音 + 反拍和弦
  road: {
    bpm: 112,
    chords: [[57, 60, 64], [55, 59, 62], [55, 59, 64], [57, 60, 64]], roots: [41, 43, 40, 45],
    mel: [[[0, 72, 2], [2, 74, 2], [4, 76, 4], [8, 81, 2], [10, 79, 2], [12, 76, 4]], [[0, 79, 3], [4, 76, 2], [6, 74, 2], [8, 74, 2], [10, 76, 2], [12, 79, 4]],
      [[0, 79, 2], [2, 81, 2], [4, 83, 4], [8, 79, 4], [12, 76, 4]], [[0, 76, 2], [2, 74, 2], [4, 72, 6], [12, 69, 2], [14, 71, 2]]],
    play(s, t, spb, loop) {
      const bar = s >> 4, i = s & 15, ch = this.chords[bar], r = this.roots[bar];
      if (i % 2 === 0) bass(r + (i % 4 ? 12 : 0), t, spb * 1.5, .17);
      if (i === 0 || i === 8 || (i === 6 && bar % 2)) kick(t, .35); if (i === 4 || i === 12) snare(t, .2);
      hat(t, i % 4 === 2 ? .06 : .025, i % 4 === 2);
      if (i % 4 === 2) ch.forEach(m => stab(m, t, spb * .9, .045));
      const mel = this.mel[bar], oct = loop % 2 ? -12 : 0;
      for (const [at, m, d] of mel) if (at === i) (oct ? pluck : lead)(m + oct, t, spb * d, oct ? .14 : .11);
    },
  },
};

// ---------- 測試用：離線渲染一段聲，計音量 ----------
export async function _render(seconds, fn) {
  const save = { ctx, out, sfxBus, musBus, rainBus, noiseBuf, dropBuf, rain, rainMode, track, step, nextT, tempo, semis, fileSrc, p: { ...prefs } };
  const oc = new OfflineAudioContext(2, Math.ceil(44100 * seconds), 44100);
  prefs.music = prefs.sfx = true; build(oc); track = null; fileSrc = null;
  fn({ sfx, music: (n, synth) => { track = n; if (bufs[n] && !synth) startFile(n, .01); else { nextT = 0; schedTo(seconds); } }, ambience, musicSpeed, bufs, at: t => t });
  const buf = await oc.startRendering();
  ({ ctx, out, sfxBus, musBus, rainBus, noiseBuf, dropBuf, rain, rainMode, track, step, nextT, tempo, semis, fileSrc } = save); Object.assign(prefs, save.p);
  const d = buf.getChannelData(0); let pk = 0, ss = 0; for (const x of d) { pk = Math.max(pk, Math.abs(x)); ss += x * x; }
  return { peak: +pk.toFixed(3), rms: +Math.sqrt(ss / d.length).toFixed(4), buf };
}
