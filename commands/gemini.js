const axios   = require("axios");
const fs      = require("fs-extra");
const path    = require("path");

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
].filter(k => k && k.length > 10);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
let keyIndex = 0;
const nextKey = () => {
  if (!GEMINI_KEYS.length) return null;
  const k = GEMINI_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % GEMINI_KEYS.length;
  return k;
};

const sessionsDir = path.join(__dirname, "..", "cache", "ai_sessions");
fs.ensureDirSync(sessionsDir);

function getSessionPath(threadID) {
  return path.join(sessionsDir, `thread_${threadID}.json`);
}
async function loadSession(threadID) {
  try {
    const p = getSessionPath(threadID);
    if (await fs.pathExists(p)) return await fs.readJson(p);
  } catch (_) {}
  return [];
}
async function saveSession(threadID, context) {
  await fs.writeJson(getSessionPath(threadID), context.slice(-10), { spaces: 0 }).catch(() => {});
}

const SYSTEM = `أنت بوت مساعد ذكي على فيسبوك ماسنجر اسمك "Sunken".
- أجب بإيجاز باللغة العربية (أقل من 200 كلمة).
- إذا أُرسلت لك صورة أو ملف، قم بوصفه وتحليله بدقة.
- كن ودوداً ومهذباً ومفيداً.`;

async function attachmentToBase64(url) {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0" } });
    return {
      b64:  Buffer.from(res.data).toString("base64"),
      mime: res.headers["content-type"]?.split(";")[0] || "image/jpeg",
    };
  } catch (e) {
    console.warn("[GEMINI] فشل تحميل المرفق:", e.message);
    return null;
  }
}

async function buildParts(text, attachments) {
  const parts = [];
  if (text?.trim()) parts.push({ text: text.trim() });

  for (const att of attachments) {
    const url  = att.url || att.playbackUrl || att.previewUrl || att.largePreviewUrl;
    const type = (att.type || "").toLowerCase();

    if (!url) {
      console.log("[GEMINI] مرفق بدون URL:", JSON.stringify(att));
      parts.push({ text: `[مرفق من نوع ${type || "غير معروف"} — لا يوجد رابط]` });
      continue;
    }

    if (type === "photo" || type === "image" || url.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
      const data = await attachmentToBase64(url);
      if (data) {
        parts.push({ inline_data: { mime_type: data.mime, data: data.b64 } });
      } else {
        parts.push({ text: `[صورة — فشل التحميل: ${url}]` });
      }
    } else if (type === "audio" || url.match(/\.(mp3|wav|ogg|m4a|aac)/i)) {
      const data = await attachmentToBase64(url);
      if (data) {
        parts.push({ inline_data: { mime_type: data.mime || "audio/mp3", data: data.b64 } });
      } else {
        parts.push({ text: `[صوت — فشل التحميل: ${url}]` });
      }
    } else if (type === "video" || url.match(/\.(mp4|webm|mov)/i)) {
      parts.push({ text: `[فيديو: ${url}]` });
    } else {
      parts.push({ text: `[مرفق (${type}): ${url}]` });
    }
  }

  return parts.length > 0 ? parts : [{ text: "." }];
}

async function callGemini(contents, apiKey) {
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
    {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    },
    { timeout: 25000, headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey } }
  );
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

async function callGroq(contents) {
  if (!GROQ_API_KEY) throw new Error("No Groq Key");
  const messages = [
    { role: "system", content: SYSTEM },
    ...contents.map(c => ({
      role:    c.role === "model" ? "assistant" : "user",
      content: c.parts.map(p => p.text || "[مرفق]").join(" "),
    })),
  ];
  const { data } = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    { model: "llama-3.3-70b-versatile", messages, temperature: 0.7, max_tokens: 2048 },
    { timeout: 15000, headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` } }
  );
  return data.choices?.[0]?.message?.content || null;
}

async function handleMessage(api, event, promptText, attachments) {
  const { threadID, messageID, senderID } = event;

  // ─── DEBUG مؤقت — اطبع بنية المرفقات ────────────────
  if (attachments.length > 0) {
    console.log("[GEMINI DEBUG] attachments:", JSON.stringify(attachments, null, 2));
  }

  if (promptText.toLowerCase() === "clear" || promptText === "مسح") {
    try { await fs.unlink(getSessionPath(threadID)); } catch (_) {}
    return api.sendMessage("🧹 تم مسح ذاكرة المجموعة.", threadID, null, messageID);
  }

  if (!promptText.trim() && !attachments.length) {
    return api.sendMessage("اكتب سؤالك أو أرسل صورة!", threadID, null, messageID);
  }

  const context  = await loadSession(threadID);
  const newParts = await buildParts(promptText, attachments);
  const contents = [...context, { role: "user", parts: newParts }];

  let reply = null;
  try {
    const key = nextKey();
    if (key) reply = await callGemini(contents, key);
    else throw new Error("No Keys");
  } catch (err) {
    console.warn("[GEMINI] فشل:", err.message?.substring(0, 80));
    if (GROQ_API_KEY) {
      try { reply = await callGroq(contents); }
      catch { return api.sendMessage("❌ تعذر الاتصال بالخوادم.", threadID, null, messageID); }
    } else {
      return api.sendMessage("❌ تم تجاوز الحد — حاول لاحقاً.", threadID, null, messageID);
    }
  }

  if (!reply) return api.sendMessage("❌ استجابة فارغة.", threadID, null, messageID);

  api.sendMessage(reply, threadID, (err, info) => {
    if (err) return;
    try {
      global.GoatBot?.onReply?.set(info.messageID, {
        commandName: "gemini",
        messageID:   info.messageID,
        author:      senderID,
        threadID,
      });
    } catch (_) {}
  }, messageID);

  await saveSession(threadID, [
    ...context,
    { role: "user",  parts: [{ text: promptText || "[مرفق]" }] },
    { role: "model", parts: [{ text: reply }] },
  ]);
}

module.exports = {
  config: {
    name: "gemini",
    aliases: ["بوت", "ai", "gm"],
    version: "3.1.0",
    author: "Sunken",
    countDown: 5,
    role: 0,
    shortDescription: { ar: "محادثة ذكية مع Gemini — يفهم الصور والصوت" },
    category: "ذكاء اصطناعي",
    guide: {
      ar:
        "{pn}gemini [سؤال]\n" +
        "{pn}gemini [+ صورة]\n" +
        "{pn}gemini clear ← مسح ذاكرة المجموعة"
    }
  },

  onStart: async ({ api, event, args }) => {
    const text       = args.join(" ").trim();
    const atts       = event.attachments || [];
    const replyAtts  = event.messageReply?.attachments || [];
    const promptText = text || event.messageReply?.body || "";
    await handleMessage(api, event, promptText, [...atts, ...replyAtts]);
  },

  onReply: async ({ api, event }) => {
    const text = event.body?.trim() || "";
    const atts = event.attachments || [];
    await handleMessage(api, event, text, atts);
  },
};
