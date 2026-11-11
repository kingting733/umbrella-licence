// game.js — 擔遮考牌：流程（報到 → 筆試 → 路試 → 領牌 → 挑戰模式）、判定、計分、牌照卡
import { QUESTIONS, SIGNS } from './questions.js?v=3';
import * as W from './scene.js?v=3';
const { INK, RED, GOLD, GREEN, BLUE, ORANGE } = W;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('umbrella.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('umbrella.' + k, JSON.stringify(v)); } catch (e) { /* 私隱模式：唔記住就算 */ } },
};

// ---------- 聲音（全部即時合成）----------
let actx = null, rainNode = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } } if (actx && actx.state === 'suspended') actx.resume().catch(() => {}); return actx; }
function tone(f, dur, type = 'sine', vol = .12, slide = null, delay = 0) { if (!actx) return; const t0 = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + .03); }
const sfx = {
  tap() { tone(560, .05, 'square', .05); },
  tick() { tone(1250, .03, 'square', .04); },
  ok() { tone(880, .08, 'sine', .12); tone(1320, .12, 'sine', .1, null, .07); },
  perfect() { [880, 1175, 1568].forEach((f, i) => tone(f, .1, 'triangle', .12, null, i * .06)); },
  bad() { tone(150, .35, 'sawtooth', .16, 80); },
  warn() { tone(990, .07, 'square', .06); tone(990, .07, 'square', .06, null, .12); },
  stamp() { tone(110, .16, 'square', .18, 55); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, 'triangle', .12, null, i * .1)); },
  speed() { tone(440, .25, 'sawtooth', .07, 880); },
  siren() { if (!actx) return; const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(); o.type = 'sawtooth'; for (let i = 0; i < 4; i++) { o.frequency.setValueAtTime(650, t + i * .25); o.frequency.linearRampToValueAtTime(1050, t + i * .25 + .125); o.frequency.linearRampToValueAtTime(650, t + i * .25 + .25); } g.gain.setValueAtTime(.1, t); g.gain.linearRampToValueAtTime(.0001, t + 1); o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + 1.05); },
};
function rainOn(v) { if (!actx) return; if (!rainNode) { const len = actx.sampleRate * 2, buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const src = actx.createBufferSource(); src.buffer = buf; src.loop = true; const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = .5; const g = actx.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(actx.destination); src.start(); rainNode = { src, g }; } rainNode.g.gain.setTargetAtTime(v, actx.currentTime, .4); }
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* 唔支援 */ } };

// ---------- 畫面切換 ----------
const SCREENS = ['intro', 'written', 'writtenResult', 'roadIntro', 'road', 'result', 'challengeResult'];
function show(id) { SCREENS.forEach(s => { $('#' + s).hidden = s !== id; }); $('#' + id).scrollTop = 0; }
const G = { name: '陳大文', written: 0, stats: null, grade: null, portraits: null, licNo: '' };

// ---------- 考官黃 Sir ----------
function exam(mood, text) { const img = $('#examFace'); if (G.portraits) img.src = G.portraits.examiner[mood] || G.portraits.examiner.neutral; $('#exam').dataset.mood = mood; if (text) $('#examText').textContent = text; }

