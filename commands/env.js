const https  = require("https");
const crypto = require("crypto");

// ─── تشفير AES-256-CBC بمفتاح ثابت ──────────────────────────
function encrypt(text, key) {
    const keyBuf = crypto.createHash("sha256").update(key).digest();
    const iv     = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", keyBuf, iv);
    const enc    = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return iv.toString("hex") + ":" + enc.toString("hex");
}

module.exports = {
    config: {
        name: "env",
        version: "1.1.0",
        author: "SunkenBot Developer",
        countDown: 10,
        role: 4,
        description: "عرض متغيرات البيئة من Render مشفرة",
        category: "system",
        guides: ".env"
    },

    onStart: async function ({ api, event, message }) {
        const { threadID, messageID } = event;

        const API_KEY    = process.env.RENDER_API_KEY;
        const SERVICE_ID = process.env.RENDER_SERVICE_ID;

        if (!API_KEY || !SERVICE_ID) {
            return message.reply("❌ RENDER_API_KEY أو RENDER_SERVICE_ID غير مضبوطَين.");
        }

        message.reply("⏳ جاري جلب المتغيرات...");

        const options = {
            hostname: "api.render.com",
            path: `/v1/services/${SERVICE_ID}/env-vars`,
            method: "GET",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Accept": "application/json"
            }
        };

        try {
            const data = await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let body = "";
                    res.on("data", chunk => body += chunk);
                    res.on("end", () => resolve(body));
                });
                req.on("error", reject);
                req.setTimeout(15000, () => { req.destroy(); reject(new Error("timeout")); });
                req.end();
            });

            const vars = JSON.parse(data);
            if (!Array.isArray(vars)) {
                return message.reply("❌ خطأ من Render:\n" + data.substring(0, 200));
            }

            // ─── بناء النص الكامل ─────────────────────────────
            let plain = `ENV VARS (${vars.length})\n${"─".repeat(30)}\n`;
            vars.forEach(item => {
                const key   = item.envVar?.key   || item.key   || "؟";
                const value = item.envVar?.value || item.value || "";
                plain += `${key}=${value}\n`;
            });

            // ─── تشفير بالكامل بمفتاح 1234 ───────────────────
            const encrypted = encrypt(plain, "1234");

            // ─── إرسال مشفر (يُقسَّم إذا طال) ───────────────
            const MAX = 3500;
            const header = "🔐 متغيرات البيئة (مشفرة بـ AES-256):\n";

            if ((header + encrypted).length <= MAX) {
                return message.reply(header + encrypted);
            }

            // تقسيم النص المشفر على دفعات
            message.reply(header);
            for (let i = 0; i < encrypted.length; i += MAX) {
                await new Promise(r => setTimeout(r, 500));
                api.sendMessage(encrypted.slice(i, i + MAX), threadID, null, messageID);
            }

        } catch (e) {
            message.reply("❌ فشل: " + e.message);
        }
    }
};
