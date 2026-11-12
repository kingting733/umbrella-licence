import { telemetry } from './telemetry.mjs?v=17';
export const GAME_LINK = 'https://www.whatifhk.com/umbrella-licence/';
export function browserInfo(ua = '', platform = '', touchPoints = 0) {
  return { instagram: /Instagram/i.test(ua), android: /Android/i.test(ua), ios: /iPhone|iPad|iPod/i.test(ua) || (platform === 'MacIntel' && touchPoints > 1) };
}
export function chromeIntent(url = GAME_LINK) {
  const link = new URL(url);
  if (link.origin !== new URL(GAME_LINK).origin || link.protocol !== 'https:') throw Error('Unsupported browser destination');
  const fallback = new URL(GAME_LINK); fallback.searchParams.set('browserHelp', 'android');
  return `intent://${link.host}${link.pathname}${link.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallback.href)};end`;
}
let dialog, details, primary, hint, context, info;
export function showBrowserHelp({ source = 'intro', platform } = {}) {
  if (!dialog) return;
  const android = platform ? platform === 'android' : info.android;
  const name = android ? 'Chrome' : info.ios || platform === 'ios' ? 'Safari' : '瀏覽器';
  document.getElementById('browserName').textContent = name;
  primary.textContent = android ? '用 Chrome 開啟 ↗' : `用 ${name} 開啟 · 睇方法 ↗`;
  primary.dataset.destination = android ? chromeIntent() : '';
  details.hidden = true; primary.setAttribute('aria-expanded', 'false');
  context.textContent = source === 'share' ? '遊戲連結唔會帶走今次成績。請先放大張圖長按儲存，或者截圖，再轉瀏覽器。' : '用獨立瀏覽器開，儲圖、分享同下次再玩都順啲。Instagram 內嘅紀錄未必會保留。';
  document.getElementById('browserContinue').textContent = source === 'share' ? '返去儲存成績圖' : info.instagram ? '留喺 Instagram 試玩' : '繼續試玩';
  hint.textContent = '';
  if (!dialog.open) { telemetry.emit('browser_prompt_shown',{source,platform:android?'android':info.ios?'ios':'other'}); dialog.showModal(); }
}
function setupBrowserHelp() {
  dialog = document.getElementById('browserDialog'); if (!dialog) return;
  info = browserInfo(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  details = document.getElementById('browserSteps'); primary = document.getElementById('browserOpen'); hint = document.getElementById('browserStatus'); context = document.getElementById('browserContext');
  primary.onclick = e => {
    telemetry.emit('browser_external_selected',{platform:info.android?'android':info.ios?'ios':'other'});
    details.hidden = false; primary.setAttribute('aria-expanded', 'true');
    hint.textContent = '選單名稱可能因手機版本而不同；搵唔到就複製連結，再貼去瀏覽器。';
    details.scrollIntoView({ block: 'nearest' });
    if (primary.dataset.destination) location.href = primary.dataset.destination;
  };
  const dismiss = () => { telemetry.emit('browser_continue'); try { sessionStorage.setItem('umbrella.browserPromptDismissed', '1'); } catch {} dialog.close(); };
  document.getElementById('browserContinue').onclick = dismiss;
  document.getElementById('browserClose').onclick = dismiss;
  dialog.addEventListener('cancel', () => { try { sessionStorage.setItem('umbrella.browserPromptDismissed', '1'); } catch {} });
  document.getElementById('browserCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(GAME_LINK); hint.textContent = '已複製。開 Safari／Chrome，貼上連結就玩得。'; }
    catch { const field = document.getElementById('browserLink'); field.focus(); field.select(); hint.textContent = '請長按上面連結複製，再貼去 Safari／Chrome。'; }
  };
  const requested = new URLSearchParams(location.search).get('browserHelp');
  let dismissed = false; try { dismissed = sessionStorage.getItem('umbrella.browserPromptDismissed') === '1'; } catch {}
  if (requested !== null || (info.instagram && !dismissed)) showBrowserHelp({ platform: ['ios', 'android'].includes(requested) ? requested : undefined });
}
if (typeof document !== 'undefined') setupBrowserHelp();