// ================= 筆試 =================
const QTIME = 15;
const WT = { qs: [], i: 0, correct: 0, answered: true, t0: 0, iv: 0, lastSec: -1 };
function startWritten() {
  audio(); G.name = ($('#nameInput').value || '').trim() || '陳大文'; store.set('name', G.name);
  WT.qs = shuffle(QUESTIONS.slice()).slice(0, 5).map(q => { const ord = shuffle([0, 1, 2, 3]); return { ...q, o: ord.map(k => q.o[k]), a: ord.indexOf(q.a) }; });
  WT.i = 0; WT.correct = 0; G.stats = null; W.setMode('menu', 'written'); show('written'); renderQ();
}
function renderQ() {
  const q = WT.qs[WT.i]; WT.answered = false; WT.lastSec = -1;
  $('#qNum').textContent = `第 ${WT.i + 1} 題（必答）`;
  $$('#dots i').forEach((d, k) => { d.className = k < WT.i ? (d.dataset.r || '') : k === WT.i ? 'cur' : ''; });
  $('#qText').textContent = q.q;
  const sb = $('#qSign'); if (q.sign) { sb.innerHTML = SIGNS[q.sign].svg + `<figcaption>${SIGNS[q.sign].cap}</figcaption>`; sb.hidden = false; } else { sb.hidden = true; sb.innerHTML = ''; }
  const box = $('#opts'); box.innerHTML = '';
  q.o.forEach((t, k) => { const b = document.createElement('button'); b.className = 'opt'; b.id = 'opt' + k; b.type = 'button'; b.innerHTML = `<span class="box"></span><span class="L">${'ABCD'[k]}．</span><span class="t"></span><svg class="pen" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M8 22C10 6 70 2 92 14C100 24 70 38 30 36C8 34 2 26 12 14"/></svg>`; b.querySelector('.t').textContent = t; b.addEventListener('click', () => answer(k)); box.appendChild(b); });
  $('#feedback').hidden = true; $('#nextBtn').hidden = true;
  WT.t0 = performance.now(); clearInterval(WT.iv); WT.iv = setInterval(tickQ, 100); tickQ();
}
function tickQ() {
  const left = Math.max(0, QTIME - (performance.now() - WT.t0) / 1000), sec = Math.ceil(left);
  $('#qBar').style.width = (left / QTIME * 100) + '%'; $('#qTimer').classList.toggle('hurry', left <= 5); $('#qSec').textContent = sec;
  if (left <= 5 && sec !== WT.lastSec && sec > 0) sfx.tick(); WT.lastSec = sec;
  if (left <= 0) answer(-1);
}
function answer(k) {
  if (WT.answered) return; WT.answered = true; clearInterval(WT.iv);
  const q = WT.qs[WT.i], right = k === q.a; if (right) { WT.correct++; sfx.ok(); } else sfx.bad();
  $$('.opt').forEach((b, i) => { b.disabled = true; if (i === k) b.classList.add('picked'); if (i === q.a) b.classList.add('answer'); });
  $$('#dots i')[WT.i].dataset.r = right ? 'ok' : 'no';
  const fb = $('#feedback'); fb.className = 'feedback ' + (right ? 'ok' : 'no');
  $('#fbPill').textContent = right ? '答啱' : (k < 0 ? '超時' : '答錯'); $('#fbWhy').textContent = q.why;
  if (G.portraits) $('#fbFace').src = G.portraits.examiner[right ? 'nod' : 'frown'];
  fb.hidden = false; const nb = $('#nextBtn'); nb.textContent = WT.i < 4 ? '下一題' : '交卷'; nb.hidden = false;
}
function nextQ() { sfx.tap(); WT.i++; if (WT.i < 5) renderQ(); else writtenDone(); }
function writtenDone() {
  G.written = WT.correct; const pass = WT.correct >= 4;
  $('#wrScore').textContent = WT.correct; const st = $('#wrStamp'); st.textContent = pass ? '合格' : '肥佬'; st.className = 'stamp ' + (pass ? 'pass' : 'fail');
  $('#wrLine').innerHTML = pass ? '筆試合格。下一關：<b>路試</b>。' : '5 題要答啱 4 題。考官建議你返去溫書，出街記得著<b>雨衣</b>。';
  $('#wrBtn').textContent = pass ? '前往路試' : '領取結果'; show('writtenResult'); setTimeout(sfx.stamp, 250);
}

// ================= 路試 / 挑戰模式 =================
const PEOPLE = {
  popo: { name: '阿婆', need: 'up', f: .85, instant: true },
  kid: { name: '小學生', need: 'up', f: 1.25 },
  flyer: { name: '派傳單姐姐', need: 'up', f: 1 },
  ol: { name: '返工OL', need: 'up', f: 1.05 },
  phone: { name: '低頭族', need: 'either', f: .9 },
  rider: { name: '外賣仔', need: 'down', f: 1.1 },
  muscle: { name: '健身大隻佬', need: 'down', f: 1 },
  tourist: { name: '拖喼遊客', need: 'down', f: .95 },
  baller: { name: '籃球隊長', need: 'down', f: 1 },
};
const CM = { popo: 155, kid: 132, flyer: 160, ol: 167, phone: 171, rider: 175, muscle: 185, tourist: 188, baller: 198 };
const VWALK = 1.5, VREL = 3.0, HOLD = 1.0, PERFECT = .3, WET = 2.0, TEST_LEN = 60, HINT_UNTIL = 14;
const R = { alive: false };
const speedAt = t => R.mode === 'challenge' ? Math.pow(1.2, Math.floor(t / 10)) : 1;

