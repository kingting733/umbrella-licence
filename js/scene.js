// scene.js — 3D 玩具世界（What-if 頻道風格）：落雨嘅行人路（循環）、迎面行人、你把遮（第一人稱）、
// 頭頂招牌 / 騎樓、選單畫面嘅「你」公仔、牌照相同考官頭像
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { V3, rng, vinyl, matte, mesh, ell, group, canvas, tex, hex, F, makePerson, posePerson, makePhone, makeCar, makeUmbrella, makeRain, tower, PAINT, surfTex, makeTrolley } from './toy.js?v=11';

export const INK = '#16181d', RED = '#e23b3b', GOLD = '#ffc94a', GREEN = '#3aa36b', BLUE = '#2e6fd8', ORANGE = '#f08a24';

let renderer, scene, camera, sun, rain;
const SEG = 10, NSEG = 9, EYE = 1.45;
const W = { mode: 'menu', menuKind: 'intro', t: 0, dist: 0, segs: [], cars: [], pool: {}, hazPool: [], covered: false, umb: { state: 'normal', k: {} } };
export const world = W;

// ---------- 招牌、舖面貼圖（同影片一樣）----------
const SIGNTXT = ['茶餐廳', '押', '電器', '麵家', '涼茶', '五金', '冰室', '藥房', '時裝', '眼鏡', '燒臘', '金行', '士多', '鐘錶', '粥品', '海味'];
const SIGNCOL = [['#c8102e', '#ffd43b'], ['#f7f3e8', '#c8102e'], ['#1f4fa8', '#ffffff'], ['#1d7a4a', '#fff4c2'], ['#ffd43b', '#16181d'], ['#7a1fa8', '#ffe8ff'], ['#16181d', '#ffb347']];
function signTexH(text, k, w = 512, h = 200) {
  const [bg, fg] = SIGNCOL[k % SIGNCOL.length], c = canvas(w, h), x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  x.strokeStyle = fg; x.globalAlpha = .55; x.lineWidth = 6; x.strokeRect(14, 14, w - 28, h - 28); x.globalAlpha = 1;
  const size = Math.min(h * .62, (w - 60) / Math.max(1, text.length)); x.font = `900 ${size}px ${F}`; x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + size * .04);
  return tex(c);
}
function signTexV(text, k) {
  const [bg, fg] = SIGNCOL[k % SIGNCOL.length], c = canvas(160, 512), x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 160, 512);
  x.strokeStyle = fg; x.globalAlpha = .55; x.lineWidth = 5; x.strokeRect(10, 10, 140, 492); x.globalAlpha = 1;
  const n = text.length, size = Math.min(120, 440 / n); x.font = `900 ${size}px ${F}`; x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  [...text].forEach((ch, i) => x.fillText(ch, 80, 256 + (i - (n - 1) / 2) * size * 1.05));
  return tex(c);
}
function shopTex(seed) {
  const c = canvas(256, 128), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = '#2a2724'; x.fillRect(0, 0, 256, 128);
  if (r() < .3) { for (let j = 0; j < 128; j += 6) { x.fillStyle = j % 12 ? '#a9adb3' : '#8d9198'; x.fillRect(0, j, 256, 5); } x.fillStyle = '#2a2724'; x.fillRect(0, 70 + r() * 40, 256, 128); }
  x.fillStyle = 'rgba(255,226,170,.16)'; x.fillRect(0, 0, 256, 128);
  for (let j = 0; j < 3; j++) { const y = 46 + j * 26; x.fillStyle = '#5a4a3a'; x.fillRect(8, y + 18, 240, 3); for (let i = 10; i < 246;) { const w = 6 + r() * 10, h = 8 + r() * 9; x.fillStyle = hex([0xc8574a, 0xd9b24a, 0x5f9a6a, 0x4a76b8, 0xe8e2d4, 0xc98a6a][Math.floor(r() * 6)]); x.fillRect(i, y + 18 - h, w, h); i += w + 1; } }
  x.fillStyle = '#3a3430'; x.fillRect(150, 100, 90, 28); x.fillStyle = '#6a5a4a'; x.fillRect(150, 100, 90, 4);
  return tex(c);
}
function stripeTex(cols, n = 6) { const c = canvas(128, 64), x = c.getContext('2d'); for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect(i * 128 / n, 0, 128 / n + 1, 64); } return tex(c); }

