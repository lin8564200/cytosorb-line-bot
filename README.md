# CytoSorb 藥物交互作用 LINE 機器人

使用者在 LINE 輸入藥名 → 機器人自動查表回覆「移除程度 / 是否需調劑量 / 分類」。
**收錄 72 種藥物，全部自動回覆，不需在 LINE 後台逐筆建關鍵字。**

## 重點：以後新增/修改藥物
只要編輯 `cytosorb_drugs.json` 裡的 `drugs` 陣列，加一列就好，程式不用改。

## 使用方式（給醫師/藥師）
- 直接輸入藥名（英文，可只打前幾個字母，如 `vanco`）
- 輸入「清單」→ 列出全部收錄藥物

## 部署步驟（約 10 分鐘）

### 1. LINE 後台設定
到 LINE Developers Console → 你的 Messaging API channel：
- 取得 **Channel access token** 和 **Channel secret**
- 把「自動回應訊息」關掉、「Webhook」打開

### 2. 上傳到 GitHub
把這個資料夾推到一個 GitHub repo。

### 3. 部署（擇一，都有免費方案）
**Render（最簡單）**
1. render.com → New → Web Service → 連你的 repo
2. Build command: `npm install`
3. Start command: `npm start`
4. Environment 加兩個變數：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
5. 部署完會給你一個網址，例如 `https://xxx.onrender.com`

### 4. 回填 Webhook URL
回 LINE 後台，Webhook URL 填：
`https://xxx.onrender.com/webhook`
按 Verify 測試 → 成功就完成。

## 本機測試
```bash
npm install
LINE_CHANNEL_ACCESS_TOKEN=xxx LINE_CHANNEL_SECRET=yyy npm start
```

## 免責
回覆內容附帶免責聲明：最終劑量監測與調整由開立處方醫師決定。
資料來源：CytoSorb Drug Removal Table B1550R01ENG2026 / Scheier J et al. Crit Care Explor 2022.
