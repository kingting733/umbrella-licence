// board.js — 挑戰模式排行榜（Supabase：public.submit_score / public.get_leaderboard 兩個 RPC，個表前端讀唔到）
// 呢條 publishable key 本身就係公開畀網頁用；權限全部喺資料庫嘅 function 度控制。
const API = 'https://yuerjttvmpqecdhlzypt.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_uzXp_4QRjQp5kDSyEBxDzg_SNFf8LU1';

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
// 每部裝置一個隨機 ID（唔關個人資料事），排行榜每部裝置只留最好成績
let PID = null;
export function playerId() {
  if (PID) return PID;
  try { PID = localStorage.getItem('umbrella.player'); if (!PID) { PID = uuid(); localStorage.setItem('umbrella.player', PID); } } catch (e) { PID = PID || uuid(); }
  return PID;
}

async function rpc(fn, body) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(API + fn, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ac.signal });
    if (!r.ok) throw new Error(fn + ' ' + r.status);
    return await r.json();
  } finally { clearTimeout(tm); }
}

export const submitScore = (name, seconds) => rpc('submit_score', { p_player: playerId(), p_name: String(name).slice(0, 12), p_seconds: Math.min(300, Math.round(seconds * 10) / 10) });
export const getBoard = () => rpc('get_leaderboard', { p_player: playerId() });
// 而家幾多人同時考緊牌：每 25 秒報到一次（public.ping_online），50 秒內報過到就算在線；離開 / 切走分頁就即刻除名
export const pingOnline = mode => rpc('ping_online', { p_player: playerId(), p_mode: mode });   // { total, exam, challenge }
export function leaveOnline() {
  try { fetch(API + 'leave_online', { method: 'POST', keepalive: true, headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_player: playerId() }) }).catch(() => {}); } catch (e) { /* 算 */ }
}   // { top: [{rank,name,seconds,me}], me: {rank,name,seconds} | null, total }