function startRoad(mode) {
  audio(); clearEvents(); W.roadReset(); W.setMode('road');
  Object.assign(R, { mode, alive: true, running: false, ended: false, pre: 3.2, t: 0, state: 'normal', stateUntil: 0, lastAct: -9, lastActType: '', coverUntil: -1, wet: 0,
    strikes: 0, lives: mode === 'test' ? 3 : 1, log: [], ok: 0, perfect: 0, combo: 0, maxCombo: 0, perfectRun: 0, maxPerfectRun: 0, wetCount: 0, signs: 0, signPerfect: 0, popoHit: false,
    events: [], lastContact: 1.4, lastKind: '', lastType: '', nextSignAt: 8 + rand(0, 2), level: 0, lastTs: 0 });
  $('#hudMode').textContent = mode === 'test' ? '② 路試' : '④ 挑戰模式';
  $('#lives').innerHTML = '<i></i>'.repeat(R.lives); $('#combo').textContent = ''; $('#endOverlay').hidden = true; $('#warn').hidden = true; $('#banner').hidden = true; $('#wet').hidden = true; $('#tags').innerHTML = '';
  $('#road').classList.remove('soaked'); updateButtons(); show('road'); W.resize();
  exam('neutral', mode === 'test' ? '準備好就出發。' : '挑戰模式。撞一次就完。'); rainOn(.05); showCount(3);
}
function showCount(v, go) { const c = $('#count'); c.textContent = v; c.hidden = false; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); if (go) setTimeout(() => { c.hidden = true; }, 600); }

function genEvents() {
  while (R.lastContact - R.t < 4.5) {
    if (R.mode === 'test' && R.lastContact > TEST_LEN - 2.2) return;
    const m = speedAt(R.lastContact);
    let gap = rand(1.45, 1.85) / m; if (R.lastKind === 'sign') gap = Math.max(gap, .9 / m + .7);
    const contact = R.lastContact + gap; let e;
    if (contact >= R.nextSignAt) {
      const style = Math.random() < .5 ? 'arcade' : 'board', v = VWALK * m;
      e = { kind: 'sign', contact, style, v, spawned: false, resolved: false, warned: false };
      R.nextSignAt = contact + rand(5.5, 8.5); R.lastKind = 'sign';
    } else {
      let type; do { type = pick(['popo', 'popo', 'kid', 'flyer', 'ol', 'phone', 'rider', 'muscle', 'tourist', 'baller']); } while (type === R.lastType);
      R.lastType = type; R.lastKind = 'person';
      e = { kind: 'person', contact, type, side: Math.random() < .5 ? -1 : 1, v: VREL * m * PEOPLE[type].f, spawned: false, resolved: false, walk0: Math.random() * 6 };
    }
    R.lastContact = contact; R.events.push(e);
  }
}

function step(dt) {
  if (!R.running) {
    if (R.pre > 0 && !R.ended) { const before = Math.ceil(R.pre); R.pre -= dt; const now = Math.ceil(R.pre); if (R.pre <= 0) { R.running = true; showCount('出發！', true); sfx.ok(); } else if (now !== before) { showCount(now); sfx.tick(); } }
    return;
  }
  if (R.ended) return;
  R.t += dt; const m = speedAt(R.t);
  if ((R.state === 'up' || R.state === 'downL' || R.state === 'downR') && R.t >= R.stateUntil) { R.state = 'normal'; updateButtons(); }
  const covered = R.t < R.coverUntil; W.setCovered(covered);
  if (R.state === 'closed' && !covered) { R.wet += dt; if (R.wet >= WET) { R.wet = 0; R.wetCount++; R.state = 'normal'; updateButtons(); fault('淋到濕晒！', '冇瓦遮頭仲收住遮，淋到成身濕。', 'wet'); if (R.ended) return; } }
  else R.wet = Math.max(0, R.wet - dt * 2);
  $('#wet').hidden = R.wet <= .05; $('#wetFill').style.width = (R.wet / WET * 100) + '%'; $('#road').classList.toggle('soaked', R.state === 'closed' && !covered);
  if (R.mode === 'challenge') { const lv = Math.floor(R.t / 10); if (lv > R.level) { R.level = lv; banner(`加速 ×${Math.pow(1.2, lv).toFixed(2)}`); exam('neutral', pick(['快啲喇。', '人多咗。', '仲頂得順？', '考生，專心。'])); sfx.speed(); } }
  genEvents();
  for (const e of R.events) {
    if (e.resolved) continue;
    const z = -(e.contact - R.t) * e.v;
    if (e.kind === 'person') {
      if (!e.spawned && z > -26) { e.spawned = true; e.n = W.npcSpawn(e.type); }
      if (e.spawned) W.npcPlace(e.n, e.side, z, e.walk0 + R.t * 7.5 * m * PEOPLE[e.type].f);
    } else {
      if (!e.spawned && z > -45) { e.spawned = true; e.h = W.hazardSpawn(e.style); }
      if (e.spawned) W.hazardPlace(e.h, z);
      if (!e.warned && e.contact - R.t <= 1.0) { e.warned = true; showWarn(true); sfx.warn(); }
    }
    if (R.t >= e.contact) { resolve(e); if (R.ended) return; }
  }
  // 行過咗嘅人 / 招牌：繼續郁一陣先收
  for (const e of R.events) if (e.resolved && e.spawned) {
    const z = -(e.contact - R.t) * e.v;
    if (e.kind === 'person') { if (z > 2.5) { W.npcRelease(e.n); e.spawned = false; } else W.npcPlace(e.n, e.side, z, e.walk0 + R.t * 7.5 * m); }
    else { if (z > 9) { W.hazardRelease(e.h); e.spawned = false; } else W.hazardPlace(e.h, z); }
  }
  R.events = R.events.filter(e => !e.resolved || e.spawned);
  if (R.mode === 'test') { const left = Math.max(0, TEST_LEN - R.t); $('#hudTime').textContent = left.toFixed(1); $('#tbarFill').style.width = (R.t / TEST_LEN * 100) + '%'; if (R.t >= TEST_LEN) endRoad('win'); }
  else { $('#hudTime').textContent = R.t.toFixed(1) + ' 秒'; $('#tbarFill').style.width = ((R.t % 10) / 10 * 100) + '%'; }
}

