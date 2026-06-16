// CytoSorb 藥物交互作用 LINE 機器人
// 使用者輸入藥名 → 自動查表回覆，不需在後台逐筆建關鍵字
const express = require("express");
const line = require("@line/bot-sdk");
const drugsDB = require("./cytosorb_drugs.json");

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
const client = new line.Client(config);

// ---- 建立查表索引（藥名小寫去空白 → 藥物資料）----
function norm(s) {
  return s.toLowerCase().replace(/[\s\-/]/g, "");
}
const index = {};
for (const drug of drugsDB.drugs) {
  index[norm(drug.name)] = drug;
  // 商品名/別名也能查到（如 Cravit → Levofloxacin）
  if (Array.isArray(drug.aliases)) {
    for (const a of drug.aliases) index[norm(a)] = drug;
  }
}

// ---- 各分級的回補建議 ----
const DOSE_RULE = {
  significant_invivo: {
    desc: "CytoSorb 顯著吸附（in-vivo, >25% 清除或 >30% 移除）",
    action: "👉 建議 stat 回補 1 個 dose",
    footer: "※ 最終劑量由開立醫師決定，建議併行 TDM",
  },
  significant_invitro: {
    desc: "CytoSorb 顯著吸附（in-vitro, >30% 移除）",
    action: "👉 建議 stat 回補 0.5 個 dose",
    footer: "※ 最終劑量由開立醫師決定，建議併行 TDM",
  },
  insignificant_invivo: {
    desc: "CytoSorb 吸附不顯著（<25%/<30%）",
    action: "👉 不需額外回補",
    footer: "※ 最終劑量由開立醫師決定",
  },
  insignificant_invitro: {
    desc: "CytoSorb 吸附不顯著（<30%）",
    action: "👉 不需額外回補",
    footer: "※ 最終劑量由開立醫師決定",
  },
};

// ---- 組回覆訊息 ----
function buildReply(drug) {
  // 理化推估藥（無原廠實測數據）走降級表述，不給 dose
  if (drug.level === "theoretical" && drug.estimate) {
    const e = drug.estimate;
    return (
      `💊 ${drug.name}\n` +
      `⚠️ 此藥無 CytoSorb 原廠實測數據，以下為理化性質「理論推估」，非實證結果\n` +
      `\n推估依據：\n` +
      `・分子量：${e.mw}\n` +
      `・親脂性 logP：${e.logp}\n` +
      `・分布體積 Vd：${e.vd}\n` +
      (e.binding ? `・蛋白結合率：${e.binding}\n` : "") +
      `\n👉 理論傾向：${e.tendency}\n` +
      `\n⚠️ ${e.caveat}\n` +
      `務必併行 TDM／臨床監測，由開立醫師判斷。\n` +
      `（參數來源：${e.source}，僅供參考，需藥師核對）`
    );
  }
  const r = DOSE_RULE[drug.level];
  const tags = [];
  if (drug.animal_data) tags.push("⚠️ 動物數據");
  if (drug.plasma_only) tags.push("⚠️ 僅血漿濃度數據，建議 TDM 確認");
  return (
    `💊 ${drug.name}\n` +
    `${r.desc}\n` +
    `${r.action}\n` +
    (tags.length ? `${tags.join("、")}\n` : "") +
    r.footer
  );
}

// ---- 模糊比對（輸入片段也能找到）----
function search(text) {
  const q = norm(text);
  if (index[q]) return [index[q]];
  // 片段比對：學名或任一別名包含查詢字串
  return drugsDB.drugs.filter((d) => {
    if (norm(d.name).includes(q)) return true;
    if (Array.isArray(d.aliases))
      return d.aliases.some((a) => norm(a).includes(q));
    return false;
  });
}

function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }
  const text = event.message.text.trim();

  // 指令：列出全部 / 說明
  if (text === "list" || text === "清單" || text === "全部") {
    const names = drugsDB.drugs.map((d) => d.name).join("、");
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `目前收錄 ${drugsDB.drugs.length} 種藥物：\n${names}\n\n直接輸入藥名即可查詢。`,
    });
  }

  const matches = search(text);

  if (matches.length === 0) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `查無「${text}」。\n請輸入藥物英文名（可只打前幾個字母），或輸入「清單」查看全部收錄藥物。`,
    });
  }
  if (matches.length === 1) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: buildReply(matches[0]),
    });
  }
  // 多筆 → 列出讓使用者選
  const list = matches.slice(0, 20).map((d) => `・${d.name}`).join("\n");
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `找到多筆符合「${text}」，請輸入完整藥名：\n${list}`,
  });
}

app.post("/webhook", line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((r) => res.json(r))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

app.get("/", (req, res) => res.send("CytoSorb LINE bot running"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));