// ---------- 一段街（10 米）：右邊舖頭 + 舊樓 + 伸出嚟嘅直招牌，左邊馬路 + 對面樓 ----------
let SWT, RDT;
function buildSegment(k) {
  const G = group(scene, 0, 0, 0), r = rng(300 + k * 37);
  mesh(G, new THREE.BoxGeometry(6.7, .16, SEG), matte(0xffffff, .45, { map: SWT }), .95, .08, -SEG / 2);
  mesh(G, new THREE.BoxGeometry(.24, .2, SEG), vinyl(0x8a8a86, .6), -2.45, .1, -SEG / 2);
  mesh(G, new THREE.PlaneGeometry(8, SEG), matte(0xffffff, .3, { map: RDT }), -6.5, .01, -SEG / 2, { r: [-Math.PI / 2, 0, 0], cast: false });
  mesh(G, new THREE.BoxGeometry(.14, .012, 2.8), vinyl(0xe9e6dc, .5), -6.4, .02, -SEG / 2, { cast: false });
  for (const dx of [0, .2]) mesh(G, new THREE.BoxGeometry(.1, .012, SEG), vinyl(0xf2c14e, .5), -2.85 - dx, .02, -SEG / 2, { cast: false });
  if (r() < .5) mesh(G, new THREE.CircleGeometry(1, 24), new THREE.MeshPhysicalMaterial({ color: 0x2f353c, roughness: .04, clearcoat: 1, metalness: .2, polygonOffset: true, polygonOffsetFactor: -1 }), -1 + r() * 4, .165, -2 - r() * 6, { r: [-Math.PI / 2, 0, 0], s: [.5 + r() * .7, .3 + r() * .4, 1], cast: false });
  // 右邊舖面
  const sh = mesh(G, new THREE.PlaneGeometry(SEG - .6, 3.3), matte(0xffffff, .8, { map: shopTex(k * 7 + 3), emissive: 0xffe0b0, emissiveIntensity: .15 }), 4.28, 1.8, -SEG / 2, { cast: false }); sh.rotation.y = -Math.PI / 2;
  mesh(G, new THREE.BoxGeometry(.4, 3.7, .4), matte(0xd9d0c0, .8), 4.15, 1.85, -.2);
  mesh(G, new THREE.BoxGeometry(1.4, .12, SEG - .3), vinyl(0xcfcac0, .6), 3.65, 3.6, -SEG / 2);
  const col = PAINT[Math.floor(r() * PAINT.length)], h = 16 + r() * 12;
  const up = tower(G, 9.3, -SEG / 2, 10, SEG - .1, h, col, 500 + k * 13, { bay: 3.4, noRoof: true }); up.position.y = 3.7;
  for (let a = 0; a < 3; a++) if (r() < .7) mesh(G, new RoundedBoxGeometry(.7, .45, .55, 2, .05), vinyl(0xe8e6e0, .6), 4.05, 5 + a * 3.2 + r(), -1.5 - r() * 7);   // 冷氣機
  // 直招牌（伸出行人路上面，好高，唔會撞到）
  for (let s = 0; s < 2; s++) if (r() < .8) {
    const z = -2 - s * 5 - r() * 1.5, txt = SIGNTXT[Math.floor(r() * SIGNTXT.length)], kk = Math.floor(r() * 7), t = signTexV(txt, kk), hh = 2.4 + r() * .8, y = 4.9 + r() * 2.2, x = 3.4 - r() * 1.2;
    const m = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .25, roughness: .6, side: THREE.DoubleSide });
    const b = mesh(G, new THREE.BoxGeometry(.08, hh, .8), [matte(0x333333), matte(0x333333), matte(0x333333), matte(0x333333), m, m], x, y, z, { cast: false }); b.rotation.y = Math.PI / 2;
    mesh(G, new THREE.BoxGeometry(4.2 - x, .05, .05), vinyl(0x55585e, .4), (4.2 + x) / 2, y + hh / 2 + .05, z, { cast: false });
  }
  // 對面樓
  tower(G, -14.5, -SEG / 2, 8, SEG - .1, 18 + r() * 12, PAINT[Math.floor(r() * PAINT.length)], 700 + k * 11, { bay: 3.4 });
  mesh(G, new THREE.BoxGeometry(2.0, .14, SEG - .3), vinyl(0xcfcac0, .6), -9.9, 3.4, -SEG / 2);
  if (k % 2 === 0) { mesh(G, new THREE.CylinderGeometry(.06, .07, 5.4, 10), vinyl(0x4a5058, .5), -2.25, 2.7, -3); mesh(G, new RoundedBoxGeometry(.9, .14, .3, 2, .05), vinyl(0x4a5058, .5), -1.85, 5.4, -3); }
  G.userData.base = -k * SEG; return G;
}