function resolve(e) {
  e.resolved = true; const s = R.state;
  if (e.kind === 'sign') {
    showWarn(false); R.signs++;
    if (s === 'closed') { R.coverUntil = R.t + (e.style === 'arcade' ? 4 / e.v + .2 : .35); const perf = R.lastActType === 'close' && R.t - R.lastAct <= PERFECT; success(perf, true); }
    else { sfx.siren(); fault('刮爛招牌！', `遮頂撞落「${e.h ? e.h.name : '招牌'}」。見到招牌要即刻收遮。`, 'sign'); }
    return;
  }
  const p = PEOPLE[e.type], mySide = e.side < 0 ? 'downL' : 'downR', isDown = s === 'downL' || s === 'downR';
  let ok = false;
  if (s === 'closed') ok = true;
  else if (p.need === 'up') ok = s === 'up';
  else if (p.need === 'down') ok = s === mySide;
  else ok = s === 'up' || s === mySide;
  if (ok) { success(s !== 'closed' && R.t - R.lastAct <= PERFECT, false); return; }
  if (e.type === 'popo') { R.popoHit = true; endRoad('instant', '即時取消資格', '遮骨直插阿婆眼部。'); return; }
  const sw = e.side < 0 ? '左' : '右', arrow = e.side < 0 ? '壓低←' : '壓低→';
  if (isDown && s !== mySide && p.need !== 'up') fault('壓錯邊！', `${p.name}喺你${sw}邊行過，要撳【${arrow}】。`, 'side');
  else if (p.need === 'up') fault('插親人！', `遮骨刮中${p.name}（${CM[e.type]}cm），要撳【舉高】。`, 'poke');
  else if (p.need === 'down') fault('撞遮！', `${p.name}（${CM[e.type]}cm）把遮同你撼個正，要撳【${arrow}】。`, 'bump');
  else fault('撞遮！', `${p.name}同你差唔多高，企定唔郁就撼埋一齊。`, 'bump');
}
const OKLINES = ['嗯。', '繼續。', '穩陣。', '可以。'], PERFLINES = ['教科書式錯開。', '有啲料。', '好準。', '我都想學。'];
const FAULTLINES = { wet: '濕晒喇考生。', sign: '招牌都畀你刮花。', side: '左右都分唔清？', poke: '險過剃頭。', bump: '睇路呀！' };
function success(perfect, isSign) {
  R.ok++; R.combo++; R.maxCombo = Math.max(R.maxCombo, R.combo);
  if (perfect) { R.perfect++; R.perfectRun++; R.maxPerfectRun = Math.max(R.maxPerfectRun, R.perfectRun); if (isSign) R.signPerfect++; } else R.perfectRun = 0;
  pop(perfect ? 'PERFECT' : pick(['錯開！', '好！', '過咗！']), perfect ? 'perfect' : 'good');
  perfect ? sfx.perfect() : sfx.ok();
  $('#combo').textContent = R.combo >= 2 ? `連擊 ×${R.combo}` : '';
  if (perfect && Math.random() < .6) exam('nod', pick(PERFLINES)); else if (R.combo % 5 === 0) exam('nod', `連擊 ${R.combo}，唔錯。`); else if (Math.random() < .25) exam('neutral', pick(OKLINES));
}
function fault(title, reason, key) {
  R.strikes++; R.combo = 0; R.perfectRun = 0; R.log.push(`${R.t.toFixed(1)} 秒｜${title.replace('！', '')}：${reason}`);
  $('#road').classList.remove('hit'); void $('#road').offsetWidth; $('#road').classList.add('hit'); buzz([60, 40, 120]); if (key !== 'sign') sfx.bad();
  pop(title, 'bad'); $('#combo').textContent = '';
  const lives = $$('#lives i'); if (lives[R.strikes - 1]) lives[R.strikes - 1].className = 'x';
  if (R.mode === 'challenge') { endRoad('dead', title.replace('！', ''), reason); return; }
  if (R.strikes >= 3) { endRoad('fail', '路試不合格', '犯錯 3 次。'); return; }
  exam('frown', FAULTLINES[key] || '睇路呀！');
}
function endRoad(kind, title, reason) {
  R.ended = true; R.running = false; showWarn(false); $('#tags').innerHTML = '';
  const ov = $('#endOverlay'), st = $('#endStamp');
  if (kind === 'win') { st.textContent = '路試完成'; st.className = 'end-stamp pass'; $('#endReason').textContent = '捱夠 60 秒。'; exam('nod', '路試完成。'); sfx.win(); }
  else { st.textContent = kind === 'dead' ? '挑戰結束' : title; st.className = 'end-stamp fail'; $('#endReason').textContent = kind === 'dead' ? `${title}：${reason}` : reason; exam('shock', kind === 'instant' ? '考生遮骨直插途人眼部。' : kind === 'dead' ? '完。' : '三次犯錯，不合格。'); kind === 'instant' ? sfx.siren() : sfx.stamp(); buzz(300); }
  ov.hidden = false;
  setTimeout(() => {
    R.alive = false; rainOn(0); clearEvents(); W.setMode('menu', 'intro');
    if (R.mode === 'challenge') challengeDone(title, reason);
    else { G.stats = { strikes: R.strikes, ok: R.ok, perfect: R.perfect, maxCombo: R.maxCombo, log: R.log.slice(), title: titleFor(), completed: kind === 'win' }; finishExam(kind === 'win' ? 'pass' : 'road-fail'); }
  }, 2300);
}
function titleFor() { if (R.popoHit) return '阿婆殺手'; if (R.maxPerfectRun >= 10) return '人肉雨刮'; if (R.signs > 0 && R.signPerfect === R.signs) return '騎樓之王'; if (R.wetCount >= 2) return '全港最濕'; return null; }

