"""make_loops.py — 將 ElevenLabs 生成嘅 30 秒音樂（audio/src/*.mp3）剪成無縫循環（audio/*.mp3）
做法：估拍子 → 喺「跳過開頭 intro / 結尾淡出」嘅範圍入面，搵相隔整數小節、前後聲音最似嘅兩點做循環頭尾
      → 尾段 15ms 交叉淡化接返去頭 → 檔案 = [循環尾 0.3 秒] + 循環 + [循環頭 0.3 秒]，遊戲用 loopStart/loopEnd 播（避開 mp3 前後補白）
      → 響度統一 -16 LUFS → 112k mp3。每首嘅循環點寫入 audio/loops.json
用法：python audio/make_loops.py road=road_v2b menu=menu_v1 quiz=quiz_v1"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__)); SR = 44100; PAD = .3; XF = .015

def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()

def feats(mono, hop=512, n=2048):
    win = np.hanning(n); frames = np.lib.stride_tricks.sliding_window_view(mono, n)[::hop] * win
    mag = np.abs(np.fft.rfft(frames, axis=1)); fb = np.log1p(mag[:, :400])        # 0–8.6 kHz
    flux = np.maximum(0, np.diff(fb, axis=0)).sum(1); flux = np.concatenate([[0], flux])
    return fb, flux, hop / SR

def tempo(flux, dt):
    f = flux - flux.mean(); ac = np.correlate(f, f, 'full')[len(f) - 1:]
    lags = np.arange(len(ac)) * dt; ok = (lags > 60 / 190) & (lags < 60 / 70)
    best = np.argmax(ac * ok); return lags[best]

def find_loop(x):
    mono = x.mean(1); fb, flux, dt = feats(mono); beat = tempo(flux, dt); bar = beat * 4
    dur = len(mono) / SR; lo, hi = 2.6, dur - 2.6; best = None
    W = int(1.0 / dt)                                                        # 用分界點前後各 1 秒嘅頻譜比較
    f = flux - flux.mean(); ac = np.correlate(f, f, 'full')[len(f) - 1:]
    for k in range(int((hi - lo) / bar), max(1, int((hi - lo) / bar) - 3), -1):
        # 拍子估算有 ±1.5% 誤差，十幾小節會差成 0.2 秒：用「成段循環長度」嗰個自相關峰（±4%）再拋物線內插，攞準確長度
        c0 = int(k * bar / dt); r = max(2, int(c0 * .04)); j = c0 - r + int(np.argmax(ac[c0 - r:c0 + r + 1]))
        y0, y1, y2 = ac[j - 1], ac[j], ac[j + 1]; den = y0 - 2 * y1 + y2
        L = (j + (.5 * (y0 - y2) / den if den else 0)) * dt
        if L > hi - lo: continue
        for s in np.arange(lo, hi - L, dt):
            a, b = int(s / dt), int((s + L) / dt)
            if a - W < 0 or b + W >= len(fb): continue
            A, B = fb[a - W:a + W].ravel(), fb[b - W:b + W].ravel()
            c = np.dot(A - A.mean(), B - B.mean()) / (np.std(A) * np.std(B) * len(A))
            score = c + .004 * k                                             # 同樣似就揀長啲
            if best is None or score > best[0]: best = (score, s, L, c, k)
    _, s, L, c, k = best
    # 細調：喺 ±12ms 入面用波形交叉相關對準循環尾
    i0, n = int(s * SR), int(L * SR); r = int(.012 * SR); seg = mono[i0:i0 + 2048]
    cand = [np.dot(seg, mono[i0 + n + d:i0 + n + d + 2048]) for d in range(-r, r + 1)]
    n += int(np.argmax(cand)) - r
    return i0, n, beat, c, k

def build(x, i0, n):
    loop = x[i0:i0 + n].copy(); m = int(XF * SR); w = np.linspace(0, 1, m)[:, None]
    loop[-m:] = loop[-m:] * (1 - w) + x[i0 - m:i0] * w                       # 尾段淡入「循環頭之前」，接返去頭就順
    p = int(PAD * SR)
    return np.concatenate([loop[-p:], loop, loop[:p]])

def lufs(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float([l for l in out.split('\n') if 'I:' in l][-1].split()[1])

meta = {}
jp = os.path.join(HERE, 'loops.json')
if os.path.exists(jp): meta = json.load(open(jp))
for arg in sys.argv[1:]:
    name, src = arg.split('=')
    x = load(os.path.join(HERE, 'src', src + '.mp3'))
    i0, n, beat, c, k = find_loop(x)
    y = build(x, i0, n); tmp = os.path.join(HERE, f'_{name}.wav'); sf.write(tmp, y, SR)
    g = 10 ** ((-16 - lufs(tmp)) / 20); y *= g; pk = np.abs(y).max()
    if pk > .89: y *= .89 / pk
    sf.write(tmp, y, SR)
    out = os.path.join(HERE, name + '.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-c:a', 'libmp3lame', '-b:a', '112k', out], check=True); os.remove(tmp)
    meta[name] = {'src': src, 'start': PAD, 'end': round(PAD + n / SR, 5), 'bpm': round(60 / beat, 1), 'bars': k}
    print(f'{name}: {src} 由 {i0 / SR:.2f}s 起 {k} 小節 {n / SR:.2f}s，{60 / beat:.1f} BPM，接口相似度 {c:.3f}，{os.path.getsize(out) // 1024} KB')
json.dump(meta, open(jp, 'w'), indent=1)