// ---------- 迎面嚟嘅人（每款兩個，輪住用）----------
const TYPES = {
  popo: { o: { shirt: 0x9b6bd1, pants: 0x4a4036, skin: 0xe0a97e, hair: 0xbdbdbd, hairStyle: 'bun', tie: false }, cm: 155, U: { type: 'fold', color: 0xd86a9a, R: .46 } },
  kid: { o: { shirt: 0xf4f4f0, pants: 0x2a3a6a, skin: 0xf6d3b3, hair: 0x1a1a1a, hairStyle: 'long', tie: false }, cm: 132, U: { type: 'fold', color: 0xdfe9f2, R: .4 }, clear: true },
  flyer: { o: { shirt: 0xe57373, pants: 0x3b4a66, skin: 0xd9a07a, hair: 0x5a4a3a, hairStyle: 'long', tie: false }, cm: 160, U: { type: 'fold', color: 0x3a8db0, R: .45 } },
  ol: { o: { shirt: 0x3b4a66, pants: 0x2e3440, skin: 0xf6d3b3, hair: 0x1a1a1a, hairStyle: 'bun', tie: false }, cm: 167, U: { type: 'long', color: 0x22252b, R: .52 } },
  phone: { o: { shirt: 0x7a8088, pants: 0x3b4a66, skin: 0xc98b62, hair: 0x8a6a3a, hairStyle: 'short', tie: false }, cm: 171, U: { type: 'long', color: 0x1d6a4a, R: .5 } },
  rider: { o: { shirt: 0x3b4a57, pants: 0x2e3440, skin: 0xe0a97e, hair: 0x1a1a1a, hairStyle: 'bun', tie: false }, cm: 175, U: { type: 'long', color: 0x7a4a2a, R: .5 } },
  muscle: { o: { shirt: 0xf2f2f2, pants: 0x2e3440, skin: 0xb07850, hair: 0x1a1a1a, hairStyle: 'short', tie: false }, cm: 185, U: { type: 'fold', color: 0xe8b94a, R: .3 } },
  tourist: { o: { shirt: 0x3a8db0, pants: 0xc9b48a, skin: 0xf6d3b3, hair: 0xd9b24a, hairStyle: 'short', tie: false }, cm: 188, U: { type: 'long', color: 0x6b3fa0, R: .55 } },
  baller: { o: { shirt: 0xc8102e, pants: 0x16181d, skin: 0x8a5a3a, hair: 0x1a1a1a, hairStyle: 'short', tie: false }, cm: 198, U: { type: 'long', color: 0x2e6fd8, color2: 0xf2efe6, R: .58 } },
};
const HOLD_ARM = [-.75, .12, -1.15];
function buildNPC(type) {
  const T = TYPES[type], P = makePerson(T.o); scene.add(P.root); P.root.visible = false; P.scale0 = T.cm / 194; P.root.scale.setScalar(P.scale0);
  const extra = group(P.root);
  if (type === 'popo') { const tr = makeTrolley(); tr.scale.setScalar(.72); extra.add(tr); tr.position.set(.55, 0, .45); const bag = mesh(tr, new RoundedBoxGeometry(.6, .5, .9, 2, .06), matte(0xffffff, .6, { map: stripeTex(['#c8102e', '#f4f4f0', '#1f4fa8', '#f4f4f0'], 8) }), 0, 1.0, 0); bag.castShadow = true; }
  if (type === 'kid') mesh(P.torso, new RoundedBoxGeometry(.38, .42, .2, 3, .06), vinyl(0xf2c230, .5), 0, .35, -.24);
  if (type === 'flyer') mesh(P.arms[0].hand, new THREE.BoxGeometry(.2, .28, .01), matte(0xffffff, .7), 0, -.02, .1, { cast: false });
  if (type === 'phone') makePhone(P.arms[0].hand, true);
  if (type === 'rider') { mesh(P.head, new THREE.SphereGeometry(.32, 32, 16, 0, Math.PI * 2, 0, Math.PI * .55), vinyl(0xf08a24, .3), 0, .03, -.01); mesh(P.torso, new RoundedBoxGeometry(.55, .55, .42, 3, .06), vinyl(0xe8742a, .5), 0, .45, -.42); }
  if (type === 'muscle') { P.torso.scale.set(1.45, 1, 1.2); mesh(P.head, new RoundedBoxGeometry(.3, .07, .04, 2, .02), vinyl(0x111111, .1), 0, .03, .26, { cast: false }); }
  if (type === 'tourist') { mesh(P.head, new THREE.CylinderGeometry(.45, .45, .03, 32), vinyl(0xe6dcc0, .7), 0, .2, 0); mesh(P.head, new THREE.CylinderGeometry(.24, .28, .16, 32), vinyl(0xe6dcc0, .7), 0, .28, 0); const cs = mesh(extra, new RoundedBoxGeometry(.42, .62, .25, 3, .05), vinyl(0x2e6fd8, .4), .62, .42, .1); mesh(cs, new THREE.CylinderGeometry(.015, .015, .5, 8), vinyl(0x8a8e94, .3), 0, .55, 0); }
  if (type === 'baller') mesh(P.head, new THREE.TorusGeometry(.28, .025, 8, 32), vinyl(0xffffff, .5), 0, .1, 0, { r: [Math.PI / 2 - .25, 0, 0] });
  const U = makeUmbrella(scene, T.U); U.visible = false;
  if (T.clear) U.userData.C.traverse(o => { if (o.isMesh && o.material && o.material.color) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .45; } });
  return { P, U, extra, type, cm: T.cm, busy: false };
}
const tmpV = V3(0, 0, 0);
function placeNPC(n, x, z, walk) {
  const P = n.P; P.root.visible = true; n.U.visible = true;
  posePerson(P, { x, y: .16, z, yaw: 0, walk, arms: [[-.25, .1, -.25], HOLD_ARM] }); P.root.scale.setScalar(n.P.scale0);
  n.extra.scale.x = x < 0 ? -1 : 1;   // 喼 / 購物車擺喺外邊，唔好擋住中間條路
  if (n.type === 'phone') P.arms[0].sh.rotation.x = -1.1, P.arms[0].el.rotation.x = -.9, P.head.rotation.x = .35;
  if (n.type === 'flyer') P.arms[0].sh.rotation.x = -1.3;
  P.arms[1].sh.rotation.x = HOLD_ARM[0]; P.root.updateMatrixWorld(true); P.arms[1].hand.getWorldPosition(tmpV);
  n.U.position.set(x + (tmpV.x - x) * .35, tmpV.y - .04, tmpV.z); n.U.rotation.set(0, 0, 0); n.U.userData.open(1);
}
export function npcSpawn(type) { const list = W.pool[type]; let n = list.find(q => !q.busy); if (!n) { n = buildNPC(type); list.push(n); } n.busy = true; return n; }
export function npcPlace(n, side, z, walk) { placeNPC(n, side * .85, z, walk); }
export function npcRelease(n) { n.busy = false; n.P.root.visible = false; n.U.visible = false; }
export function npcScreen(n) { // 標籤位置：遮頂上面少少
  n.U.userData.C.getWorldPosition(tmpV); tmpV.y += .55; const v = tmpV.clone().project(camera);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, ok: v.z < 1 && v.z > -1 };
}