// ---------- 掣 ----------
function act(a) {
  if (!R.alive || !R.running || R.ended) return;
  sfx.tap(); R.lastAct = R.t; R.lastActType = a;
  if (a === 'close') R.state = R.state === 'closed' ? 'normal' : 'closed';
  else { R.state = a; R.stateUntil = R.t + HOLD; }
  W.setUmbrella(R.state); updateButtons();
}
function updateButtons() {
  W.setUmbrella(R.state || 'normal');
  $$('.cbtn').forEach(b => b.classList.toggle('on', b.dataset.act === R.state || (b.dataset.act === 'close' && R.state === 'closed')));
  $('#bClose').firstChild.textContent = R.state === 'closed' ? '開遮' : '緊急收遮';
}

function clearEvents() { for (const e of R.events || []) if (e.spawned) { if (e.kind === 'person') W.npcRelease(e.n); else W.hazardRelease(e.h); e.spawned = false; } R.events = []; W.setCovered(false); }

// ---------- HUD 小部件 ----------
function pop(text, cls) { const el = $('#pop'); el.textContent = text; el.className = 'pop ' + cls; void el.offsetWidth; el.classList.add('go'); }
function showWarn(on) { $('#warn').hidden = !on; }
function banner(text) { const b = $('#banner'); b.textContent = text; b.hidden = false; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); clearTimeout(banner.tm); banner.tm = setTimeout(() => { b.hidden = true; }, 1600); }
function drawTags() {
  const box = $('#tags'); if (!R.running) return;
  const hint = R.mode === 'test' && R.t < HINT_UNTIL, want = [];
  for (const e of R.events) if (e.kind === 'person' && e.spawned && !e.resolved) {
    const z = -(e.contact - R.t) * e.v; if (z < -15 || z > -2.2) continue;
    const s = W.npcScreen(e.n); if (!s.ok) continue; want.push({ e, s });
  }
  const els = [...box.children];
  while (els.length < want.length) { const d = document.createElement('div'); d.className = 'tag'; box.appendChild(d); els.push(d); }
  els.forEach((el, i) => {
    const w = want[i]; if (!w) { el.style.display = 'none'; return; }
    const p = PEOPLE[w.e.type], arrow = w.e.side < 0 ? '←' : '→';
    const hintTxt = !hint ? '' : p.need === 'up' ? '舉高' : p.need === 'down' ? (w.e.side < 0 ? '← 壓低' : '壓低 →') : '舉高 / 壓低';
    el.style.display = ''; el.className = 'tag ' + p.need;
    el.innerHTML = `<b>${CM[w.e.type]}cm</b> ${p.name}${p.need !== 'up' ? `<i>${arrow}</i>` : ''}${hintTxt ? `<small>${hintTxt}</small>` : ''}`;
    const bw = box.clientWidth, half = el.offsetWidth / 2 + 8;   // 唔好俾標籤出咗畫面
    el.style.left = Math.min(bw - half, Math.max(half, w.s.x * bw)) + 'px'; el.style.top = (Math.max(.14, w.s.y) * 100) + '%';
  });
}

