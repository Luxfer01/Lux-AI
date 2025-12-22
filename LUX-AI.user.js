// ==UserScript==
// @name LUX Starr Framework v13 (OpenRouter • Encrypted Key • Creative Booster • Strict Access • ConeID Gate • Vision Router)
// @namespace http://tampermonkey.net/
// @version 14.1.1
// @description Refactored LUX: encrypted OpenRouter key, strict Apps Script access (no offline grace), ConeID-on-site match (prevents borrowed ConeID), adaptive history, persistent creative booster, vision router (last client image only), self-aware picture acceptance (no canned lines), topbar chips, bans preserved (“oh/oh wow”, “flattered*”, “enthusiasm* / enthusaism*”, non-food “spicy”, “flirt*”), soft-bans (“unwind / errands / favorite”), no-family excuses unless user mentions family first, no contacts/meetups, 800-char cap, one natural open-ended question.
// @match https://myoperatorservice.com/*
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_notification
// @grant GM_xmlhttpRequest
// @connect 127.0.0.1
// @connect localhost
// @connect openrouter.ai
// @connect api.openrouter.ai
// @connect script.google.com
// @run-at document-end
// ==/UserScript==

/* ============================
   LUX ConeID ACCESS CONTROL
   (STRICT: NO OFFLINE GRACE)
   + ConeID-on-site MATCH
   ============================ */

// IMPORTANT: your deployed Apps Script URL
const ACCESS_API_ENDPOINT = "https://script.google.com/macros/s/AKfycbxBCywRTXBGE1AgLmOPON-xmcoMg09I7ETeUc6ih-U8vpqjWXOWfsVRkwRctZdh4nQ/exec";

// NEW: ConeID displayed on site (navbar)
const SITE_CONEID_SELECTOR = '#app > main > div.flex-shrink-1 > nav > div:nth-child(3) > div > div.col-auto.navbar-text.fw-bold';

// simple modal to request ConeID (only when none is saved)
function lux_promptConeId() {
  return new Promise(resolve => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position:fixed;inset:0;z-index:999999;
      background:rgba(0,0,0,0.88);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      color:#fff;font-family:system-ui,sans-serif;
    `;
    wrapper.innerHTML = `
      <div style="font-size:22px;margin-bottom:10px;">LUX access</div>
      <div style="font-size:16px;margin-bottom:10px;">Enter your ConeID to continue:</div>
      <input id="lux_cone_input" style="padding:8px 10px;font-size:18px;border-radius:6px;border:1px solid #3c4c66;min-width:220px;text-align:center;background:#111;color:#fff;">
      <button id="lux_cone_btn" style="margin-top:12px;padding:8px 18px;font-size:16px;border-radius:6px;border:0;background:#0b3d91;color:#fff;font-weight:600;cursor:pointer;">Submit</button>
    `;
    document.body.appendChild(wrapper);
    const input = wrapper.querySelector("#lux_cone_input");
    const btn = wrapper.querySelector("#lux_cone_btn");
    input.focus();
    btn.onclick = () => {
      const val = (input.value || "").trim().toUpperCase();
      if (!val) return;
      wrapper.remove();
      resolve(val);
    };
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") btn.click();
    });
  });
}

// hard lock overlay – used when license is invalid / expired / unreachable
function lux_lockUI(reason) {
  const div = document.createElement("div");
  div.style.cssText = `
    position:fixed;inset:0;z-index:999999;
    background:rgba(0,0,0,0.9);
    color:#fff;font-family:system-ui,sans-serif;
    display:flex;align-items:center;justify-content:center;
    text-align:center;padding:32px;font-size:18px;
  `;
  div.textContent = `LUX access blocked: ${reason || "not whitelisted or license server unreachable"}.`;
  document.body.appendChild(div);
}

// shared error overlay for other API problems (OpenRouter etc., NOT license state)
function lux_showErrorOverlay(msg) {
  const id = "lux-error-overlay";
  let div = document.getElementById(id);
  if (!div) {
    div = document.createElement("div");
    div.id = id;
    div.style.cssText = `
      position:fixed;inset:0;z-index:999998;
      background:rgba(0,0,0,0.88);
      color:#fff;font-family:system-ui,sans-serif;
      display:flex;align-items:center;justify-content:center;
      text-align:center;padding:32px;
    `;
    const inner = document.createElement("div");
    inner.style.cssText = `
      max-width:420px;background:#111;border-radius:12px;
      border:1px solid #0b3d91;padding:20px;
    `;
    const title = document.createElement("div");
    title.style.cssText = "font-size:18px;font-weight:700;margin-bottom:8px;";
    title.textContent = "LUX connection issue";
    const body = document.createElement("div");
    body.id = "lux-error-body";
    body.style.cssText = "font-size:14px;line-height:1.4;margin-bottom:16px;";
    body.textContent = msg;
    const btn = document.createElement("button");
    btn.textContent = "Close";
    btn.style.cssText = "padding:6px 14px;border-radius:8px;border:0;background:#0b3d91;color:#fff;font-weight:600;cursor:pointer;";
    btn.onclick = () => div.remove();
    inner.appendChild(title);
    inner.appendChild(body);
    inner.appendChild(btn);
    div.appendChild(inner);
    document.body.appendChild(div);
  } else {
    const body = div.querySelector("#lux-error-body");
    if (body) body.textContent = msg;
  }
}

// NEW: read ConeID displayed on the site, wait a bit for DOM to settle
async function lux_getSiteConeId(timeoutMs = 9000, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(SITE_CONEID_SELECTOR);
    const raw = (el?.textContent || "").trim().toUpperCase();
    const m = raw.match(/\bCONE[0-9A-Z]+\b/);
    if (m && m[0]) return m[0];
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return "";
}

// Apps Script call (NOW includes site_coneid and mismatch enforcement)
async function lux_checkOnlineAccess(coneId) {
  if (!ACCESS_API_ENDPOINT) {
    return { allowed: false, reason: "no-endpoint-configured" };
  }
  try {
    const typed = String(coneId || "").trim().toUpperCase();
    const siteConeId = await lux_getSiteConeId();

    if (!siteConeId) return { allowed: false, reason: "site-coneid-missing" };
    if (!typed) return { allowed: false, reason: "no-coneid" };
    if (typed !== siteConeId) return { allowed: false, reason: "site-coneid-mismatch" };

    const url = `${ACCESS_API_ENDPOINT}?coneid=${encodeURIComponent(typed)}&site_coneid=${encodeURIComponent(siteConeId)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      return { allowed: false, reason: "apps-script-http-" + res.status };
    }
    return await res.json();
  } catch (e) {
    console.warn("LUX check error", e);
    return { allowed: false, reason: "network-error" };
  }
}

// v3 access cache – just remembers coneId + last state, NO GRACE
// structure: { coneId, lastStatus, lastCheckMs, expiresAt }
const LUX_ACCESS_CACHE_KEY_V3 = "lux_access_cache_v3";

function lux_getAccessCache() {
  try {
    const raw = GM_getValue(LUX_ACCESS_CACHE_KEY_V3, "");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.coneId) return null;
    return obj;
  } catch {
    return null;
  }
}
function lux_setAccessCache(data) {
  try {
    GM_setValue(LUX_ACCESS_CACHE_KEY_V3, JSON.stringify(data || {}));
  } catch (e) {
    console.warn("LUX access store error", e);
  }
}

// STRICT gate: always re-check server, but never re-prompt ConeID unless missing
async function lux_ensureAccess() {
  let cache = lux_getAccessCache();

  // 1) Ensure we have a ConeID (prompt once, then reuse)
  let coneId = cache && cache.coneId;
  if (!coneId) {
    coneId = await lux_promptConeId();
    if (!coneId) {
      lux_lockUI("no ConeID provided");
      return false;
    }
    cache = { coneId };
  }

  // 2) Always ask the Apps Script on every page load (now also validates site coneid match)
  const result = await lux_checkOnlineAccess(coneId);

  if (!result || !result.allowed) {
    const reason = result && result.reason ? result.reason : "not-allowed";
    lux_setAccessCache({
      coneId,
      lastStatus: "denied",
      lastCheckMs: Date.now(),
      expiresAt: null
    });
    lux_lockUI(reason);
    return false;
  }

  // 3) Allowed – record latest status/expiry for debugging only
  let expTs = null;
  if (result.expires) {
    const ts = new Date(result.expires + "T23:59:59").getTime();
    if (!isNaN(ts)) expTs = ts;
  }
  lux_setAccessCache({
    coneId,
    lastStatus: "allowed",
    lastCheckMs: Date.now(),
    expiresAt: expTs
  });

  return true;
}

/* ============================
   MAIN LUX SCRIPT
   ============================ */

