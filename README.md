# 擔遮考牌

如果香港擔遮要考牌？一個 What-if 風格嘅 3D 玩具網頁遊戲。

**玩：** https://kingting733.github.io/umbrella-licence/

## 玩法

1. **① 筆試**：27 題題庫隨機抽 5 題，每題 15 秒，答啱 4 題先可以考路試。
2. **② 路試**：第一人稱行 60 秒，迎面嘅人大約每 3 秒一個，喺你左邊或者右邊行過；個牌閃「撳！」（擦身前 1.45 秒）先撳，撳完把遮維持 1.6 秒。路試前可以揀**練習**（約 1 分鐘）：藍牌 → 橙牌左 / 右 → 白牌 → 瓦遮頭逐課教，到要撳嘅時候停低、亮住要撳嘅掣；最後自己試 5 個，唔計分。
   - 藍牌（矮過你）→【舉高】
   - 橙牌（高過你）→ 壓低去佢嘅另一邊：佢喺左邊嚟撳【壓低 →】，右邊嚟撳【壓低 ←】
   - 白牌（差唔多高）→ 舉高，或者壓低去佢嘅另一邊
   - 頭頂有招牌（連簷篷）或者騎樓 → 見到警告就【緊急收遮】；瓦遮頭底下行 3–5 秒，唔使避人；行出嚟再撳掣開返
   - 犯錯 3 次肥佬；插中阿婆即時肥佬；冇瓦遮頭收遮超過 2 秒當淋濕
3. **③ 領牌**：雨衣令、第 1 類縮骨遮，或者全類別（筆試 5/5 加路試零犯錯）；全類別仲可以申請「Uber Umbrella」司機證。
4. **④ 挑戰模式**：合格之後解鎖，每 10 秒迎面嘅人快 20%，撞一次就完，記錄最長生存時間。完咗會上載成績，顯示全球排行榜 TOP 20 同你排第幾（每部裝置只留最好成績）。

電腦用方向鍵 ← ↑ → 同空白鍵。

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `index.html` | 所有畫面 |
| `css/style.css` | What-if 風格：黑色膠囊標籤、粗體白字黑邊、紙本試卷 |
| `js/toy.js` | 由 What-if 影片抄過嚟嘅積木：品牌「你」公仔、遮、舊樓、地磚、雨 |
| `js/scene.js` | 3D 街景、迎面行人、第一人稱把遮、頭頂招牌、牌照相 |
| `js/game.js` | 流程、判定、計分、挑戰模式、牌照卡 |
| `js/questions.js` | 筆試題庫同路牌圖 |
| `js/board.js` | 挑戰模式排行榜：Supabase 專案 `umbrella-licence` 嘅 `submit_score` / `get_leaderboard` 兩個 RPC（`scores` 表前端讀唔到） |
| `js/audio.js` | 聲音：背景音樂播 `audio/*.mp3`（未載入 / 失敗就用合成音樂頂住；挑戰模式每加速一級播快 5%）、音效、雨聲（Web Audio 即時合成）。左上角聲音掣：全開 → 冇背景音樂 → 靜音 |
| `audio/` | 背景音樂：`menu` / `quiz` / `road.mp3`，用 ElevenLabs Music 生成（原檔喺 `audio/src/`），`make_loops.py` 自動搵循環點剪成無縫循環、統一 −16 LUFS，循環點記喺 `loops.json`（改咗要同步 `audio.js` 嘅 `FILES`） |

純靜態網頁，three.js 由 jsDelivr 載入，唔使 build。本機試玩：喺呢個資料夾開任何靜態伺服器（例如 `npx serve`）。

純屬虛構：遮政署、《擔遮條例》同所有舖名都係作出嚟。

## Production website and CI/CD

This repository is the source of truth for the game, including result sharing,
live street backgrounds, and the optional `WhatIfVisitor` analytics hooks.
Production: https://www.whatifhk.com/umbrella-licence/

- Work on a branch and open a PR: GitHub Actions checks JavaScript syntax,
  local imports, HTML controls, required music files and sharing helpers.
- Push or merge to `main`: the same checks run, then the workflow calls the
  `WHATIFHK_DEPLOY_HOOK` repository secret to rebuild the existing What If HK
  Vercel project. Never put the hook URL in source or logs.
- The website build fetches this public repository's current `main`, builds it,
  and publishes `dist/` at `/umbrella-licence/`. No manual copy or sync commit
  is needed. Checks run again inside Vercel; a failed build does not publish.
- The workflow waits for `/umbrella-licence/release.json` to show its commit,
  so green means that version was observed live, not only that a request was sent.
- GitHub Pages continues to work from the repository's static source. Tracking
  loads only on whatifhk.com; sharing and gameplay also work on GitHub Pages.

Local: Node 22+, `npm test` or `npm run build` (no dependencies to install).
`dist/` contains only runtime assets. Asset query versions are generated from
the content during production builds, so editing code needs no version bump.
Website services, MongoDB and mail credentials stay in the private website
project; this repository does not need those credentials.

To roll back the game, revert the game commit on `main`; the workflow republishes
the reverted source. For website changes use `satori-casper/whatifhk-site`.