// ---------- 頭頂招牌 / 騎樓 ----------
const SHOPNAMES = ['金龍冰室', '福壽押', '好運燒臘', '永發藥房', '大華電器', '新記粥麵', '和興五金', '利昌海味'];
// len = 瓦遮頭由招牌（z=0）向後伸幾多米；行過嘅時間 = len / 行速
const AWNING = [['#c8102e', '#f4f4f0'], ['#1d7a4a', '#f4f4f0'], ['#1f4fa8', '#f4f4f0'], ['#e8742a', '#fff4c2']];
export function hazardSpawn(style, len = 4) {
  const G = group(scene), name = SHOPNAMES[Math.floor(Math.random() * SHOPNAMES.length)], k = Math.floor(Math.random() * 7);
  const t = signTexH(name, k, 1024, 200), face = new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .35, roughness: .5 }), side = matte(0x2a2a2a, .6);
  if (style === 'arcade') {   // 騎樓：成段有樓喺頭頂
    mesh(G, new THREE.BoxGeometry(6.9, .3, len), matte(0xcfc6b6, .9), .95, 2.35, -len / 2, { cast: true });
    mesh(G, new THREE.BoxGeometry(6.9, .55, .14), [side, side, side, side, face, side], .95, 2.0, 0);
    const cols = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= cols; i++) mesh(G, new THREE.BoxGeometry(.38, 2.3, .38), matte(0xd9d0c0, .8), -2.2, 1.15, -len * i / cols);
    mesh(G, new THREE.BoxGeometry(6.9, 5, len), matte(0xd8c8a8, .9), .95, 5.0, -len / 2, { cast: false });
  } else {   // 招牌 + 後面一大塊帆布簷篷
    mesh(G, new THREE.BoxGeometry(5.8, .55, .14), [side, side, side, side, face, face], .7, 2.05, 0);
    for (const x of [-1.6, 3.2]) mesh(G, new THREE.CylinderGeometry(.025, .025, 1.9, 8), vinyl(0x55585e, .4), x, 3.25, 0, { cast: false });
    mesh(G, new THREE.BoxGeometry(5.0, .08, .08), vinyl(0x55585e, .4), .8, 4.2, 0, { cast: false });
    const aw = stripeTex(AWNING[Math.floor(Math.random() * AWNING.length)], 8); aw.repeat.set(1, 1);
    const canvasMat = matte(0xffffff, .85, { map: aw, side: THREE.DoubleSide });
    mesh(G, new THREE.BoxGeometry(6.6, .05, len), canvasMat, .95, 2.55, -len / 2, { cast: true });
    for (const z of [-len * .33, -len * .66, -len]) mesh(G, new THREE.BoxGeometry(6.6, .04, .04), vinyl(0x55585e, .4), .95, 2.5, z, { cast: false });
  }
  return { G, name, style, len };
}
export function hazardPlace(h, z) { h.G.position.z = z; }
export function hazardRelease(h) { scene.remove(h.G); h.G.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } }); }
export function setCovered(c) { W.covered = c; }

