import test from 'node:test';
import assert from 'node:assert/strict';
import { browserInfo, chromeIntent, GAME_LINK } from '../js/browser.mjs';
test('Instagram detection distinguishes iOS, Android and ordinary Safari', () => {
  assert.deepEqual(browserInfo('iPhone Instagram 356'), { instagram:true, android:false, ios:true });
  assert.deepEqual(browserInfo('Linux; Android 14 Instagram 356'), { instagram:true, android:true, ios:false });
  assert.equal(browserInfo('iPhone Safari/604.1').instagram, false);
  assert.equal(browserInfo('Safari', 'MacIntel', 5).ios, true);
});
test('Chrome handoff is restricted to the game origin with a help fallback', () => {
  const intent=chromeIntent();
  assert.ok(intent.startsWith('intent://www.whatifhk.com/umbrella-licence/#Intent;scheme=https;package=com.android.chrome;'));
  assert.ok(intent.includes(encodeURIComponent(GAME_LINK+'?browserHelp=android')));
  assert.throws(()=>chromeIntent('https://example.com/'));
  assert.throws(()=>chromeIntent('javascript:alert(1)'));
});