(async function () {
  'use strict';

  const accessOk = await lux_ensureAccess();
  if (!accessOk) return;

  // ===== Config =====
  const API_URL_DEFAULT = 'https://openrouter.ai/api/v1/chat/completions'; // OpenRouter default
  const OPENROUTER_KEY_DEFAULT = '';

  // MAIN DEFAULT: Grok 4 (fast) for TEXT (unchanged behavior)
  const MODEL_DEFAULT = 'x-ai/grok-4-fast';
  const PROVIDER_DEFAULT = 'openrouter';

  // NEW: Vision model (separate, does not replace lux_model)
  const MODEL_VISION_DEFAULT = 'openai/gpt-4.1-mini'; // can be changed in Settings anytime

  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const POLL_MS = 3000;
  const HISTORY_MAX = 14;
  const REQUEST_TIMEOUT_MS = 35000;

  // ===== XOR ENCRYPTION FOR API KEY =====
  const LUX_SECRET = 'lux_starr_secret_salt_v1'; // change this locally & keep private
  const LUX_API_KEY_ENC = 'lux_openrouter_key_enc';
  const LUX_API_KEY_PLAIN_OLD = 'lux_openrouter_key';

  function lux_xorEncrypt(plainText, key = LUX_SECRET) {
    if (!plainText) return '';
    const p = String(plainText);
    const k = String(key);
    let out = '';
    for (let i = 0; i < p.length; i++) {
      const c = p.charCodeAt(i) ^ k.charCodeAt(i % k.length);
      out += String.fromCharCode(c);
    }
    return btoa(out);
  }
  function lux_xorDecrypt(cipherText, key = LUX_SECRET) {
    if (!cipherText) return '';
    let decoded = '';
    try {
      decoded = atob(cipherText);
    } catch (e) {
      console.warn('LUX decrypt: invalid base64', e);
      return '';
    }
    const k = String(key);
    let out = '';
    for (let i = 0; i < decoded.length; i++) {
      const c = decoded.charCodeAt(i) ^ k.charCodeAt(i % k.length);
      out += String.fromCharCode(c);
    }
    return out;
  }

  function lux_getApiKey() {
    const enc = GM_getValue(LUX_API_KEY_ENC, '');
    if (enc) return lux_xorDecrypt(enc);
    const legacy = GM_getValue(LUX_API_KEY_PLAIN_OLD, '').trim();
    if (legacy) {
      const newEnc = lux_xorEncrypt(legacy);
      GM_setValue(LUX_API_KEY_ENC, newEnc);
      return legacy;
    }
    return OPENROUTER_KEY_DEFAULT;
  }
  function lux_setApiKey(plainKey) {
    const enc = lux_xorEncrypt(plainKey || '');
    GM_setValue(LUX_API_KEY_ENC, enc);
  }

  // 🔹 generic fallback preset if a model has no explicit tuning
  const MODEL_FALLBACK_PRESET = {
    temperature: 0.58,
    top_p: 0.92,
    repetition_penalty: 1.02,
    max_tokens: 240,
    stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
    seed: 11
  };

  // ===== Creative-leaning per-model presets (keep your existing models) =====
  const MODEL_PRESETS = {
    'x-ai/grok-4-fast': { temperature: 0.72, top_p: 0.96, repetition_penalty: 1.02, max_tokens: 240, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 13 },
    'anthropic/claude-3.5-sonnet': { temperature: 0.62, top_p: 0.92, repetition_penalty: 1.02, max_tokens: 240, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 21 },
    'openai/gpt-4.1-mini': { temperature: 0.55, top_p: 0.92, repetition_penalty: 1.03, max_tokens: 240, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 7 },
    'meta-llama/llama-3.3-8b-instruct:free': { temperature: 0.65, top_p: 0.95, repetition_penalty: 1.04, max_tokens: 220, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 17 },
    'meta-llama/llama-3.3-70b-instruct:free': { temperature: 0.66, top_p: 0.95, repetition_penalty: 1.03, max_tokens: 230, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 19 }
  };

  function getModelPreset(modelName) {
    const name = (modelName || GM_getValue('lux_model', MODEL_DEFAULT) || '').trim();
    return MODEL_PRESETS[name] || MODEL_FALLBACK_PRESET;
  }

  // ===== Rate limiting & token estimate =====
  const LUX_RATE_WINDOW_MS = 10_000;
  const LUX_RATE_MAX_REQ = 5;
  const LUX_RATE_LOG_KEY = 'lux_req_log_v1';

  function lux_getReqLog() {
    try { return JSON.parse(GM_getValue(LUX_RATE_LOG_KEY, '[]')) || []; } catch { return []; }
  }
  function lux_setReqLog(log) { GM_setValue(LUX_RATE_LOG_KEY, JSON.stringify(log || [])); }
  function lux_canSendRequest() {
    const now = Date.now();
    let log = lux_getReqLog().filter(t => now - t < LUX_RATE_WINDOW_MS);
    if (log.length >= LUX_RATE_MAX_REQ) {
      lux_showErrorOverlay('You are triggering LUX too quickly.\nGive it a few seconds and try again.');
      return false;
    }
    log.push(now);
    lux_setReqLog(log);
    return true;
  }
  function lux_estimateTokens(str) { return str ? Math.ceil(String(str).length / 4) : 0; }

  // ===== Adaptive creativity booster (persistent + daypart) =====
  const CREATIVE_BASE = 0.0;
  const CREATIVE_MAX = 0.25;
  const LUX_CREATIVE_STATE_KEY = 'lux_creative_state_v1';

  function lux_getCreativeState() {
    try { return JSON.parse(GM_getValue(LUX_CREATIVE_STATE_KEY, '{}')) || {}; } catch { return {}; }
  }
  function lux_setCreativeState(state) {
    GM_setValue(LUX_CREATIVE_STATE_KEY, JSON.stringify(state || {}));
  }

  function scoreCreativeIntent(text) {
    const s = (text || '').toLowerCase();
    let score = 0;
    if (/\b(cute|adorable|pretty|gorgeous|fun|play|vibe|chemistry|smile|eyes|sweet)\b/.test(s)) score += 0.10;
    if (/\b(pic|pics|picture|selfie|photo|gallery)\b/.test(s)) score += 0.08;
    if (/\b(how.*day|what.*up|tell me about|you like|you enjoy)\b/.test(s)) score += 0.06;
    if (/\b(fact|proof|specific|exact|details?|policy|rule|why|explain|clarify)\b/.test(s)) score -= 0.06;
    if (/\b(meet|number|whatsapp|instagram|snap|telegram|address|call|text)\b/.test(s)) score -= 0.10;
    score += CREATIVE_BASE;
    return Math.max(-0.10, Math.min(CREATIVE_MAX, score));
  }
  function lux_getDaypart(date = new Date()) {
    const hour = date.getHours();
    if (hour < 5) return 'late-night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  function withCreativeBoost(base, msg) {
    const state = lux_getCreativeState();
    const history = state.history || [];
    const score = scoreCreativeIntent(msg);
    history.push(score);
    if (history.length > 5) history.shift();
    const highCount = history.filter(s => s >= 0.10).length;

    let temperature = base.temperature ?? 0.7;
    let top_p = base.top_p ?? 0.9;

    const daypart = lux_getDaypart();
    if (daypart === 'late-night' || daypart === 'night') temperature = Math.min(temperature + 0.05, 1.1);
    else if (daypart === 'morning') temperature = Math.max(temperature - 0.05, 0.45);

    if (highCount >= 3) {
      temperature = Math.min(temperature + 0.15, 1.2);
      top_p = Math.min(top_p + 0.05, 1.0);
    } else if (highCount >= 1) {
      temperature = Math.min(temperature + 0.05, 1.0);
    } else {
      temperature = temperature * 0.9 + base.temperature * 0.1;
      top_p = top_p * 0.9 + base.top_p * 0.1;
    }

    lux_setCreativeState({ history });
    return { ...base, temperature, top_p };
  }

  // ===== OpenRouter payload compatibility shim =====
  function sanitizePayloadForModel(payload, model) {
    const m = (model || '').toLowerCase();
    const p = { ...payload };
    if ('transforms' in p) delete p.transforms;
    if ('logit_bias' in p && !p.logit_bias) delete p.logit_bias;
    if (m.includes('llama-3.2-3b') && p.max_tokens > 260) p.max_tokens = 220;
    return p;
  }

  // ===== Selectors =====
  const REPLY_INPUT_SELECTOR = 'textarea#reply-textarea.form-control.border-start-0.border-end-0';
  const PERSONA_NAME_SEL = 'h5.fw-bold.mb-1';
  const PERSONA_LOC_SEL = 'h6.text-black-50';
  const THREAD_SEL = 'div#message-list.flex-grow-1.overflow-auto.p-4';
  const CLIENT_MSG_SELECTOR = 'div.d-flex.flex-row-reverse.my-2.message-box';
  const PERSONA_MSG_SELECTOR = 'div.d-flex.flex-row.my-2';
  const MEMBER_TIME_SEL = 'span#memberTime.fw-bold';

  // ===== Utilities =====
  function _qs(r, s) { try { return s ? r.querySelector(s) : null; } catch { return null; } }
  function _qst(r, s) { const el = _qs(r, s); return el ? el.innerText.trim() : ''; }
  function extractBracketName(s) { if (!s) return ''; let m = s.match(/\(([^()]*)\)\s*$/); if (!m) m = s.match(/\(([^)]+)\)/); return (m && m[1]) ? m[1].trim() : ''; }
  function cleanOutsideName(s) { if (!s) return ''; return s.replace(/\s*\([^)]*\)\s*/g, '').trim(); }
  function parseLeftProfile() {
    const rawName = _qst(document, PERSONA_NAME_SEL);
    return {
      rawName,
      realName: extractBracketName(rawName) || '',
      displayName: cleanOutsideName(rawName) || rawName,
      location: _qst(document, PERSONA_LOC_SEL) || 'nearby'
    };
  }

  // NOTE: This patch strips inline image notes from captured text.
  function stripInlineImageNotes(text) {
    if (!text) return '';
    let t = String(text);
    t = t.replace(/\bmessage\b\s*image\s+attached\.?/gi, '');
    t = t.replace(/\bimage\s+attached\.?/gi, '');
    t = t.replace(/\bimage\s+note\b[^.]*\.?/gi, '');
    return t.replace(/\s{2,}/g, ' ').trim();
  }

  // Text-only extraction now (no appended "Image attached" lines)
  function extractMessageContent(node) {
    const rawText = (node?.innerText || '').trim();
    return stripInlineImageNotes(rawText);
  }

  function notify(text) { try { GM_notification({ text, title: 'LUX', timeout: 3500 }); } catch { console.log('[LUX]', text); } }
  function trimText(s, max) { s = (s || '').toString(); return s.length > max ? s.slice(0, max) + '...' : s; }

  // ===== Limits: hard cap =====
  const MAX_CHARS = 800;
  function clampToLimit(s, max = MAX_CHARS) {
    let t = (s || '').trim();
    if (t.length <= max) return t;
    t = t.slice(0, max);
    t = t.replace(/\s+\S*$/, '');
    t = t.replace(/[^\w?\.]$/, '');
    if (!/[.?]$/.test(t)) t = t.replace(/[,\-:]?$/, '') + '.';
    return t.trim();
  }

  // ===== Raw page day/time & daypart (with REAL day name) =====
  function buildTimeContext() {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const el = document.querySelector(MEMBER_TIME_SEL);
    const raw = el?.textContent?.trim() || '';
    const parseHour24 = (txt) => {
      const m = txt.match(/(\d{1,2})[:.](\d{2})(?:\s*([AP]\.?M\.?))?/i);
      if (!m) return NaN;
      let h = parseInt(m[1], 10);
      const ap = (m[3] || '').replace(/\./g, '').toUpperCase();
      if (!ap) return Math.min(23, Math.max(0, h));
      if (ap === 'AM') { if (h === 12) h = 0; }
      else if (ap === 'PM') { if (h !== 12) h += 12; }
      return h;
    };
    const parseDayIndex = (txt) => {
      const s = (txt || '').toLowerCase();
      const map = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, fri: 5, sat: 6 };
      const long = s.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
      if (long) return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(long[0]);
      const short = s.match(/\b(sun|mon|tue|tues|wed|thu|thur|fri|sat)\b/);
      if (short) return map[short[0]];
      return NaN;
    };
    const now = new Date();
    const hour24 = Number.isFinite(parseHour24(raw)) ? parseHour24(raw) : now.getHours();
    const dayIndex = Number.isFinite(parseDayIndex(raw)) ? parseDayIndex(raw) : now.getDay();
    const dayName = dayNames[dayIndex] || now.toLocaleDateString(undefined, { weekday: 'long' });
    const daypart = (h) => (h >= 5 && h < 12) ? 'morning' : (h < 17) ? 'afternoon' : (h < 22) ? 'evening' : 'night';
    const fallbackTime = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const fallbackDayShort = dayShort[now.getDay()];
    const rawDayTime = raw && /\d/.test(raw) ? raw : `${fallbackDayShort} ${fallbackTime}`;
    return { hour24, dayIndex, dayName, daypart: daypart(hour24), rawDayTime, raw };
  }

  // ===== Base Styles =====
  const css = document.createElement('style');
  css.textContent = `
#lux-btn{position:fixed;bottom:20px;right:20px;z-index:99999;background:#0b3d91;color:#fff;border:0;padding:10px 16px;border-radius:999px;font-weight:700;cursor:pointer;box-shadow:0 6px 16px rgba(11,61,145,.3)}
#lux-popup{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:820px;max-width:98vw;max-height:84vh;overflow:auto;background:#1f1f1f;color:#eee;border:2px solid #0b3d91;border-radius:14px;padding:14px;z-index:100000;display:none;font-family:system-ui,sans-serif}
#lux-responses{display:flex;flex-direction:column;gap:8px}
.lux-reply{white-space:pre-wrap;border:1px solid #3a4155;border-radius:10px;padding:10px;background:#252525;color:#eaeaea;cursor:pointer}
#lux-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
#lux-actions button{flex:1 1 150px}
#lux-settings-panel{display:none;margin-top:8px;border:1px solid #3a4155;border-radius:8px;padding:8px;background:#222;color:#eaeaea}
#lux-settings-panel input[type=text],#lux-settings-panel textarea{width:100%;padding:6px;border:1px solid #3a4155;background:#1a1a1a;color:#eaeaea;border-radius:6px;margin:4px 0}
#lux-models{background:#2b3545;color:#bcd7ff;border:0;border-radius:8px;padding:8px 10px;font-weight:700}
#lux-models-panel{display:none;margin-top:8px;border:1px dashed #3c4c66;border-radius:8px;padding:8px}
#lux-models-panel .lux-model{margin:4px;padding:6px 10px;border:1px solid #3c4c66;border-radius:8px;background:#1f2937;color:#cfe0ff;cursor:pointer}
#lux-models-panel .lux-tag{display:inline-block;background:#0b3d91;color:#fff;border-radius:999px;padding:2px 8px;font-size:12px;margin-left:8px}
  `;
  document.head.appendChild(css);

  // ===== UI Root =====
  const btn = document.createElement('button'); btn.id = 'lux-btn'; btn.textContent = 'LUX'; document.body.appendChild(btn);
  const pop = document.createElement('div'); pop.id = 'lux-popup';
  pop.innerHTML = `
  <div id="lux-topbar" style="margin-bottom:8px"></div>
  <textarea id="lux-customer" placeholder="Latest customer message" style="width:100%;min-height:96px;border:1px solid #3a4155;background:#2a2a2a;color:#fff;border-radius:8px;padding:8px;margin:8px 0"></textarea>
  <div id="lux-responses"></div>
  <div id="lux-actions">
    <button id="lux-send" style="background:#0b3d91;color:#fff;border:0;border-radius:8px;padding:8px 10px;font-weight:700">Send</button>
    <button id="lux-regen" style="background:#113a6b;color:#fff;border:0;border-radius:8px;padding:8px 10px;font-weight:700">Regenerate</button>
    <button id="lux-models">Models</button>
    <button id="lux-settings" style="background:#303741;color:#eaeaea;border:0;border-radius:8px;padding:8px 10px;font-weight:700">Settings</button>
    <button id="lux-close" style="background:#303741;color:#eaeaea;border:0;border-radius:8px;padding:8px 10px;font-weight:700">Close</button>
  </div>
  <div id="lux-models-panel"></div>
  <div id="lux-settings-panel">
    <div><strong>Backend URL</strong></div><input type="text" id="lux-api-url">
    <div><strong>OpenRouter API Key</strong></div><input type="text" id="lux-api-key">
    <div><strong>Model (Text Replies)</strong></div><input type="text" id="lux-model">
    <div><strong>Model (Vision For Images)</strong></div><input type="text" id="lux-model-vision">
    <div><strong>Provider</strong></div><input type="text" id="lux-provider">
    <div><strong>Custom Persona (optional)</strong></div><textarea id="lux-persona"></textarea>
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:4px">
      <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-excuse-via-model" checked> Use model for creative refusals</label>
      <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-filter-enabled"> Enable explicit filter</label>
    </div>
    <button id="lux-save" style="margin-top:6px;background:#0b3d91;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-weight:700">Save</button>
  </div>`;
  document.body.appendChild(pop);

  const ui = {
    popup: pop,
    topbar: pop.querySelector('#lux-topbar'),
    customer: pop.querySelector('#lux-customer'),
    list: pop.querySelector('#lux-responses'),
    send: pop.querySelector('#lux-send'),
    regen: pop.querySelector('#lux-regen'),
    models: pop.querySelector('#lux-models'),
    modelsPanel: pop.querySelector('#lux-models-panel'),
    settings: pop.querySelector('#lux-settings'),
    close: pop.querySelector('#lux-close'),
    panel: pop.querySelector('#lux-settings-panel'),
    apiUrl: pop.querySelector('#lux-api-url'),
    apiKey: pop.querySelector('#lux-api-key'),
    model: pop.querySelector('#lux-model'),                 // TEXT model (existing)
    modelVision: pop.querySelector('#lux-model-vision'),    // VISION model (new)
    provider: pop.querySelector('#lux-provider'),
    persona: pop.querySelector('#lux-persona'),
    excuseViaModel: pop.querySelector('#lux-excuse-via-model'),
    filterEnabled: pop.querySelector('#lux-filter-enabled'),
    save: pop.querySelector('#lux-save'),
  };

  // Load settings (with encrypted key)
  ui.apiUrl.value = GM_getValue('lux_api_url', API_URL_DEFAULT);
  ui.apiKey.value = lux_getApiKey();
  ui.model.value = GM_getValue('lux_model', MODEL_DEFAULT); // unchanged
  ui.modelVision.value = GM_getValue('lux_model_vision', MODEL_VISION_DEFAULT);
  ui.provider.value = GM_getValue('lux_provider', PROVIDER_DEFAULT);
  ui.persona.value = GM_getValue('lux_persona', '');
  ui.excuseViaModel.checked = GM_getValue('lux_excuse_via_model', 1) === 1;
  ui.filterEnabled.checked = !!GM_getValue('lux_filter_enabled', 0);

  // ===== Models picker (TEXT only; your other models remain) =====
  const modelChoices = [
    'x-ai/grok-4-fast',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4.1-mini',
    'meta-llama/llama-3.3-8b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
  ];
  let LUXSettingsDirty = false;

  function renderModelButtons() {
    const cur = (GM_getValue('lux_model', MODEL_DEFAULT) || '').trim();
    const p = ui.modelsPanel;
    p.innerHTML = '';
    const head = document.createElement('div');
    head.style.marginBottom = '6px';
    head.innerHTML = `<strong>Pick a model</strong> <span class="lux-tag">current: ${cur || 'default'}</span>`;
    p.appendChild(head);

    modelChoices.forEach(m => {
      const b = document.createElement('button');
      b.className = 'lux-model';
      b.textContent = m;
      b.addEventListener('click', () => {
        ui.model.value = m;
        GM_setValue('lux_model', m);

        const providerField = ui.provider;
        if (providerField) {
          if (/gpt-|o3-|o1-/.test(m)) providerField.value = 'openai';
          else providerField.value = 'openrouter';
          GM_setValue('lux_provider', providerField.value.trim());
        }

        LUXSettingsDirty = true;
        notify('Text model set to ' + m);
        LUXPatch.UIChips.refresh({ modelLabel: m });
        renderModelButtons();
      });
      p.appendChild(b);
    });
  }
  function toggleModelsPanel() {
    const p = ui.modelsPanel;
    const open = getComputedStyle(p).display !== 'none' && getComputedStyle(p).visibility !== 'hidden';
    if (open) { p.style.display = 'none'; p.style.visibility = 'hidden'; }
    else { renderModelButtons(); p.style.display = 'block'; p.style.visibility = 'visible'; }
  }
  ui.models.addEventListener('click', toggleModelsPanel);

  // ===== Timestamp stripper =====
  const TS_PATTERNS = [
    /\[\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*\]/gi,
    /\(\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*\)/gi,
    /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/gi,
    /\b20\d{2}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b20\d{2}[01]\d[0-3]\d(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?\b/g,
    /\b\d{6,}\b/g,
    /\breport\b\.?$/gi
  ];
  function stripTimestamps(s) {
    let t = (s || '').trim();
    TS_PATTERNS.forEach(rx => { t = t.replace(rx, '').trim(); });
    t = t.replace(/[-–—|•]+\s*$/g, '').replace(/^\s*[-–—|•]+\s*/g, '').trim();
    return t;
  }

  // ===== LUXPatch namespaces =====
  const LUXPatch = (typeof window.LUXPatch !== 'undefined' ? window.LUXPatch : (window.LUXPatch = {}));

  /* ===========================
     PATCH: UI Topbar Chips
     =========================== */
  LUXPatch.UIChips = (() => {
    const ids = { topbar: 'lux-topbar', chipModel: 'lux-chip-model', chipDaypart: 'lux-chip-daypart' };
    function ensureStyles() {
      if (document.getElementById('luxpatch-chips-style')) return;
      const css = document.createElement('style');
      css.id = 'luxpatch-chips-style';
      css.textContent = `
        .luxpatch-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
        .luxpatch-chip{background:#2b3545;border:1px solid #3c4c66;color:#cfe0ff;border-radius:999px;padding:4px 10px;font-size:12px}
        .luxpatch-brand{font-weight:900;letter-spacing:.4px;color:#bcd7ff}
      `;
      document.head.appendChild(css);
    }
    function timeChipLabel() {
      const tc = buildTimeContext();
      return `${tc.rawDayTime} • ${tc.daypart} • ${tc.dayName}`;
    }
    function mountTopbar(container) {
      ensureStyles();
      if (!container) return null;
      const top = document.createElement('div');
      top.id = ids.topbar; top.className = 'luxpatch-topbar';
      top.innerHTML = `
        <div class="luxpatch-brand">LUX</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="luxpatch-chip" id="${ids.chipModel}">model: —</span>
          <span class="luxpatch-chip" id="${ids.chipDaypart}">—</span>
        </div>`;
      container.appendChild(top);
      refresh({ modelLabel: 'default' });
      return top;
    }
    function refresh({ modelLabel }) {
      const m = document.getElementById(ids.chipModel);
      const d = document.getElementById(ids.chipDaypart);
      if (m && modelLabel) m.textContent = `model: ${modelLabel}`;
      if (d) d.textContent = timeChipLabel();
    }
    function unmount() { const n = document.getElementById(ids.topbar); if (n) n.remove(); }
    return { mountTopbar, refresh, unmount, ids };
  })();

  LUXPatch.UIChips.mountTopbar(ui.topbar);
  LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || 'default') });

  /* ===========================
     PATCH: No-Repeat Guard
     =========================== */
  LUXPatch.NoRepeat = (() => {
    const bannedPhrases = [
      "early start",
      "quiet evening",
      "keeping it here",
      "on-platform",
      "staying on-platform",
      "chores",
      "catching up on work",
      "keeping it simple",
      "staying in",
      "wind down",
      "data's tight",
      "data’s tight",
      "let's keep the heat online",
      "let's keep it online",
      "let's keep the chat online",
      "let's keep building the heat",
      "let's keep building the connection",
      "let's keep building the heat or connection",
      "keep building the heat",
      "keep building the connection",
      "build the heat",
      "build the connection",
      "build our connection",
      "build our heat",
      "I’m a bit shy to share my contact",
      "I'm a bit shy to share my contact",
      "what do you do to relax on a thursday morning or evening",
      "what do you do to relax on a thursday evening",
      "let's build the connection first",
      "im not ready for that",
      "i'm not ready for that",
      "i need to focus on building a connection here",
      "i'd like to focus on getting to know each other first"
    ];
    const bannedRegexes = [
      /let['’]?s\s+keep\s+building\s+(?:the\s+)?(?:heat|connection)(?:\s+or\s+(?:the\s+)?(?:heat|connection))?/gi,
      /keep\s+building\s+(?:the\s+)?(?:heat|connection)/gi,
      /\bbuild(?:ing)?\s+(?:the\s+|our\s+)?(?:heat|connection)\b/gi
    ];

    const substitutionPool = [
      "I'm happy staying right here in our chat.",
      "I like keeping things simple and cozy between us here.",
      "I like the way this feels here, just us and the conversation.",
      "I'm enjoying this space with you, right here.",
      "I'm all yours on this screen for now."
    ];
    function randomSub() {
      return substitutionPool[Math.floor(Math.random() * Math.random() * substitutionPool.length)] || substitutionPool[0];
    }
    function substitute(text) {
      if (!text) return text;
      let out = String(text);
      bannedPhrases.forEach(phrase => {
        if (!phrase) return;
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(out)) out = out.replace(regex, randomSub());
      });
      bannedRegexes.forEach(regex => {
        if (regex.test(out)) out = out.replace(regex, randomSub());
      });
      return out;
    }
    function dedupePhrases(text) {
      if (!text) return text;
      let out = String(text);
      out = out.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
      out = out.replace(/\b(\w+\s+\w+)(\s+\1\b)+/gi, '$1');
      out = out.replace(/\b(\w+\s+\w+\s+\w+)(\s+\1\b)+/gi, '$1');
      out = out.replace(/\b(\w+(?:\s+\w+){0,2})\b([,;:])\s+\1\b/gi, '$1');
      return out;
    }
    function scrub(text) {
      return dedupePhrases(substitute(text));
    }
    return { scrub, substitute };
  })();

  /* =========================================
     Safety & Refusals (concise, no-family)
     ========================================= */
  const Safety = (() => {
    const CONTACT_REQUEST_RE = /\b(?:what(?:'| i)?s\s+(?:your\s+)?(?:number|no\.?|email)|give\s+me\s+(?:your\s+)?(?:number|email)|add\s+me\s+on\s+(?:whatsapp|ig|instagram|snap(?:chat)?|telegram|discord)|dm\s+me\s+on\s+(?:ig|instagram|x|twitter)|hit\s+me\s+up\s+on\s+(?:whatsapp|ig|instagram|snap|telegram|discord)|call\s+me|text\s+me|send\s+me\s+(?:your\s+)?contact|share\s+(?:your\s+)?(?:number|email)|give\s+me\s+your\s+contact|reach\s+me\s+at)\b/i;
    const MEET_EXPLICIT_RE = /\b(?:let['’]?s\s+(?:meet|hang(?:\s*out)?|link\s*up|grab\s+(?:a\s+)?(?:drink|coffee)|go\s+for\s+(?:drinks?|coffee))|see\s+you\s+(?:tonight|tomorrow|later)|(?:bar|club|restaurant|dinner|lunch|brunch|date|coffee|café|cafe|drinks?|hookup))\b/i;
    const MEET_INDIRECT_RE = /\b(?:are\s+you\s+(?:available|free|around)\b|you\s+(?:free|available)\b|when\s+(?:are\s+you\s+)?free\b|what\s+time\s+works\b|would\s+you\s+like\s+to\s+meet\b|can\s+we\s+(?:meet|link|hang)\b|can\s+i\s+see\s+you\b|see\s+you\s+(?:later|tonight)\b|pull\s+up\b|come\s+through\b)\b/i;
    const ADDRESS_RE = /\b(address|house|apartment|home|street|avenue|road|rd\.?|st\.?)\b/i;
    const NAME_RE = /\b(what(?:'| i)?s\s+your\s+name|ur\s*name|name\s*please|name\s*pls|who\s+are\s+you)\b/i;
    const LOCATION_RE = /\b(where\s+do\s+you\s+(?:live|stay)|where\s+are\s+you|what\s+city|your\s+city|your\s+location|where\s+are\s+you\s+based|where\s+are\s+u\s+at|what\s+part\s+are\s+you\s+in|where\s+do\s+you\s+reside|what\s+part\s+of\s+town|where\s+you\s+located|where\s+are\s+you\s+located)\b/i;

    const USER_MENTIONS_FAMILY_RE = /\b(family|my\s+(?:sister|brother|mom|mother|dad|father|parents?|cousin|aunt|uncle|kids?|child|niece|nephew)|babysit(?:ting)?|family\s+issues?)\b/i;
    const FAMILY_WORD_RE = /\b(family|mom|mother|dad|father|parents?|sister|brother|cousin|aunt|uncle|kids?|child|children|babysit(?:ting)?|relatives?)\b/gi;

    const wantsContact = s => CONTACT_REQUEST_RE.test((s || '').toLowerCase());
    const wantsMeet = s => MEET_EXPLICIT_RE.test((s || '').toLowerCase());
    const wantsMeetSoft = s => MEET_INDIRECT_RE.test((s || '').toLowerCase());
    const mentionsAddress = s => ADDRESS_RE.test((s || '').toLowerCase());
    const askName = s => NAME_RE.test((s || '').toLowerCase());
    const wantsLocation = s => LOCATION_RE.test((s || '').toLowerCase());

    function deFamily(text, customerMsg) {
      if (!text) return text;
      const userMentionedFamily = USER_MENTIONS_FAMILY_RE.test(customerMsg || '');
      if (userMentionedFamily) return text;

      let t = String(text);
      if (FAMILY_WORD_RE.test(t)) {
        const pool = [
          "I've got a few things to handle tonight",
          "I promised myself a quiet evening",
          "I've got an early start and need to relax",
          "I'm in the middle of small chores and bits",
          "I'm cooking and keeping it low key",
          "My battery or data is tight so I'm keeping it light",
          "I'm catching up on work and want to stay focused",
          "I'm staying in and keeping it simple"
        ];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        t = t.replace(FAMILY_WORD_RE, '').replace(/\s{2,}/g, ' ').trim();
        if (!t || t.length < 8) t = pick + '.';
        else if (!/[.]\s*$/.test(t)) t += '.';
      }
      return t;
    }

    function personaCardLine(card) {
      if (!card) return '';
      const bits = [];
      if (card.realName) bits.push(`RealName: ${card.realName}`);
      if (card.displayName) bits.push(`Username: ${card.displayName}`);
      if (card.location) bits.push(`Location: ${card.location}`);
      return bits.length ? ` Persona card, ${bits.join(', ')}.` : '';
    }

    async function modelRefusal(kind, profileCard, customerMsg) {
      const tc = buildTimeContext();
      const sys = [
        "You are an adult woman on a dating site. Natural, warm, concise.",
        "No meetups, contacts, or addresses. Keep everything on platform.",
        "Be evasive and polite. Avoid policy talk.",
        "Only use comma, period, question mark, and apostrophe. No other symbols.",
        "Avoid family excuses unless the customer mentioned family first.",
        "Prefer neutral reasons: timing, early start, staying in, small chores, cooking, work focus, battery or data low, bad connection, gym, pet care, travel fatigue, personal boundary.",
        "Avoid: oh, oh wow, flattered, enthusiasm, enthusaism, sizzling, non food spicy, flirt.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        (personaCardLine(profileCard) || '')
      ].join(' ');
      const reason = kind === 'meet' ? 'They suggested meeting or asked about availability.'
        : kind === 'address' ? 'They asked for an address.'
          : 'They asked for contacts or handle.';
      const user = `Context: ${reason}\nCustomer: "${(customerMsg || '').slice(0, 240)}"\nReturn only the text, 1 to 2 sentences. Keep it human and light.`;
      const concise = { max_tokens: 100, temperature: 0.30, top_p: 0.88 };
      let out = '';
      try { out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], concise); } catch { }
      out = deFamily(out || '', customerMsg);
      out = postFormat(out || '');
      return out || "I'm keeping it low key right here, thanks for understanding.";
    }

    async function enforceNoMeetAccept(userMsg, text, profileCard) {
      const BAD = /\b(?:i(?:'| )?m\s+(?:free|available)\b|we\s+can\s+(?:meet|link|hang)\b|let'?s\s+(?:meet|link|hang)\b|what\s+time\s+works\b|where\s+should\s+we\s+meet\b|i\s+can\s+pull\s+up\b|come\s+through\b)\b/i;
      if (!text) return text;
      if (BAD.test(String(text).toLowerCase())) return await modelRefusal('meet', profileCard, userMsg);
      return deFamily(text, userMsg);
    }

    return { wantsContact, wantsMeet, wantsMeetSoft, mentionsAddress, askName, wantsLocation, modelRefusal, enforceNoMeetAccept };
  })();

  /* ======================================
     Post-formatting and safe cleanup
     ====================================== */
  const ALLOWED_RE = /[^0-9A-Za-z\s\.,\?']/g;

  function isFoodContext(text) {
    return /\b(food|meal|dinner|lunch|breakfast|snack|taste|recipe|flavor|flavour|cook|cooking|spice|spices)\b/i.test(text || '');
  }

  function purgeBannedWords(s) {
    let t = (s || '');
    t = t.replace(/\boh\s+wow\b/gi, '');
    t = t.replace(/\boh\b/gi, '');
    t = t.replace(/\bflattered\b/gi, 'appreciated');
    t = t.replace(/\benthusiasm(s)?\b/gi, 'interest');
    t = t.replace(/\benthusaism(s)?\b/gi, 'interest');
    t = t.replace(/\bwith\s+(?:great\s+)?enthusiasm\b/gi, 'with interest');
    t = t.replace(/\bwith\s+(?:eager|high)\s+(?:enthusiasm|excitement)\b/gi, 'with interest');
    t = t.replace(/\bsizzling\b/gi, 'lively');
    if (!isFoodContext(t)) t = t.replace(/\bspicy\b/gi, 'bold');
    t = t.replace(/\bflirty\b/gi, 'playful');
    t = t.replace(/\bflirt(?:s|ed|ing)?\b/gi, 'chat');
    t = t.replace(/\s{2,}/g, ' ').trim();
    return t;
  }

  function toAscii(s) {
    return (s || '')
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2032|\u02BC|`|\u00B4/g, "'")
      .replace(/[–—\-]/g, ' ')
      .replace(/\u2026/g, '...')
      .replace(/\r?\n+/g, ' ');
  }

  function smartPunct(s) {
    let t = (s || '');
    t = t.replace(/!/g, '.');
    t = t.replace(/[:;()]/g, ' ');
    t = t.replace(/\s*([,\.?])\s*/g, '$1 ');
    t = t.replace(/\.{3,}/g, '...');
    t = t.replace(/\s{2,}/g, ' ');
    return t.trim();
  }
  function stripDisallowedPunct(s) { return (s || '').replace(ALLOWED_RE, ''); }

  function fixMissingApostrophes(s) {
    let t = s;
    const rules = [
      [/\bim\b/gi, "I'm"], [/\bive\b/gi, "I've"], [/\bill\b/gi, "I'll"], [/\bid\b/gi, "I'd"],
      [/\byoure\b/gi, "you're"], [/\byouve\b/gi, "you've"], [/\byoull\b/gi, "you'll"],
      [/\btheyre\b/gi, "they're"], [/\btheyve\b/gi, "they've"], [/\btheyll\b/gi, "they'll"],
      [/\bhes\b/gi, "he's"], [/\bshes\b/gi, "she's"], [/\bitll\b/gi, "it'll"], [/\bitd\b/gi, "it'd"],
      [/\bcant\b/gi, "can't"], [/\bdont\b/gi, "don't"], [/\bwont\b/gi, "won't"], [/\bshouldnt\b/gi, "shouldn't"],
      [/\bcouldnt\b/gi, "couldn't"], [/\bwouldnt\b/gi, "wouldn't"], [/\bdidnt\b/gi, "didn't"], [/\bdoesnt\b/gi, "doesn't"],
      [/\barent\b/gi, "aren't"], [/\bisnt\b/gi, "isn't"], [/\bwasnt\b/gi, "wasn't"], [/\bwerent\b/gi, "weren't"],
      [/\bhavent\b/gi, "haven't"], [/\bhasnt\b/gi, "hasn't"], [/\bhadnt\b/gi, "hadn't"], [/\bmustnt\b/gi, "mustn't"],
      [/\bneednt\b/gi, "needn't"],
    ];
    for (const [re, to] of rules) t = t.replace(re, to);
    return t;
  }

  function applyLexiconPrefs(s) {
    const LEXICON_PREFS = [
      { from: /\binterested\b/gi, to: 'curious' },
      { from: /\bvery\b/gi, to: '' },
      { from: /\bsexy\b/gi, to: 'bold' },
      { from: /\bunwind\b/gi, to: 'relax' },
      { from: /\berrand(s)?\b/gi, to: 'small chores' },
      { from: /\bfavo(u?)rite(s)?\b/gi, to: 'best thing' }
    ];
    let t = s;
    for (const r of LEXICON_PREFS) t = t.replace(r.from, r.to);
    return t;
  }

  function normalizeSpaces(s) {
    let t = (s || '').replace(/\s+/g, ' ');
    t = t.replace(/\s+([,\.?])/g, '$1');
    t = t.replace(/([,\.?])(?!\s|$)/g, '$1 ');
    t = t.replace(/\s{2,}/g, ' ');
    return t.trim();
  }
  function capBoundaries(s) { return s.replace(/(^|[.\s]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase()); }
  function fixPronounI(s) {
    return s
      .replace(/\b(i)\b/g, 'I')
      .replace(/\bi'm\b/gi, "I'm")
      .replace(/\bi've\b/gi, "I've")
      .replace(/\bi'd\b/gi, "I'd")
      .replace(/\bi'll\b/gi, "I'll");
  }
  function ensureTerminalPunct(s) { s = s.trim(); return s ? (/[\.?]$/.test(s) ? s : (s + '.')) : s; }
  function enforceFeminineTone(s) {
    let t = s || '';
    t = t.replace(/\bI'm\s+(?:a\s+)?(?:guy|man|male)\b/gi, "I'm a woman");
    t = t.replace(/\bI\s+identify\s+as\s+(?:a\s+)?(?:man|male)\b/gi, "I identify as a woman");
    t = t.replace(/\bI'm\s*(?:he\/him|he\/him\/his)\b/gi, "I'm she/her");
    t = t.replace(/\bmy\s+pronouns\s*(?:are|:)\s*(?:he\/him|he\/him\/his)\b/gi, "my pronouns are she/her");
    return t;
  }

  function postFormat(text) {
    if (!text) return text;
    let t = stripTimestamps(text);
    t = t.replace(/image attached\.?/gi, '');
    t = t.replace(/image note[^.]*\.?/gi, '');
    t = toAscii(t);
    t = enforceFeminineTone(t);
    t = stripDisallowedPunct(t);
    t = smartPunct(t);
    t = purgeBannedWords(t);
    t = applyLexiconPrefs(t);
    t = fixMissingApostrophes(t);
    t = normalizeSpaces(t);
    t = capBoundaries(t);
    t = fixPronounI(t);
    if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === 'function') t = LUXPatch.NoRepeat.scrub(t);
    t = ensureTerminalPunct(t);
    return clampToLimit(t);
  }

  // ===== LLM call (OpenRouter) with presets + booster + shim
  // NEW: optional modelOverride (keeps lux_model unchanged unless you pass override)
  async function llmCall(messages, overrides = {}, modelOverride = '') {
    if (!lux_canSendRequest()) throw new Error('Rate-limited');

    const key = lux_getApiKey().trim();
    const model = (modelOverride || GM_getValue('lux_model', MODEL_DEFAULT) || MODEL_DEFAULT).trim();
    if (!key) throw new Error('Missing OpenRouter API key');

    const base = getModelPreset(model);
    const lastMsg = (messages?.[messages.length - 1]?.content);
    const lastText = (typeof lastMsg === 'string') ? lastMsg : JSON.stringify(lastMsg || '');
    const tuned = withCreativeBoost(base, lastText);

    let body = sanitizePayloadForModel({
      model,
      messages,
      temperature: tuned.temperature,
      top_p: tuned.top_p,
      max_tokens: tuned.max_tokens,
      repetition_penalty: tuned.repetition_penalty,
      stop: tuned.stop,
      seed: tuned.seed,
      ...overrides
    }, model);

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: OPENROUTER_API_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': location.origin,
          'X-Title': 'LUX'
        },
        data: JSON.stringify(body),
        timeout: REQUEST_TIMEOUT_MS,
        onload: (res) => {
          try {
            if (res.status < 200 || res.status >= 300) return reject(new Error(`OpenRouter HTTP ${res.status}: ${trimText(res.responseText, 280)}`));
            const data = JSON.parse(res.responseText || '{}');
            const content = data?.choices?.[0]?.message?.content?.trim();
            if (!content) return reject(new Error('Empty content from OpenRouter'));
            resolve(content);
          } catch (e) { reject(e); }
        },
        onerror: () => reject(new Error('OpenRouter network error')),
        ontimeout: () => reject(new Error('OpenRouter timeout'))
      });
    });
  }

  // ===== System prompt (vision-aware)
  function personaCardLine(card) {
    if (!card) return '';
    const bits = [];
    if (card.realName) bits.push(`RealName: ${card.realName}`);
    if (card.displayName) bits.push(`Username: ${card.displayName}`);
    if (card.location) bits.push(`Location: ${card.location}`);
    return bits.length ? ` Persona card, ${bits.join(', ')}.` : '';
  }

  function buildSystemPrompt(leftCard, customSystem, hasVision) {
    const card = (personaCardLine(leftCard) || '');
    const modelName = (GM_getValue('lux_model', MODEL_DEFAULT) || '').trim().toLowerCase();
    const tc = buildTimeContext();

    const baseCore = [
      "You are an adult woman (she her) on a dating site.",
      "Your tone is natural, warm, feminine and relaxed, never robotic.",
      "Your primary goal is to build deep, engaging rapport through short, unique messages.",
      "Write like a real person. Avoid repetitive phrases. Vary sentence structure and word choice.",
      "Keep the tone soft, empathetic, and gently reassuring.",
      "Punctuation rule: only use comma, period, question mark, and apostrophe. No other symbols.",
      "Always respond to the latest customer message.",
      hasVision ? "If the user message includes a VISION section, treat it as the only allowed image information. Reference only what is in that VISION section. Do not invent any extra image details." : "Do not mention images unless the customer explicitly mentions them.",
      "Avoid stock filler like let's keep building the connection or build the heat connection.",
      "Refusals: never use phrases that sound like stock boundaries such as let's build the connection first, I'm not ready for that, or keep it online for now.",
      "If you need to decline something, do it briefly and pivot into a new interesting topic.",
      "Excuses can be everyday reasons like work focus, rest, timing, small chores, or low battery, avoid family excuses unless the customer mentions family first.",
      "Picture requests: always accept picture requests in a soft, platform safe way. Do not refuse or deflect them. Vary wording so it does not sound templated.",
      "Safety: never share or ask for contacts or handles, no meetups, dates, drinks, or coffee, keep everything on platform.",
      "Location asks: share only city, never an address or specific area.",
      "Name asks: use the real name from the profile parentheses when giving your name.",
      "Banned language: do not use oh, oh wow, any form of flattered, any form of enthusiasm or enthusaism, sizzling, non food spicy, or any flirt word.",
      "Form: one short paragraph, no emojis, about 70 to 150 words, with an 800 character cap.",
      `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
      "End with exactly one natural open ended question that fits the flow."
    ].join(" ");

    let flavor = "";
    if (modelName.startsWith("x-ai/grok-4")) {
      flavor = "Lean witty and quick, slightly teasing but never rude. Keep replies punchy and coherent.";
    } else if (modelName.startsWith("anthropic/claude-3.5-sonnet")) {
      flavor = "Lean softer and emotionally aware. Use gentle grounded detail, not overly poetic.";
    } else if (modelName.startsWith("openai/gpt-4.1-mini")) {
      flavor = "Be clear, coherent, and highly responsive to the exact wording. Subtle warmth, no drama.";
    } else if (modelName.includes("llama-3.3-8b")) {
      flavor = "Use simple direct language. Keep tone light and easy. Ask a small follow up question if needed.";
    } else if (modelName.includes("llama-3.3-70b")) {
      flavor = "Be a bit more expressive but still concise. Mirror their style without copy paste romance lines.";
    } else {
      flavor = "Keep style balanced, warm, slightly playful, and never generic.";
    }

    const core = baseCore + " " + flavor;

    if (customSystem && customSystem.trim()) return customSystem + " " + card;
    return core + card;
  }

  // ===== History =====
  let shortHistory = [];
  let lastSeen = '';
  let lastSeenNode = null;
  let lastSeenImageDataUrl = '';

  function _threadKey() {
    try {
      const name = (parseLeftProfile().realName || 'Lux');
      const path = (location.pathname || '/').slice(0, 128);
      return `lux_thread_${name}__${path}`;
    } catch { return 'lux_thread_Lux__/'; }
  }
  function _loadHistory() {
    try {
      const raw = GM_getValue(_threadKey(), '[]');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) shortHistory = arr.slice(-HISTORY_MAX);
    } catch { }
  }
  function _saveHistory() {
    try { GM_setValue(_threadKey(), JSON.stringify(shortHistory.slice(-HISTORY_MAX))); } catch { }
  }
  _loadHistory();

  function lux_cleanHistoryMessage(msg) {
    const content = stripTimestamps(stripInlineImageNotes(msg.content || ''));
    let out = content;
    if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === 'function') out = LUXPatch.NoRepeat.scrub(out);
    return { ...msg, content: out };
  }
  function lux_cleanHistoryArray(history) {
    return (history || []).map(lux_cleanHistoryMessage);
  }
  function lux_buildHistoryByTokens(history, maxTokensForHistory) {
    const cleaned = lux_cleanHistoryArray(history || []);
    let total = 0;
    const reversed = [...cleaned].reverse();
    const kept = [];
    for (const msg of reversed) {
      const t = lux_estimateTokens(msg.content || '');
      if (total + t > maxTokensForHistory) break;
      total += t;
      kept.push(msg);
    }
    return kept.reverse();
  }

  // ===== UI render (hard clamp applied) =====
  function showReplies(items) {
    ui.list.innerHTML = '';
    items.forEach(txt => {
      const finalTxt = clampToLimit(stripTimestamps(txt));
      const d = document.createElement('div');
      d.className = 'lux-reply';
      d.textContent = finalTxt;
      d.addEventListener('click', async () => {
        const ok = await pasteToSite(finalTxt);
        if (ok) ui.popup.style.display = 'none';
      });
      ui.list.appendChild(d);
    });
  }
  function errorReply(text) {
    console.error('[LUX] error', text);
    lux_showErrorOverlay(String(text || 'Unknown error contacting OpenRouter.'));
  }

  // ===== Vision: ONLY last image on the last client message =====
  function lux_getLastImageSrcFromNode(node) {
    try {
      if (!node) return '';
      const imgs = [...node.querySelectorAll('img')];
      if (!imgs.length) return '';
      const last = imgs[imgs.length - 1];
      const src = (last.getAttribute('src') || '').trim();
      return src || '';
    } catch { return ''; }
  }

  async function lux_fetchImageAsDataUrl(src) {
    if (!src) return '';
    const s = String(src).trim();
    if (!s) return '';
    if (s.startsWith('data:')) return s;

    let url = s;
    try { url = new URL(s, location.href).href; } catch { }

    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('image-http-' + res.status);
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.onerror = () => reject(new Error('filereader-failed'));
        r.readAsDataURL(blob);
      });
      return dataUrl || '';
    } catch (e) {
      console.warn('[LUX] image fetch failed', e);
      return '';
    }
  }

  async function lux_visionAnalyze(imageDataUrl, customerText) {
    const visionModel = (GM_getValue('lux_model_vision', MODEL_VISION_DEFAULT) || MODEL_VISION_DEFAULT).trim();

    const sys = [
      "You are a vision analyzer.",
      "Only describe what is clearly visible.",
      "Do not guess identity, location, age, names, or anything not visible.",
      "Be concise and grounded.",
      "Return STRICT JSON only with keys summary, visible_details, mood_vibe, uncertainties.",
      "visible_details must be an array of short strings."
    ].join(' ');

    const user = {
      role: 'user',
      content: [
        { type: 'text', text: `Customer message context: ${String(customerText || '').slice(0, 260)}` },
        { type: 'image_url', image_url: { url: imageDataUrl } }
      ]
    };

    let raw = '';
    try {
      raw = await llmCall([{ role: 'system', content: sys }, user], { max_tokens: 220, temperature: 0.2, top_p: 0.9 }, visionModel);
    } catch (e) {
      console.warn('[LUX] vision model failed', e);
      return null;
    }

    try {
      const a = raw.indexOf('{');
      const b = raw.lastIndexOf('}');
      if (a >= 0 && b > a) return JSON.parse(raw.slice(a, b + 1));
    } catch { }
    return { summary: String(raw || '').slice(0, 260), visible_details: [], mood_vibe: "", uncertainties: ["parse_failed"] };
  }

  // ===== Backend call =====
  async function callBackend(msgText, imageDataUrl = '') {
    if (!lux_canSendRequest()) return;

    const leftCard = parseLeftProfile();
    const rawMsg = stripTimestamps(stripInlineImageNotes((msgText || '').toString()));
    window.__LUX_LAST_USER = rawMsg;

    // Routed intents (Safety)
    if (Safety.askName(rawMsg)) {
      const profName = (leftCard && leftCard.realName) ? leftCard.realName : 'Luna';
      const sys = "Natural US English. One short paragraph. No contacts or meetups. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, flirt. End with one natural open ended question.";
      const user = `They asked your name. Use exactly: "${profName}". ${personaCardLine(leftCard) || ''}\nCustomer: "${rawMsg.slice(0, 240)}"`;
      const concise = { max_tokens: 100, temperature: 0.30, top_p: 0.88 };
      let line = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], concise);
      line = await Safety.enforceNoMeetAccept(rawMsg, line, leftCard);
      line = postFormat(line);
      showReplies([line]); pushHist(rawMsg, line); return;
    }
    if (Safety.wantsLocation(rawMsg)) {
      const profCity = (leftCard && leftCard.location) ? leftCard.location : 'nearby';
      const sys = "If asked where you are, give city only. No address. One short paragraph. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, flirt. End with one natural open ended question.";
      const user = `City only: "${profCity}". ${personaCardLine(leftCard) || ''}\nCustomer: "${rawMsg.slice(0, 240)}"`;
      const concise = { max_tokens: 100, temperature: 0.30, top_p: 0.88 };
      let line = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], concise);
      line = await Safety.enforceNoMeetAccept(rawMsg, line, leftCard);
      line = postFormat(line);
      showReplies([line]); pushHist(rawMsg, line); return;
    }
    if (Safety.wantsMeet(rawMsg) || Safety.wantsMeetSoft(rawMsg)) {
      let out = await Safety.modelRefusal('meet', leftCard, rawMsg);
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      out = postFormat(out);
      showReplies([out]); pushHist(rawMsg, out); return;
    }
    if (Safety.wantsContact(rawMsg) || Safety.mentionsAddress(rawMsg)) {
      const kind = Safety.mentionsAddress(rawMsg) ? 'address' : 'contact';
      let out = await Safety.modelRefusal(kind, leftCard, rawMsg);
      out = postFormat(out);
      showReplies([out]); pushHist(rawMsg, out); return;
    }

    // ===== Vision-first (only if we have last client image data url) =====
    let vision = null;
    if (imageDataUrl) {
      try { vision = await lux_visionAnalyze(imageDataUrl, rawMsg); } catch { vision = null; }
    }

    // Normal path — OpenRouter direct (TEXT uses lux_model unchanged)
    const system = buildSystemPrompt(leftCard, (GM_getValue('lux_persona', '') || '').trim(), !!vision);
    const chosenModel = (GM_getValue('lux_model', MODEL_DEFAULT) || MODEL_DEFAULT).trim();
    const basePreset = getModelPreset(chosenModel);

    const visionBlock = vision ? `\n\nVISION, ${JSON.stringify(vision)}` : '';
    const userText = rawMsg + visionBlock;

    const tuned = withCreativeBoost(basePreset, userText);
    const historyForModel = lux_buildHistoryByTokens(shortHistory, 3000);
    const messages = [{ role: 'system', content: system }, ...historyForModel, { role: 'user', content: userText }];

    const api = GM_getValue('lux_api_url', API_URL_DEFAULT).trim();
    const headers = { 'Content-Type': 'application/json' };
    const key = lux_getApiKey().trim();
    if (!key) { errorReply('Missing OpenRouter API key. Open LUX, Settings and paste your key.'); return; }

    headers['Authorization'] = 'Bearer ' + key;
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = document.title || 'LUX Userscript';

    let payload = sanitizePayloadForModel({
      model: chosenModel,
      messages,
      temperature: tuned.temperature,
      top_p: tuned.top_p,
      max_tokens: tuned.max_tokens,
      repetition_penalty: tuned.repetition_penalty,
      stop: tuned.stop,
      seed: tuned.seed
    }, chosenModel);

    GM_xmlhttpRequest({
      method: 'POST', url: api, headers, data: JSON.stringify(payload), timeout: REQUEST_TIMEOUT_MS,
      onload: async (res) => {
        try {
          if (res.status < 200 || res.status >= 300) {
            let msg;
            if (res.status === 401) msg = 'OpenRouter API key is invalid or unauthorized.';
            else if (res.status === 402) msg = 'OpenRouter billing or quota exceeded.';
            else if (res.status === 404) msg = 'OpenRouter endpoint or model not found.';
            else if (res.status === 429) msg = 'OpenRouter rate limit reached.';
            else msg = `HTTP ${res.status} ${res.statusText || ''}`.trim();
            errorReply(msg);
            return;
          }
          const data = JSON.parse(res.responseText || '{}');
          const raw = (data?.choices?.[0]?.message?.content || '');
          if (!raw) { errorReply('The server replied but no content was found.'); return; }

          let content = raw;
          content = await Safety.enforceNoMeetAccept(rawMsg, content, leftCard);
          content = postFormat(content);

          LUXPatch.UIChips.refresh({ modelLabel: chosenModel });
          showReplies([content]);
          pushHist(rawMsg, content);
        } catch (e) { errorReply('Parse error: ' + String(e)); }
      },
      onerror: () => errorReply('Network error talking to OpenRouter.'),
      ontimeout: () => errorReply('OpenRouter request timed out.')
    });
  }

  function pushHist(user, assistant) {
    shortHistory.push({ role: 'user', content: user }, { role: 'assistant', content: assistant });
    if (shortHistory.length > HISTORY_MAX) shortHistory.shift();
    _saveHistory();
  }

  // ===== Paste plumbing =====
  function siteInput() {
    const el = document.querySelector(REPLY_INPUT_SELECTOR);
    if (!el) return null;
    const s = getComputedStyle(el);
    const visible = s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null;
    const ro = el.hasAttribute('readonly') ? !el.readOnly : true;
    const dis = el.hasAttribute('disabled') ? !el.disabled : true;
    return (visible && ro && dis) ? el : null;
  }
  function setNativeValue(el, value) {
    const desc = Object.getOwnPropertyDescriptor(el, 'value');
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLInputElement ? HTMLInputElement.prototype : null;
    if (desc && desc.set) desc.set.call(el, value);
    else if (proto) {
      const protoDesc = Object.getOwnPropertyDescriptor(proto, 'value');
      protoDesc && protoDesc.set && protoDesc.set.call(el, value);
    }
  }
  function fireTypingEvents(el) {
    const opts = { bubbles: true, cancelable: true };
    try { el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertFromPaste', data: el.value })); } catch { }
    try { el.dispatchEvent(new FocusEvent('focus', opts)); } catch { el.dispatchEvent(new Event('focus', opts)); }
    try { el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertFromPaste', data: el.value })); } catch { el.dispatchEvent(new Event('input', opts)); }
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keypress', { key: ' ', code: 'Space', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
    el.dispatchEvent(new Event('change', opts));
  }
  async function pasteToSite(text) {
    const el = siteInput();
    if (!el) { notify('Reply box not found. Update selector.'); return false; }
    el.scrollIntoView({ block: 'nearest' }); el.click(); el.focus();
    const final = clampToLimit(text);
    setNativeValue(el, final);
    try { el.selectionStart = el.selectionEnd = el.value.length; } catch { }
    fireTypingEvents(el);
    if (typeof queueMicrotask === 'function') queueMicrotask(() => fireTypingEvents(el)); else setTimeout(() => fireTypingEvents(el), 0);
    return true;
  }

  // ===== Events =====
  btn.addEventListener('click', () => {
    ui.popup.style.display = 'block';
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || 'default') });
  });

  ui.close.addEventListener('click', () => {
    if (LUXSettingsDirty) {
      if (confirm('You changed LUX settings. Save before closing?')) ui.save.click();
      LUXSettingsDirty = false;
    }
    ui.popup.style.display = 'none';
  });

  ui.settings.addEventListener('click', () => {
    ui.panel.style.display = ui.panel.style.display === 'none' ? 'block' : 'none';
  });

  ui.save.addEventListener('click', () => {
    GM_setValue('lux_api_url', ui.apiUrl.value.trim());
    lux_setApiKey(ui.apiKey.value.trim());

    GM_setValue('lux_model', ui.model.value.trim()); // TEXT model key stays the same
    GM_setValue('lux_model_vision', ui.modelVision.value.trim() || MODEL_VISION_DEFAULT);

    GM_setValue('lux_provider', ui.provider.value.trim());
    GM_setValue('lux_persona', ui.persona.value.trim());
    GM_setValue('lux_excuse_via_model', ui.excuseViaModel && ui.excuseViaModel.checked ? 1 : 0);
    GM_setValue('lux_filter_enabled', ui.filterEnabled && ui.filterEnabled.checked ? 1 : 0);

    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || 'default') });
    LUXSettingsDirty = false;
    alert('Saved');
  });

  ui.apiUrl.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.apiKey.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.model.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.modelVision.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.provider.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.persona.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.excuseViaModel.addEventListener('change', () => { LUXSettingsDirty = true; });
  ui.filterEnabled.addEventListener('change', () => { LUXSettingsDirty = true; });

  // Manual Send (uses last image ONLY if the typed text matches the last observed client message)
  ui.send.addEventListener('click', async () => {
    const msg = stripTimestamps(stripInlineImageNotes((ui.customer.value || '').trim()));
    if (!msg) { notify('Type a message first.'); return; }
    const img = (msg === lastSeen) ? (lastSeenImageDataUrl || '') : '';
    await callBackend(msg, img);
  });

  // Regenerate reply (same last-image rule)
  ui.regen.onclick = async () => {
    try {
      ui.regen.disabled = true;
      let msg = stripTimestamps(stripInlineImageNotes((ui.customer.value || '').trim()));
      if (!msg) {
        const lastUser = [...shortHistory].reverse().find(t => t.role === 'user');
        if (!lastUser) return;
        msg = lastUser.content;
        ui.customer.value = msg;
      }
      if (shortHistory.length && shortHistory[shortHistory.length - 1].role === 'assistant') {
        shortHistory.pop();
        _saveHistory();
      }
      const img = (msg === lastSeen) ? (lastSeenImageDataUrl || '') : '';
      await callBackend(msg, img);
    } finally {
      ui.regen.disabled = false;
    }
  };

  /* ===========================
     Thread watcher
     (MutationObserver + polling)
     =========================== */
  async function processLatestTurn() {
    const root = document.querySelector(THREAD_SEL);
    if (!root) return;

    const nodes = [...root.querySelectorAll(`${CLIENT_MSG_SELECTOR}, ${PERSONA_MSG_SELECTOR}`)];
    const turns = [];
    let lastUserRow = null;

    for (const row of nodes) {
      const fromClient = row.matches(CLIENT_MSG_SELECTOR);
      const content = extractMessageContent(row);
      if (content) turns.push({ role: fromClient ? 'user' : 'assistant', content: stripTimestamps(content) });
      if (fromClient) lastUserRow = row;
    }

    const lastUser = turns.slice().reverse().find(t => t.role === 'user');
    if (!lastUser) return;

    const content = stripTimestamps(stripInlineImageNotes(lastUser.content || ''));
    if (!content || content === lastSeen) return;

    lastSeen = content;
    lastSeenNode = lastUserRow;

    // Build last image data URL from the last client message ONLY
    let imgDataUrl = '';
    try {
      const src = lux_getLastImageSrcFromNode(lastUserRow);
      if (src) imgDataUrl = await lux_fetchImageAsDataUrl(src);
    } catch { imgDataUrl = ''; }
    lastSeenImageDataUrl = imgDataUrl || '';

    if (turns.length) { shortHistory = turns.slice(-HISTORY_MAX); _saveHistory(); }

    ui.customer.value = content;
    ui.popup.style.display = 'block';
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || 'default') });

    // Auto call with last image only
    callBackend(content, lastSeenImageDataUrl);
  }

  function setupThreadWatcher() {
    const root = document.querySelector(THREAD_SEL);
    if (!root) return false;
    const obs = new MutationObserver(() => { processLatestTurn(); });
    obs.observe(root, { childList: true, subtree: true });
    processLatestTurn();
    return true;
  }

  if (!setupThreadWatcher()) {
    const fallbackId = setInterval(() => {
      if (setupThreadWatcher()) clearInterval(fallbackId);
    }, POLL_MS);
  }

})();