// ---------- 你把遮（掛喺鏡頭度）----------
// p = 手柄（鏡頭座標），遮面中心 = 手柄 + 轉咗嘅 (0, .88, 0)；前邊遮骨要留喺畫面頂，玩家先睇到把遮點郁
const UPOSE = {
// 遮柄喺鏡頭後面少少（睇唔到支柄），平時淨係畫面頂見到一條遮邊（約 10%）
  normal: { p: [.243, -.495, .042], r: [-.11, 0, .28], open: 1 },
  up: { p: [.243, -.415, .012], r: [-.11, 0, .28], open: 1 },
  downL: { p: [.323, -.537, -.028], r: [-.11, 0, .45], open: 1 },   // 遮邊斜落左邊
  downR: { p: [-.323, -.537, -.028], r: [-.11, 0, -.45], open: 1 },
  closed: { p: [.36, -.82, -.5], r: [-.25, 0, .1], open: 0 },
};
export function setUmbrella(state) { W.umb.state = state; }
export const UMB_POSES = UPOSE;   // 測試時調位用

// ---------- 選單畫面：站喺街度嘅「你」----------
let YOU, YOU_U, YOU_CARD;
export function setMode(mode, kind) { W.mode = mode; if (kind) W.menuKind = kind; const road = mode === 'road'; YOU.root.visible = !road; YOU_U.visible = !road && W.menuKind !== 'raincoat'; MY_U.visible = road; YOU_CARD.visible = !road && (W.menuKind === 'full' || W.menuKind === 'partial'); }

