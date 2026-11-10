// toy.js — 由 What-if 影片（films/hk-umbrella）原封不動抄過嚟嘅積木：品牌「你」公仔、遮、舊樓、地磚、雨
// 品牌角色嘅頭、臉、頭髮唔好改（頻道 Logo）
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const rng = seed => { let s = seed | 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
export const F = '"Noto Sans TC", "NotoSansTC", sans-serif';
// ---------- 材質 ----------
export const vinyl = (color, rough = .42, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: .45, clearcoatRoughness: .3, ...extra });
export const matte = (color, rough = .85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
const SPH = new THREE.SphereGeometry(1, 48, 32);
export function mesh(parent, geo, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (o.s) m.scale.set(...o.s); if (o.r) m.rotation.set(...o.r);
  m.castShadow = o.cast !== false; m.receiveShadow = true; parent.add(m); return m;
}
export const ell = (parent, mat, p, s, o = {}) => mesh(parent, SPH, mat, p[0], p[1], p[2], { ...o, s });
export const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
export const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
export const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// 沿曲線掃出圓管（粗幼跟住 radii 變），兩頭封口 —— 用嚟砌頸、尾、腳
const SKIN = [0xf2c49b, 0xe0a97e, 0xc98b62, 0xf6d3b3];
// 品牌角色（使用者 2026-10-30：「now it is my brand logo」）：預設嘅頭、臉、頭髮同膚色 / 髮色就係頻道 Logo，唔好改；新片只換衫、道具、姿勢、身形大細
export function makePerson(o = {}) {
  const shirt = vinyl(o.shirt ?? 0xa9d4f5, .55), pants = vinyl(o.pants ?? 0x2e3440, .6), skin = vinyl(o.skin ?? SKIN[0], .5), hair = vinyl(o.hair ?? 0x2b1d14, .55),
    shoe = vinyl(0x1c1c1c, .35), BLACK = vinyl(0x111111, .15), WHITE = vinyl(0xffffff, .1, { emissive: 0xffffff, emissiveIntensity: .7 });
  const root = new THREE.Group(); root.scale.setScalar(o.scale ?? 1);
  const hips = group(root, 0, .78, 0);
  ell(hips, pants, [0, .02, 0], [.22, .14, .17]);
  const legs = [-1, 1].map(s => { const l = group(hips, s * .105, 0, 0); mesh(l, new THREE.CapsuleGeometry(.105, .48, 8, 16), pants, 0, -.36, 0); mesh(l, new RoundedBoxGeometry(.18, .12, .3, 3, .05), shoe, 0, -.73, .05); return l; });
  const torso = group(hips, 0, 0, 0);
  mesh(torso, new THREE.CapsuleGeometry(.235, .3, 10, 24), shirt, 0, .33, 0, { s: [1, 1, .84] });
  if (o.tie !== false) { mesh(torso, new THREE.BoxGeometry(.075, .3, .03), vinyl(o.tieColor ?? 0x223a6b, .4), 0, .36, .2, { r: [-.08, 0, 0] }); ell(torso, vinyl(o.tieColor ?? 0x223a6b, .4), [0, .53, .19], [.045, .04, .035]); }
  ell(torso, shirt, [0, .6, 0], [.16, .06, .14]);
  const head = group(torso, 0, .86, 0);
  ell(head, skin, [0, 0, 0], [.28, .27, .27]);
  for (const s of [-1, 1]) ell(head, skin, [s * .27, -.01, 0], [.05, .07, .045]);
  ell(head, skin, [0, -.03, .27], [.035, .03, .03]);
  const eyes = [-1, 1].map(s => { const e = group(head, s * .1, .02, .245); ell(e, BLACK, [0, 0, 0], [.038, .05, .022]); ell(e, WHITE, [.012, .018, .018], [.012, .012, .006], { cast: false }); return e; });
  const brows = [-1, 1].map(s => mesh(head, new THREE.CapsuleGeometry(.012, .06, 4, 8), hair, s * .1, .115, .24, { r: [0, 0, Math.PI / 2] }));
  const mouth = ell(head, vinyl(0x6b2b2b, .5), [0, -.12, .255], [.045, .014, .012], { cast: false });
  const hairStyle = o.hairStyle ?? 'short';
  mesh(head, new THREE.SphereGeometry(.295, 40, 20, 0, Math.PI * 2, 0, Math.PI * .52), hair, 0, .015, -.015, { r: [-.3, 0, 0] });
  if (hairStyle === 'short') for (const [x, z, r] of [[-.12, .17, .3], [0, .2, .1], [.12, .17, -.3]]) ell(head, hair, [x, .2, z], [.1, .07, .08], { r: [.5, r, 0] });
  if (hairStyle === 'bun') ell(head, hair, [0, .22, -.2], [.11, .11, .11]);
  if (hairStyle === 'long') mesh(head, new THREE.CapsuleGeometry(.24, .2, 8, 20), hair, 0, -.12, -.1, { s: [1.15, 1, .7] });
  const arms = [-1, 1].map(s => {
    const sh = group(torso, s * .225, .55, 0); ell(sh, shirt, [0, 0, 0], [.095, .095, .095]); mesh(sh, new THREE.CapsuleGeometry(.082, .18, 8, 16), shirt, 0, -.15, 0);
    const el = group(sh, 0, -.3, 0); ell(el, shirt, [0, 0, 0], [.08, .08, .08]); mesh(el, new THREE.CapsuleGeometry(.076, .16, 8, 16), shirt, 0, -.12, 0);
    const hand = group(el, 0, -.29, 0); ell(hand, skin, [0, 0, 0], [.088, .092, .082]); return { sh, el, hand, s };
  });
  return { root, hips, torso, head, eyes, brows, mouth, legs, arms };
}
// arms: [[肩前後, 肩開合, 手肘], [右]]；前後負數 = 向前舉
export function posePerson(P, o = {}) {
  const { x = 0, y = 0, z = 0, yaw = 0, arms = [[0, 0, 0], [0, 0, 0]], headYaw = 0, headPitch = 0, headRoll = 0, lean = 0, eyes = 1, look = [0, 0], hop = 0, squash = 0, brow = 0, walk = null, kneel = 0, sit = 0 } = o;
  const sw = walk == null ? 0 : Math.sin(walk), bob = walk == null ? 0 : Math.abs(Math.cos(walk)) * .035;
  P.root.position.set(x, y + hop + bob - kneel * .3 - sit * .3, z); P.root.rotation.set(0, yaw, 0); P.root.scale.y = (P.root.scale.x) * (1 - squash);
  P.legs.forEach((l, i) => { l.rotation.x = (i ? -sw : sw) * .5 - kneel * (i ? 1.5 : .2) - sit * 1.45; });
  P.torso.rotation.x = lean; P.head.rotation.set(headPitch, headYaw, headRoll);
  P.arms.forEach((A, i) => { const [f, ab, el] = arms[i]; A.sh.rotation.set(f + (i ? sw : -sw) * .4, 0, A.s * ab); A.el.rotation.set(el, 0, 0); });
  P.eyes.forEach(e => { e.scale.set(eyes, eyes, 1); e.position.x = Math.sign(e.position.x) * .1 + look[0] * .02; e.position.y = .02 + look[1] * .02; });
  P.brows.forEach(b => { b.position.y = .115 + brow * .03; });
}
export function makePhone(parent, glow = true) {
  const p = group(parent, 0, .05, .06);
  mesh(p, new RoundedBoxGeometry(.085, .165, .014, 3, .006), vinyl(0x22252b, .3));
  mesh(p, new THREE.PlaneGeometry(.074, .15), new THREE.MeshBasicMaterial({ color: glow ? 0xd9ecff : 0x111111, toneMapped: true }), 0, 0, .0075, { cast: false });
  return p;
}

export function makeCar(color = 0xd8262f, taxi = true) {
  const root = new THREE.Group(), BODY = vinyl(color, .35), TOP = vinyl(taxi ? 0xe9e6dc : color, .35), GLASS = vinyl(0x23303a, .1), DARK = vinyl(0x1b1b1b, .6);
  mesh(root, new RoundedBoxGeometry(4.4, .8, 1.8, 4, .28), BODY, 0, .72, 0);
  mesh(root, new RoundedBoxGeometry(2.4, .75, 1.6, 4, .3), TOP, -.25, 1.38, 0);
  mesh(root, new RoundedBoxGeometry(2.25, .55, 1.64, 3, .2), GLASS, -.25, 1.38, 0);
  if (taxi) { mesh(root, new RoundedBoxGeometry(.5, .18, .3, 2, .06), vinyl(0xfff3c4, .3, { emissive: 0xffe9a0, emissiveIntensity: .3 }), -.2, 1.85, 0); }
  for (const x of [-1.4, 1.4]) for (const z of [-.85, .85]) mesh(root, new THREE.CylinderGeometry(.36, .36, .26, 20), DARK, x, .36, z, { r: [Math.PI / 2, 0, 0] });
  return { root };
}

// ---------- 德輔道中街景（路沿 x 軸；叮叮路軌喺中間）----------
const lerp = (a, b, t) => a + (b - a) * t;
export function pTex() { const c = canvas(128, 128), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#c8102e'; x.lineWidth = 6; x.stroke(); x.fillStyle = '#c8102e'; x.font = `900 92px ${F}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('P', 64, 70); return tex(c); }
const PT = pTex();
export function makeUmbrella(parent, { type = 'long', color = 0x2e6fd8, color2 = null, R = .55, P = false } = {}) {
  const U = group(parent), shaftL = type === 'fold' ? .62 : type === 'golf' ? 1.05 : .88, METAL = vinyl(0x8a8e94, .3, { metalness: .5 });
  mesh(U, new THREE.CylinderGeometry(.012, .012, shaftL, 8), METAL, 0, shaftL / 2, 0);
  if (type === 'fold') mesh(U, new RoundedBoxGeometry(.05, .15, .05, 2, .02), vinyl(0x22252b, .5), 0, -.03, 0);
  else { mesh(U, new THREE.CylinderGeometry(.02, .02, .14, 10), vinyl(0x5a3a26, .5), 0, -.02, 0); mesh(U, new THREE.TorusGeometry(.055, .018, 8, 18, Math.PI), vinyl(0x5a3a26, .5), .055, -.09, 0, { r: [0, 0, Math.PI] }); }
  const C = group(U, 0, shaftL, 0), prof = [[.004, .26], [.3, .23], [.6, .13], [.85, -.01], [1, -.13]].map(([r, y]) => new THREE.Vector2(r * R, y * R));
  const FAB = vinyl(color, .5, { side: THREE.DoubleSide });
  const can = mesh(C, new THREE.LatheGeometry(prof, 8), FAB, 0, 0, 0);
  if (color2 != null) { const g2 = new THREE.LatheGeometry(prof, 8), col = []; const pos = g2.attributes.position; for (let i = 0; i < pos.count; i++) { const a = Math.atan2(pos.getZ(i), pos.getX(i)), k = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8 + .5) % 2; const c = new THREE.Color(k ? color : color2); col.push(c.r, c.g, c.b); } g2.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); can.geometry = g2; can.material = vinyl(0xffffff, .5, { side: THREE.DoubleSide, vertexColors: true }); }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); const pts = prof.map(v => V3(v.x * c, v.y - .006, v.x * s)); mesh(C, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, .006, 4), METAL, 0, 0, 0, { cast: false }); ell(C, vinyl(0x22252b, .4), [R * c, -.13 * R, R * s], [.012, .012, .012], { cast: false }); }
  mesh(C, new THREE.CylinderGeometry(.008, .014, .07, 8), vinyl(0x22252b, .4), 0, .26 * R + .03, 0);
  if (type === 'golf') { const top = group(C, 0, .2 * R, 0); mesh(top, new THREE.LatheGeometry(prof.map(v => new THREE.Vector2(v.x * .42, v.y * .42 + .02)), 8), FAB, 0, 0, 0); can.material = can.material.clone(); }
  if (P) { const S = group(C, 0, .175 * R, .45 * R); S.rotation.x = -1.2; mesh(S, new THREE.CircleGeometry(.11 * R / .55, 24), new THREE.MeshStandardMaterial({ map: PT, roughness: .5, polygonOffset: true, polygonOffsetFactor: -2 }), 0, 0, .004, { cast: false }); }
  U.userData = { C, shaftL, R, open: u => { const k = Math.max(0, Math.min(1, u)); C.scale.set(lerp(.1, 1, k), lerp(3.6, 1, k), lerp(.1, 1, k)); C.position.y = shaftL + lerp(.05, 0, k); } };
  U.userData.open(1); return U;
}