// ================= 結果 / 牌照卡 =================
function finishExam(outcome) {
  const st = G.stats; let grade;
  if (outcome !== 'pass') grade = 'raincoat'; else if (G.written === 5 && st.strikes === 0) grade = 'full'; else grade = 'partial';
  G.grade = grade; if (grade !== 'raincoat') store.set('unlocked', true);
  G.licNo = licNo();
  const rows = [['筆試', `${G.written} / 5`], ['路試', outcome === 'written-fail' ? '未獲安排（筆試不合格）' : st.completed ? '完成 60 秒' : '不合格']];
  if (st) rows.push(['犯錯', `${st.strikes} 次`], ['錯開', `${st.ok} 個（完美 ${st.perfect}）`], ['最高連擊', `${st.maxCombo}`]);
  if (st && st.title) rows.push(['稱號', st.title]);
  $('#resRows').innerHTML = rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('');
  $('#resLog').innerHTML = st && st.log.length ? '<p class="loghead">犯錯紀錄</p>' + st.log.map(l => `<p>${l}</p>`).join('') : '';
  const verdict = { raincoat: ['不合格', '即日起出街須著<b>雨衣</b>。下次可預約考試日期：2028 年 3 月。'], partial: ['有條件合格', '批出第 1 類：<b>縮骨遮</b>。其他類別要零犯錯先批。'], full: ['全科合格', '批出<b>全部類別</b>，仲可以申請做「遮的」司機。'] }[grade];
  $('#resPill').textContent = verdict[0]; $('#resPill').className = 'pill ' + (grade === 'raincoat' ? 'red' : grade === 'full' ? 'green' : 'blue'); $('#resLine').innerHTML = verdict[1];
  $('#cardImg').src = makeCard(grade); $('#taxiArea').hidden = grade !== 'full'; $('#taxiImg').hidden = true; $('#taxiStatus').hidden = true; $('#taxiBtn').hidden = false;
  $('#challengeBtn').hidden = grade === 'raincoat'; W.setMode('menu', grade); show('result'); setTimeout(sfx.stamp, 400);
}
function licNo() { const d = [...Array(6)].map(() => Math.floor(Math.random() * 10)); const sum = d.reduce((s, v, i) => s + v * (7 - i), 0) + 21 * 9; const c = 11 - (sum % 11); return `U${d.join('')}(${c === 11 ? 0 : c === 10 ? 'A' : c})`; }
const today = () => { const n = new Date(); return `${String(n.getDate()).padStart(2, '0')}-${String(n.getMonth() + 1).padStart(2, '0')}-${n.getFullYear()}`; };
const FONT = '"Noto Sans TC", "NotoSansTC", sans-serif';
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrap(g, text, x, y, maxW, lh) { let line = ''; for (const ch of text) { if (g.measureText(line + ch).width > maxW) { g.fillText(line, x, y); line = ch; y += lh; } else line += ch; } if (line) g.fillText(line, x, y); return y; }
const PHOTO = {};
function makeCard(kind) {
  const Wc = 1000, Hc = 630, c = document.createElement('canvas'); c.width = Wc; c.height = Hc; const g = c.getContext('2d');
  const head = { raincoat: [RED, '雨衣令', 'RAINCOAT ORDER'], partial: [GREEN, '香港擔遮牌照', '第 1 類'], full: [GREEN, '香港擔遮牌照', '全類別'], taxi: [INK, '遮的司機證', 'UMBRELLA TAXI'] }[kind];
  g.save(); rr(g, 0, 0, Wc, Hc, 34); g.clip(); g.fillStyle = '#f7f6f1'; g.fillRect(0, 0, Wc, Hc);
  g.strokeStyle = 'rgba(46,111,216,.07)'; g.lineWidth = 1.4; for (let k = 0; k < 26; k++) { g.beginPath(); for (let x = 0; x <= Wc; x += 10) { const y = 130 + k * 20 + Math.sin(x / 60 + k * .7) * 10; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  g.fillStyle = head[0]; g.fillRect(0, 0, Wc, 104);
  g.fillStyle = kind === 'taxi' ? GOLD : '#fff'; g.font = `900 46px ${FONT}`; g.textBaseline = 'middle'; g.fillText(head[1], 44, 54);
  g.textAlign = 'right'; g.font = `900 40px ${FONT}`; g.fillText(head[2], Wc - 44, 54); g.textAlign = 'left';
  g.fillStyle = '#e4e2da'; rr(g, 44, 140, 230, 290, 18); g.fill();
  const img = PHOTO[kind === 'taxi' ? 'taxi' : kind === 'raincoat' ? 'raincoat' : 'full']; if (img && img.complete) { g.save(); rr(g, 44, 140, 230, 290, 18); g.clip(); g.drawImage(img, 44 - 40, 140 - 10, 310, 310); g.restore(); }
  const L = (t, x, y) => { g.fillStyle = '#7a7d82'; g.font = `700 22px ${FONT}`; g.fillText(t, x, y); };
  const V = (t, x, y, s = 40, col = INK) => { g.fillStyle = col; g.font = `900 ${s}px ${FONT}`; g.fillText(t, x, y); };
  L('姓名', 310, 160); V(G.name, 310, 210, 58);
  L(kind === 'taxi' ? '司機編號' : kind === 'raincoat' ? '文件編號' : '執照號碼', 310, 278); V(kind === 'taxi' ? 'TX-' + G.licNo.slice(1, 5) : G.licNo, 310, 320, 34);
  L('簽發日期', 640, 278); V(today(), 640, 320, 34);
  L('有效期至', 310, 384); V(kind === 'raincoat' ? '重考合格為止' : '下次打風為止', 310, 424, 32);
  if (kind === 'taxi') {
    const fare = [['起錶', '$27'], ['其後每 200 米', '$2'], ['騎樓底', '免費']];
    fare.forEach(([a, b], i) => { const x = 44 + i * 310; g.fillStyle = '#ecebe5'; rr(g, x, 452, 290, 88, 16); g.fill(); L(a, x + 20, 482); V(b, x + 20, 522, 36, GREEN); });
  } else {
    const cls = [['1', '縮骨遮'], ['2', '長柄遮'], ['3', '高爾夫大遮'], ['X', '透明膠遮']];
    cls.forEach(([n, name], i) => {
      const x = 44 + i * 232, on = kind === 'full' || (kind === 'partial' && i === 0);
      g.fillStyle = on ? (kind === 'full' ? GREEN : BLUE) : '#ecebe5'; rr(g, x, 452, 214, 88, 16); g.fill();
      g.fillStyle = on ? '#fff' : '#a7a9ad'; g.font = `900 46px ${FONT}`; g.fillText(n, x + 18, 498); g.font = `900 26px ${FONT}`; g.fillText(name, x + 64, 498);
      if (!on) { g.save(); g.translate(x + 150, 514); g.rotate(-.12); g.strokeStyle = RED; g.lineWidth = 3; g.strokeRect(-40, -18, 80, 34); g.fillStyle = RED; g.font = `900 22px ${FONT}`; g.textAlign = 'center'; g.fillText(kind === 'raincoat' ? '取消' : '未批', 0, 0); g.restore(); }
    });
  }
  const st = G.stats, remark = { raincoat: `持證人不得擔遮，出街須著雨衣。${st && st.title ? '稱號：' + st.title + '。' : ''}`, partial: `只准擔第 1 類縮骨遮。筆試 ${G.written}/5，路試犯錯 ${st ? st.strikes : 0} 次。${st && st.title ? '稱號：' + st.title + '。' : ''}`, full: `全類別批准。路試零犯錯，完美錯開 ${st ? st.perfect : 0} 次。${st && st.title ? '稱號：' + st.title + '。' : ''}`, taxi: '持證人可代客擔遮。騎樓底免費，黑雨停駛。' }[kind];
  g.fillStyle = '#4a4d52'; g.font = `700 24px ${FONT}`; wrap(g, "附註：" + remark, 44, 572, 640, 30);
  const stampTxt = { raincoat: '雨衣令', partial: '限縮骨遮', full: '全類別批准', taxi: '批出' }[kind];
  g.save(); g.translate(842, 205); g.rotate(-.16); g.globalAlpha = .88; g.strokeStyle = RED; g.lineWidth = 7; g.font = `900 ${stampTxt.length > 3 ? 40 : 54}px ${FONT}`; const sw = g.measureText(stampTxt).width + 48; rr(g, -sw / 2, -44, sw, 88, 10); g.stroke(); g.fillStyle = RED; g.textAlign = 'center'; g.fillText(stampTxt, 0, 2); g.restore();
  g.fillStyle = '#9a9ca0'; g.font = `700 20px ${FONT}`; g.textAlign = 'right'; g.fillText('遮政署署長', Wc - 44, 600); g.textAlign = 'left';
  g.restore(); return c.toDataURL('image/png');
}
function applyTaxi() { sfx.tap(); $('#taxiBtn').hidden = true; const s = $('#taxiStatus'); s.hidden = false; s.textContent = '審批中…'; setTimeout(() => { s.textContent = '批出。你而家可以收錢幫人擔遮。'; const im = $('#taxiImg'); im.src = makeCard('taxi'); im.hidden = false; sfx.stamp(); }, 1500); }

function challengeDone(title, reason) {
  const t = R.t, best = store.get('best', 0), isNew = t > best; if (isNew) store.set('best', t);
  $('#crTime').textContent = t.toFixed(1); $('#crBest').innerHTML = isNew ? '<span class="pill gold">新紀錄</span>' : `最佳紀錄 ${best.toFixed(1)} 秒`;
  $('#crRows').innerHTML = [['最高速度', `×${Math.pow(1.2, Math.floor(t / 10)).toFixed(2)}`], ['錯開', `${R.ok} 個（完美 ${R.perfect}）`], ['最高連擊', `${R.maxCombo}`], ['點死', title ? `${title}` : '—']].map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('');
  $('#crReason').textContent = reason || ''; show('challengeResult');
}

// ================= 主迴圈、事件 =================
let last = 0;
function loop(ts) {
  const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
  if (R.alive) { step(dt); drawTags(); if (R.running && R.state !== 'normal' && R.state !== 'closed') { const k = Math.max(0, (R.stateUntil - R.t) / HOLD); $$('.cbtn').forEach(b => b.style.setProperty('--hold', b.dataset.act === R.state ? k : 0)); } else $$('.cbtn').forEach(b => b.style.setProperty('--hold', 0)); }
  W.frame(dt, R.alive && R.running ? VWALK * speedAt(R.t) : R.alive ? 0 : 0);
  requestAnimationFrame(loop);
}
function boot() {
  W.initWorld($('#world'));
  try { G.portraits = W.makePortraits(); for (const k of ['full', 'raincoat', 'taxi']) { PHOTO[k] = new Image(); PHOTO[k].src = G.portraits.you[k]; } exam('neutral'); } catch (e) { G.portraits = null; }
  $('#nameInput').value = store.get('name', '');
  const unlocked = store.get('unlocked', false); $('#introChallengeBtn').hidden = !unlocked;
  $('#startBtn').addEventListener('click', startWritten);
  $('#introChallengeBtn').addEventListener('click', () => startRoad('challenge'));
  $('#nextBtn').addEventListener('click', nextQ);
  $('#wrBtn').addEventListener('click', () => { sfx.tap(); if (G.written >= 4) { W.setMode('menu', 'intro'); show('roadIntro'); } else { G.stats = null; finishExam('written-fail'); } });
  $('#roadStartBtn').addEventListener('click', () => startRoad('test'));
  $('#retryBtn').addEventListener('click', () => { sfx.tap(); W.setMode('menu', 'intro'); $('#introChallengeBtn').hidden = !store.get('unlocked', false); show('intro'); });
  $('#challengeBtn').addEventListener('click', () => startRoad('challenge'));
  $('#taxiBtn').addEventListener('click', applyTaxi);
  $('#crAgain').addEventListener('click', () => startRoad('challenge'));
  $('#crBack').addEventListener('click', () => { sfx.tap(); if (G.grade) { W.setMode('menu', G.grade); show('result'); } else { W.setMode('menu', 'intro'); show('intro'); } });
  $$('.cbtn').forEach(b => b.addEventListener('pointerdown', ev => { ev.preventDefault(); act(b.dataset.act); }));
  window.addEventListener('keydown', ev => {
    if ($('#road').hidden) return; const k = ev.key;
    const a = (k === 'ArrowUp' || k === 'w' || k === 'W') ? 'up' : (k === 'ArrowLeft' || k === 'a' || k === 'A') ? 'downL' : (k === 'ArrowRight' || k === 'd' || k === 'D') ? 'downR' : (k === ' ' || k === 'ArrowDown' || k === 's' || k === 'S') ? 'close' : null;
    if (a) { ev.preventDefault(); if (!ev.repeat) act(a); }
  });
  document.body.classList.add('ready'); requestAnimationFrame(loop);
  window.__game = { R, G, act, W, kick: () => requestAnimationFrame(loop) };   // 測試用
}
boot();