let MY_U;
export function initWorld(cv) {
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95; renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x9aa5ae); scene.fog = new THREE.Fog(0x9aa5ae, 16, 62);
  camera = new THREE.PerspectiveCamera(64, 1, .03, 160); scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xdcefff, 0xa98863, 1.25));
  sun = new THREE.DirectionalLight(0xfff0d8, 1.9); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0005; sun.shadow.normalBias = .03;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); scene.add(sun, sun.target);
  SWT = surfTex(0xb0a898, { tile: 64, grout: .3, seed: 3 }); SWT.repeat.set(5, 8);
  RDT = surfTex(0x2f3236, { tile: 128, grout: .02, seed: 6 }); RDT.repeat.set(2, 2.5);
  for (let k = 0; k < NSEG; k++) W.segs.push(buildSegment(k));
  for (let k = 0; k < 3; k++) { const c = makeCar([0xd8262f, 0x2f8a52, 0xd8262f][k], true); scene.add(c.root); c.root.rotation.y = Math.PI / 2; c.x = k === 1 ? -7.6 : -4.6; c.z = -60 + k * 30; c.v = k === 1 ? -6 : 7; W.cars.push(c); }
  rain = makeRain(scene, 1100, 12, 8, 22);
  for (const t of Object.keys(TYPES)) W.pool[t] = [buildNPC(t), buildNPC(t)];
  // 你（品牌公仔，選單用）
  YOU = makePerson({ shirt: 0xa9d4f5, tieColor: 0x223a6b }); scene.add(YOU.root);
  YOU_U = makeUmbrella(scene, { type: 'long', color: 0xc8102e, color2: 0xf2efe6, R: .6 });
  YOU_CARD = group(scene); mesh(YOU_CARD, new RoundedBoxGeometry(.42, .27, .012, 2, .01), matte(0xffffff, .5), 0, 0, 0); mesh(YOU_CARD, new THREE.BoxGeometry(.42, .06, .014), matte(0x3aa36b, .5), 0, .105, 0);
  MY_U = makeUmbrella(camera, { type: 'long', color: 0xc8102e, color2: 0xf2efe6, R: .5 });
  MY_U.traverse(o => { if (o.isMesh) o.castShadow = false; });
  const under = new THREE.PointLight(0xfff4e6, 1.0, 2.2, 2); under.position.set(0, -.25, -.3); camera.add(under);   // 照亮遮底，唔會變一嚿啡色
  const k = UPOSE.normal; W.umb.k = { p: V3(...k.p), r: V3(...k.r), open: 1 };
  setMode('menu', 'intro'); resize(); window.addEventListener('resize', resize);
}
export function resize() { const w = renderer.domElement.clientWidth || window.innerWidth, h = renderer.domElement.clientHeight || window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }

