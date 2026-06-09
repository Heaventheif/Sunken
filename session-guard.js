/**
 * session-guard.js
 * يحمي جلسة Facebook من التعليق:
 * 1. يحفظ appstate المُحدَّث في Render Environment Variables تلقائياً
 * 2. محاكاة نشاط بشري عشوائي
 * 3. كشف علامات التعليق مبكراً وإشعار المشرف
 */

const axios = require("axios");
const path  = require("path");

// ⚠️ لا تضع المفاتيح هنا — ضعها في Environment Variables على Render
const RENDER_API_KEY    = process.env.RENDER_API_KEY;
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;

// ===================================================
// حفظ appstate في Render ENV تلقائياً
// ===================================================
async function saveAppStateToRender(api) {
  try {
    const state = api.getAppState();
    if (!state || !state.length) return;

    const stateStr = JSON.stringify(state);

    if (RENDER_API_KEY && RENDER_SERVICE_ID) {
      const baseUrl = `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars`;
      const headers = {
        "Authorization": `Bearer ${RENDER_API_KEY}`,
        "Content-Type":  "application/json",
      };

      // ✅ الخطوة 1: جلب كل المتغيرات الحالية أولاً
      // PUT يستبدل الكل — لازم نجلب ونحافظ على الباقي
      let existingVars = [];
      try {
        const getRes = await axios.get(baseUrl, { headers, timeout: 15000 });
        existingVars = (getRes.data || []).map(item => ({
          key:   item.envVar?.key   || item.key,
          value: item.envVar?.value || item.value,
        })).filter(v => v.key);
      } catch (getErr) {
        console.warn("[SESSION] ⚠️ فشل جلب المتغيرات:", getErr.message?.substring(0, 60));
        // Fallback: نبني القائمة من process.env الحالية
        existingVars = buildFallbackEnvVars(stateStr);
        await axios.put(baseUrl, existingVars, { headers, timeout: 15000 });
        console.log("[SESSION] ✅ تم حفظ appstate (fallback mode)");
        return;
      }

      // ✅ الخطوة 2: تحديث APPSTATE فقط بدون المساس بالباقي
      const idx = existingVars.findIndex(v => v.key === "APPSTATE");
      if (idx >= 0) existingVars[idx].value = stateStr;
      else existingVars.push({ key: "APPSTATE", value: stateStr });

      // ✅ الخطوة 3: إرسال القائمة الكاملة
      await axios.put(baseUrl, existingVars, { headers, timeout: 15000 });
      console.log(`[SESSION] ✅ تم حفظ appstate في Render ENV (${existingVars.length} متغير محفوظ)`);
      return;
    }

    // Fallback محلي
    const fs = require("fs-extra");
    fs.writeFileSync(
      path.join(__dirname, "appstate.json"),
      JSON.stringify(state, null, 2)
    );
    console.log("[SESSION] ✅ تم حفظ appstate محلياً");

  } catch (e) {
    console.warn("[SESSION] ⚠️ فشل حفظ appstate:", e.message?.substring(0, 80));
  }
}

// ===================================================
// Fallback: بناء قائمة المتغيرات من process.env
// يُستخدم فقط إذا فشل GET
// ===================================================
function buildFallbackEnvVars(appStateStr) {
  const known = [
    "MONGO_URI", "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3",
    "GEMINI_API_KEY_4", "GROQ_API_KEY", "PIXABAY_API_KEY",
    "FERDEV_API_KEY", "FERDEV_API_KEY2", "FERDEV_API_KEY3",
    "GITHUB_MODELS_TOKEN", "DASHBOARD_PASSWORD",
    "RENDER_API_KEY", "RENDER_SERVICE_ID",
    "RENDER_EXTERNAL_URL", "PORT", "NODE_OPTIONS",
    "APPSTATE_BOT1", "APPSTATE_BOT2",
  ];
  const vars = known
    .filter(k => process.env[k])
    .map(k => ({ key: k, value: process.env[k] }));

  const idx = vars.findIndex(v => v.key === "APPSTATE");
  if (idx >= 0) vars[idx].value = appStateStr;
  else vars.push({ key: "APPSTATE", value: appStateStr });

  return vars;
}

// ===================================================
// حفظ دوري (كل 50-70 دقيقة)
// ===================================================
function startSessionSaver(api) {
  const save = async () => {
    await saveAppStateToRender(api);
    const next = (50 + Math.random() * 20) * 60 * 1000;
    setTimeout(save, next);
  };
  setTimeout(save, 5 * 60 * 1000);
}

// ===================================================
// كشف التعليق
// ===================================================
function watchForSuspension(api, onSuspended) {
  let failCount = 0;

  const check = async () => {
    try {
      await new Promise((resolve, reject) => {
        api.getUserInfo(api.getCurrentUserID(), (err, data) =>
          err ? reject(err) : resolve(data)
        );
      });
      failCount = 0;
    } catch (e) {
      failCount++;
      console.warn(`[SESSION] ⚠️ فشل التحقق (${failCount}/3):`, e.message?.substring(0, 60));

      const isSuspended =
        e.message?.includes("login")      ||
        e.message?.includes("suspended")  ||
        e.message?.includes("checkpoint") ||
        failCount >= 3;

      if (isSuspended) {
        console.error("[SESSION] 🔴 الجلسة معلقة أو منتهية!");
        onSuspended(e.message);
        return;
      }
    }
    const next = (15 + Math.random() * 10) * 60 * 1000;
    setTimeout(check, next);
  };

  setTimeout(check, 3 * 60 * 1000);
}

// ===================================================
// محاكاة نشاط بشري
// ===================================================
function simulateHumanActivity(api) {
  const run = () => {
    try {
      api.getThreadList(5, null, ["INBOX"], () => {});
    } catch (_) {}
    const next = (20 + Math.random() * 20) * 60 * 1000;
    setTimeout(run, next);
  };
  setTimeout(run, 10 * 60 * 1000);
}

// ===================================================
// الدالة الرئيسية
// ===================================================
function init(api, { onSuspended } = {}) {
  if (!RENDER_API_KEY || !RENDER_SERVICE_ID) {
    console.warn(
      "[SESSION] ⚠️ RENDER_API_KEY أو RENDER_SERVICE_ID غير مضبوطان في ENV\n" +
      "          appstate لن يُحفظ تلقائياً عند التحديث"
    );
  }

  console.log("[SESSION] 🛡️ تم تفعيل حماية الجلسة");
  startSessionSaver(api);
  simulateHumanActivity(api);
  watchForSuspension(api, onSuspended || (() => {
    console.error("[SESSION] 🔴 يرجى تجديد الـ appstate يدوياً");
  }));
}

module.exports = { init, saveAppStateToRender };
