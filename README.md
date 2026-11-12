# 擔遮考牌

如果香港擔遮要考牌？一個 What-if 風格嘅 3D 玩具網頁遊戲。

**玩：** https://kingting733.github.io/umbrella-licence/

## 玩法

1. **① 筆試**：27 題題庫隨機抽 5 題，每題 15 秒，答啱 4 題先可以考路試。
2. **② 路試**：第一人稱行 60 秒，迎面嘅人大約每 3 秒一個，喺你左邊或者右邊行過；人行到差唔多面前（擦身前大約 1.5 秒）先撳，撳完把遮維持 1.6 秒。路試前可以揀**練習**（約 1 分鐘）：藍牌 → 橙牌左 / 右 → 白牌 → 瓦遮頭逐課教，到要撳嘅時候停低、亮住要撳嘅掣，個牌閃「撳！」教時機；最後自己試 5 個（冇「撳！」提示，同正式路試一樣），唔計分。正式路試同挑戰模式都冇「撳！」。
   - 藍牌（矮過你）→【舉高】
   - 橙牌（高過你）→ 壓低去佢嘅另一邊：佢喺左邊嚟撳【壓低 →】，右邊嚟撳【壓低 ←】
   - 白牌（差唔多高）→ 舉高，或者壓低去佢嘅另一邊
   - 頭頂有招牌（連簷篷）或者騎樓 → 見到警告就【緊急收遮】；瓦遮頭底下行 3–5 秒，唔使避人；行出嚟再撳掣開返
   - 犯錯 3 次肥佬；插中阿婆即時肥佬；冇瓦遮頭收遮超過 2 秒當淋濕
3. **③ 領牌**：雨衣令、第 1 類縮骨遮，或者全類別（筆試 5/5 加路試零犯錯）；全類別仲可以申請「Uber Umbrella」司機證。
4. **④ 挑戰模式**：考完路試（合格定唔合格都得）就解鎖，每 10 秒迎面嘅人快 20%，撞一次就完，記錄最長生存時間。完咗會上載成績，顯示全球排行榜 TOP 20 同你排第幾（每部裝置只留最好成績）。三個玩法：**普通**（×1 起步）、**觀塘收工模式（難）**（×1.25 起步、多啲小學生；小學生 2 倍速狂奔、外賣仔 1.5 倍飛車、阿婆 0.8 倍而且會突然停一停再行、低頭族高過你（182cm 橙牌）而且行到面前突然轉線、派傳單姐姐企定唔郁；狂奔小學生間中突然掉頭跑走再衝返嚟、一隊 3 個小學生貼住行（撳一下舉高要包得晒）、拖手情侶一左一右（唔可以壓低，要舉高）、遊客停低舉自拍棍影相、籃球隊長突然蹲低綁鞋帶（橙牌變藍牌，要改撳舉高）；特別動作按距離觸發（離你幾米），加速之後都喺眼前發生；標籤會寫「狂奔／飛車／停低／轉線／企定／掉頭／一隊 ×3／唔可以壓低／影相／蹲低」；快嘅人後面嗰個一定行另一邊，唔會疊埋），同 **行人路炸彈**（反轉玩：用觀塘收工嘅一套——×1.25 起步、狂奔小學生、一隊小學生、低頭族轉線等——但要撞中每一個人：淨係得【← 壓低】【壓低 →】兩個掣，唔理高矮，佢喺邊邊行就撳嗰邊，拖手情侶兩邊都中；冇阿婆、冇招牌；放生一個就完；頭 10 秒標籤寫埋撳咩）。普通同觀塘收工各有一個排行榜；行人路炸彈暫時只記自己最佳（`BOARD_MODES`，資料庫開咗 `scores_boom` 先加入）。

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
| `js/board.js` | 挑戰模式排行榜：Supabase 專案 `umbrella-licence` 嘅 `submit_score` / `get_leaderboard` 兩個 RPC（`p_mode: 'hard'` = 觀塘收工模式，用 `scores_hard` 表；兩個表前端都讀唔到）；「而家幾多人同時考緊牌」：每部裝置每 25 秒 call `ping_online`（50 秒內報過到就算在線，切走分頁 / 離開即 `leave_online`），`online` 表前端一樣讀唔到 |
| `js/audio.js` | 聲音：背景音樂播 `audio/*.mp3`（未載入 / 失敗就用合成音樂頂住；挑戰模式每加速一級播快 5%）、音效、雨聲（Web Audio 即時合成）。左上角聲音掣：全開 → 冇背景音樂 → 靜音 |
| `audio/` | 背景音樂：`menu` / `quiz` / `road.mp3`，用 ElevenLabs Music 生成（原檔喺 `audio/src/`），`make_loops.py` 自動搵循環點剪成無縫循環、統一 −16 LUFS，循環點記喺 `loops.json`（改咗要同步 `audio.js` 嘅 `FILES`） |