// ---------- 每格 ----------
export function roadReset() { W.dist = 0; W.covered = false; W.umb.state = 'normal'; Object.values(W.pool).flat().forEach(npcRelease); }
export function frame(dt, speed = 1.5) {
  W.t += dt; const t = W.t;
  if (W.mode === 'road') W.dist += dt * speed; else W.dist += dt * .35;
  const span = SEG * NSEG; W.segs.forEach(G => { let z = G.userData.base + (W.dist % span); if (z > SEG + 2) z -= span; G.position.z = z; });
  W.cars.forEach(c => { c.z += c.v * dt + (W.mode === 'road' ? speed * dt : 0); if (c.z > 25) c.z = -70; if (c.z < -75) c.z = 20; c.root.position.set(c.x, 0, c.z); c.root.rotation.y = c.v > 0 ? -Math.PI / 2 : Math.PI / 2; });
  if (W.mode === 'road') {
    camera.position.set(0, EYE + Math.abs(Math.sin(t * 5.2 * Math.min(2, speed / 1.5))) * .02, 0); camera.rotation.set(-.1, 0, 0);
    const tgt = UPOSE[W.umb.state], K = W.umb.k, a = Math.min(1, dt * 16);
    K.p.lerp(V3(...tgt.p), a); K.r.lerp(V3(...tgt.r), a); K.open += (tgt.open - K.open) * Math.min(1, dt * 18);
    MY_U.position.copy(K.p); MY_U.rotation.set(K.r.x, K.r.y, K.r.z); MY_U.userData.open(K.open);
  } else menuCamera(t);
  sun.position.set(camera.position.x + 6, 14, camera.position.z + 8); sun.target.position.set(camera.position.x, 0, camera.position.z - 4);
  rain.update(t, V3(camera.position.x, 0, camera.position.z - 6));
  if (W.mode === 'road') { if (W.covered) rain.shelterBox([[-2.5, 4.4, -12, 2, 2.4]]); else if (W.umb.state !== 'closed') rain.shelter([[0, -.35, .75, 1.95]]); }
  else rain.shelter([[0, -3, .7, 2.2]]);
  renderer.render(scene, camera);
}
function menuCamera(t) {
  const kind = W.menuKind, P = YOU; P.root.visible = true;
  const breathe = Math.sin(t * 1.6) * .01;
  let arms = [[-.2, .1, -.2], HOLD_ARM], eyes = 1, brow = 0, headYaw = Math.sin(t * .6) * .15, headPitch = 0;
  if (kind === 'written') { arms = [[-.9, .15, -1.3], HOLD_ARM]; headPitch = .15; brow = .3; }
  if (kind === 'full' || kind === 'partial') { arms = [[-1.0, .25, -1.0], HOLD_ARM]; eyes = 1.1; brow = .5; }
  if (kind === 'raincoat') { arms = [[-.1, .2, -.2], [-.1, .2, -.2]]; eyes = .85; brow = -.6; headPitch = .15; }
  posePerson(P, { x: 0, y: .16 + breathe, z: -3, yaw: 0, arms, eyes, brow, headYaw, headPitch });
  P.arms[1].sh.rotation.x = arms[1][0]; P.root.updateMatrixWorld(true); P.arms[1].hand.getWorldPosition(tmpV);
  YOU_U.position.set(tmpV.x * .4, tmpV.y - .04, tmpV.z); YOU_U.rotation.set(0, 0, 0); YOU_U.userData.open(1);
  if (YOU_CARD.visible) { P.arms[0].hand.getWorldPosition(tmpV); YOU_CARD.position.set(tmpV.x + .05, tmpV.y + .16, tmpV.z + .12); YOU_CARD.rotation.set(-.15, -.25, 0); }
  const sx = Math.sin(t * .2) * .25;
  if (camera.aspect > 1.15) { camera.position.set(1.15 + sx, 1.35, .6); camera.lookAt(1.15, 1.25, -3); return; }   // 闊屏：公仔企左邊，表格喺右邊
  const far = camera.aspect < .8 ? 4.4 : 3.2;   // 直向手機要退後啲，成個公仔先入鏡
  camera.position.set(.15 + sx, 1.3, -3 + far); camera.lookAt(0, 1.0, -3);
}