export function makeRain(scene, n = 1600, w = 16, h = 9, d = 16) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.008, .38, .008), new THREE.MeshBasicMaterial({ color: 0xd4dde6, transparent: true, opacity: .32, depthWrite: false }), n), dm = new THREE.Object3D(), r = rng(9);
  const P = [...Array(n)].map(() => [r(), r(), r(), .85 + r() * .3]); scene.add(im); im.frustumCulled = false;
  const POS = P.map(() => V3(0, 0, 0));
  const update = (t, c) => { P.forEach(([a, b, e, s], i) => { const y = h - ((t * 8.5 * s + b * h) % h); dm.position.set(c.x + (a - .5) * w + y * .04, c.y + y - 1, c.z + (e - .5) * d); POS[i].copy(dm.position); dm.rotation.z = .04; dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }); im.instanceMatrix.needsUpdate = true; };
  const clear = cp => { let n = 0; POS.forEach((p, i) => { if (p.distanceTo(cp) < 1.6) { dm.position.set(p.x, -200, p.z); dm.rotation.z = 0; dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); n++; } }); if (n) im.instanceMatrix.needsUpdate = true; };
  const shelter = list => { let n = 0; POS.forEach((p, i) => { for (const [cx, cz, R, y] of list) if (p.y < y && Math.hypot(p.x - cx, p.z - cz) < R) { dm.position.set(p.x, -200, p.z); dm.rotation.z = 0; dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); n++; break; } }); if (n) im.instanceMatrix.needsUpdate = true; };   // 遮底下冇雨
  const shelterBox = list => { let n = 0; POS.forEach((p, i) => { for (const [x0, x1, z0, z1, y] of list) if (p.y < y && p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1) { dm.position.set(p.x, -200, p.z); dm.rotation.z = 0; dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); n++; break; } }); if (n) im.instanceMatrix.needsUpdate = true; };
  return { im, update, clear, shelter, shelterBox };
}
export const hex = c => '#' + new THREE.Color(c).getHexString();