純靜態網頁，three.js 由 jsDelivr 載入，唔使 build。本機試玩：喺呢個資料夾開任何靜態伺服器（例如 `npx serve`）。

純屬虛構：遮政署、《擔遮條例》同所有舖名都係作出嚟。

## Production website and CI/CD

This repository is the source of truth for the game, including result sharing,
live street backgrounds, and the optional `WhatIfVisitor` analytics hooks.
Production: https://www.whatifhk.com/umbrella-licence/

之後只需要喺呢個 repo 改遊戲，再 push／merge 到 `main`；毋須再抄檔案去網站 repo。
去 **Actions → Check game and deploy website** 睇發佈進度。
GitHub Pages 係另一個獨立發佈，唔代表 whatifhk.com 已更新；請睇上述 workflow。

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

## Instagram browser help

Instagram visitors see a once-per-tab paper-card nudge to open an external
browser, with a quieter option to continue playing. Android uses a user-initiated
Chrome intent with an instructions fallback. iOS shows the Instagram menu steps
and a copyable game link; a website cannot force Instagram to open Safari.
`?browserHelp=ios` or `?browserHelp=android` opens the same help on demand.

Sharing includes a full-screen image for long-press saving or screenshots, plus
separate game-link sharing and copying. Download clicks are attempts, not proof
of a saved photo. Switching browsers does not transfer the current result or
visitor cookie; the share-time help asks players to save their result first.
Real Instagram iPhone/Android behavior still needs physical-device validation.

## Independent gameplay analytics

`js/telemetry.mjs` dispatches `whatif:game` browser events. The website's GA
adapter listens to this event bus independently of `WhatIfVisitor` and the
Oracle/MongoDB upload queue. No GA key, player name or internal visitor ID is
stored here. Standalone copies of the game work without an analytics listener.

The lifecycle covers game start/retry, written/road/challenge level start/end,
question correctness/timeouts, tutorial begin/complete/skip, terminal exam or
challenge results, licence achievement, survival score, result viewing and sharing.
Results are emitted at the end of play before the delayed result-card animation.
`game_finished` includes both success and failure; `license_earned` requires a
passed road test. `post_score.score` is challenge survival time in seconds.
`difficulty` distinguishes normal and hard challenge runs.

Foreground time in an unfinished attempt triggers `game_engaged` at 10 seconds
and `game_progress` once at 30/60/120/300 seconds. Hidden or unfocused tabs do not
accumulate this time. This includes reading questions, practice and waiting
between stages; it is not a measurement of button presses. `game_abandoned` on a
non-cached page exit is best effort, not guaranteed when mobile apps are killed.
Retries are per mode/difficulty within the current page load, not lifetime counts.

Share events distinguish opening a dialog, requesting an image download, copying
links/captions, native share completion/cancellation, and opening Threads. A
`share_image_saved` event only proves a download was requested; neither it nor a
native share callback proves an Instagram/Threads post was published.