// ---------- 頭像：考官 4 個表情、「你」嘅牌照相 ----------
export function makePortraits() {
  const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true }); R.setSize(384, 384, false); R.setPixelRatio(1);
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.outputColorSpace = THREE.SRGBColorSpace;
  const S = new THREE.Scene(); S.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 1.6)); const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(1.5, 3, 4); S.add(d);
  const cam = new THREE.PerspectiveCamera(28, 1, .05, 20);
  const out = { examiner: {}, you: {} };
  // 考官黃 Sir：灰髮、眼鏡、白恤衫
  const E = makePerson({ shirt: 0xf4f4f0, tieColor: 0x8a1f2a, hair: 0x8a8580, skin: 0xe0a97e, hairStyle: 'bun' }); S.add(E.root);
  for (const s of [-1, 1]) mesh(E.head, new THREE.TorusGeometry(.065, .012, 8, 24), vinyl(0x222222, .3), s * .1, .02, .27, { cast: false });
  mesh(E.head, new THREE.BoxGeometry(.08, .012, .012), vinyl(0x222222, .3), 0, .03, .275, { cast: false });
  cam.position.set(0, 1.66, 1.35); cam.lookAt(0, 1.6, 0);
  const moods = { neutral: { eyes: 1, brow: 0, m: [.045, .014] }, nod: { eyes: .55, brow: .4, m: [.06, .02], headPitch: .12 }, frown: { eyes: .85, brow: -.9, m: [.03, .012] }, shock: { eyes: 1.45, brow: 1.2, m: [.035, .04] } };
  for (const [k, o] of Object.entries(moods)) { posePerson(E, { eyes: o.eyes, brow: o.brow, headPitch: o.headPitch || 0, arms: [[0, .05, 0], [0, .05, 0]] }); E.mouth.scale.set(o.m[0], o.m[1], .012); R.render(S, cam); out.examiner[k] = R.domElement.toDataURL('image/png'); }
  S.remove(E.root);
  // 「你」牌照相
  const looks = { full: { shirt: 0xa9d4f5, tieColor: 0x223a6b }, partial: { shirt: 0xa9d4f5, tieColor: 0x223a6b }, raincoat: { shirt: 0xffd43b, tie: false }, taxi: { shirt: 0x2e7d5a, tie: false } };
  cam.position.set(0, 1.58, 1.75); cam.lookAt(0, 1.52, 0);
  for (const [k, o] of Object.entries(looks)) {
    const P = makePerson(o); S.add(P.root); posePerson(P, { arms: [[0, .08, 0], [0, .08, 0]], eyes: k === 'raincoat' ? .85 : 1.05, brow: k === 'raincoat' ? -.6 : .2 });
    if (k === 'raincoat') { const hood = mesh(P.head, new THREE.SphereGeometry(.355, 40, 20, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0, Math.PI * .7), vinyl(0xffd43b, .35, { side: THREE.DoubleSide }), 0, .01, -.02); hood.castShadow = false; }   // 帽前面開口，品牌塊面要露出嚟
    if (k === 'taxi') mesh(P.head, new THREE.TorusGeometry(.285, .03, 8, 32), vinyl(0x2e7d5a, .5), 0, .1, 0, { r: [Math.PI / 2 - .2, 0, 0] });
    R.setClearColor(0x000000, 0); R.render(S, cam); out.you[k] = R.domElement.toDataURL('image/png'); S.remove(P.root);
  }
  R.dispose(); return out;
}