// ---------- 共用：舊樓外牆（窗、窗框、水漬）----------
const FACADE = {};
export function facadeTex(color, v = 0, lit = 0) {
  const key = color + '_' + v + '_' + lit; if (FACADE[key]) return FACADE[key];
  const c = canvas(128, 128), x = c.getContext('2d'), r = rng(color % 997 + v * 31), col = new THREE.Color(color);
  x.fillStyle = hex(color); x.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 7; k++) { const px = r() * 128, gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(0,0,0,.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(px, r() * 60, 3 + r() * 8, 60 + r() * 60); }   // 水漬
  for (let k = 0; k < 500; k++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${r() * .05})`; x.fillRect(r() * 128, r() * 128, 2, 2); }
  x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 60, 128, 4); x.fillRect(0, 124, 128, 4);   // 樓層線
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const wx = 10 + i * 64, wy = 12 + j * 64; x.fillStyle = '#e9e5dc'; x.fillRect(wx - 3, wy - 3, 50, 42);
    const on = r() < lit; x.fillStyle = on ? '#ffd79a' : (r() < .5 ? '#334252' : '#46586a'); x.fillRect(wx, wy, 44, 36);
    if (!on && r() < .4) { x.fillStyle = ['#c9b48a', '#9fb4c2', '#d8a0a0'][Math.floor(r() * 3)]; x.fillRect(wx, wy, 44 * (.3 + r() * .5), 36); }   // 窗簾
    x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(wx + 2, wy + 2, 10, 32); x.fillStyle = '#d9d4ca'; x.fillRect(wx + 21, wy, 3, 36); x.fillRect(wx - 4, wy + 37, 52, 4);
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; FACADE[key] = t; return t;
}
export const facadeMat = (color, rx, ry, v = 0, lit = 0) => { const t = facadeTex(color, v, lit).clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return matte(0xffffff, .88, { map: t }); };
export function tower(p, x, z, w, d, h, color, seed = 1, o = {}) {   // w = x 方向闊、d = z 方向深
  const G = group(p, x, 0, z), r = rng(seed), roof = matte(0x8d8a84, .9);
  const fx = facadeMat(color, Math.max(1, Math.round(d / (o.bay || 4.8))), Math.max(1, Math.round(h / (o.fl || 6))), seed % 3, o.lit || 0);
  const fz = facadeMat(color, Math.max(1, Math.round(w / (o.bay || 4.8))), Math.max(1, Math.round(h / (o.fl || 6))), (seed + 1) % 3, o.lit || 0);
  mesh(G, new THREE.BoxGeometry(w, h, d), [fx, fx, roof, roof, fz, fz], 0, h / 2, 0);
  if (!o.noRoof) { mesh(G, new THREE.BoxGeometry(w * .3, h * .04 + .4, d * .25), vinyl(0xd9d6cf, .6), (r() - .5) * w * .4, h + h * .02 + .2, (r() - .5) * d * .4); mesh(G, new THREE.CylinderGeometry(w * .08, w * .08, h * .05 + .3, 12), vinyl(0x6f8fa8, .5), (r() - .5) * w * .5, h + h * .025 + .15, (r() - .5) * d * .5); }
  return G;
}
export const PAINT = [0xd8c8a8, 0xc9d3c4, 0xe3c9b8, 0xb9c9d6, 0xe6dcc0, 0xd4b8b8, 0xc4c8d8, 0xe8e2d4, 0xbfd0c0, 0xe0cfa8];
export function surfTex(color, { tile = 64, grout = .18, seed = 1, plank = false } = {}) {   // 有磚縫 / 木紋、斑駁、污漬嘅表面
  const c = canvas(256, 256), x = c.getContext('2d'), r = rng(seed), base = new THREE.Color(color);
  const tw = plank ? 256 : tile, th = plank ? 32 : tile;
  for (let j = 0; j < 256; j += th) for (let i = plank ? -r() * 128 : 0; i < 256; i += tw) { const k = .88 + r() * .16; x.fillStyle = `rgb(${base.r * 255 * k | 0},${base.g * 255 * k | 0},${base.b * 255 * k | 0})`; x.fillRect(i, j, tw, th); x.strokeStyle = `rgba(0,0,0,${grout})`; x.lineWidth = 2; x.strokeRect(i, j, tw, th); }
  for (let k = 0; k < 1200; k++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${r() * .05})`; x.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * (plank ? 1 : 3)); }
  for (let k = 0; k < 7; k++) { const cx = r() * 256, cy = r() * 256, g2 = x.createRadialGradient(cx, cy, 0, cx, cy, 30 + r() * 50); g2.addColorStop(0, 'rgba(0,0,0,.07)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, 256, 256); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function makeTrolley() {   // 手推車：鐵線籃 + 轆
  const T = new THREE.Group(), M = vinyl(0xb8c0c8, .25, { metalness: .5 }), R = vinyl(0xc8102e, .5);
  for (const x of [-.3, .3]) for (const z of [-.45, .45]) { mesh(T, new THREE.CylinderGeometry(.06, .06, .04, 12), vinyl(0x222222, .5), x, .06, z, { r: [0, 0, Math.PI / 2] }); mesh(T, new THREE.CylinderGeometry(.012, .012, .45, 6), M, x, .3, z); }
  const basket = group(T, 0, .75, 0); for (let k = 0; k < 7; k++) { mesh(basket, new THREE.BoxGeometry(.66, .012, .012), M, 0, -.25 + k * .085, -.5); mesh(basket, new THREE.BoxGeometry(.66, .012, .012), M, 0, -.25 + k * .085, .5); mesh(basket, new THREE.BoxGeometry(.012, .012, 1.0), M, -.33, -.25 + k * .085, 0); mesh(basket, new THREE.BoxGeometry(.012, .012, 1.0), M, .33, -.25 + k * .085, 0); }
  for (let k = 0; k < 9; k++) { mesh(basket, new THREE.BoxGeometry(.012, .52, .012), M, -.33, 0, -.5 + k * .125); mesh(basket, new THREE.BoxGeometry(.012, .52, .012), M, .33, 0, -.5 + k * .125); }
  mesh(basket, new THREE.BoxGeometry(.66, .012, 1.0), M, 0, -.25, 0); mesh(T, new THREE.CylinderGeometry(.025, .025, .72, 10), R, 0, 1.1, .62, { r: [0, 0, Math.PI / 2] });
  return T;
}

