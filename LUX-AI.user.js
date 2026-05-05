// ==UserScript==
// @name         LUX Starr Framework v13 (OpenRouter • Encrypted Key • Creative Booster • Strict Access • ConeID Gate)
// @namespace    http://tampermonkey.net/
// @version      14.6.26
// @description  LUX custom persona fully functional; LUX feminine popup restore: keeps v14.6.12 natural voice, automatic customer-tone detection, faster silent regeneration, strict no-repeat, and adds a hard popup/observer fail-safe.
// @match        https://myoperatorservice.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @connect      openrouter.ai
// @connect      api.openrouter.ai
// @connect      script.google.com
// @run-at       document-end
// ==/UserScript==

const ACCESS_API_ENDPOINT = "https://script.google.com/macros/s/AKfycbxBCywRTXBGE1AgLmOPON-xmcoMg09I7ETeUc6ih-U8vpqjWXOWfsVRkwRctZdh4nQ/exec";

function lux_promptConeId() {
  return new Promise(resolve => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:system-ui,sans-serif;";
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

function lux_lockUI(reason) {
  const div = document.createElement("div");
  div.style.cssText = "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.9);color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;padding:32px;font-size:18px;";
  div.textContent = `LUX access blocked: ${reason || "not whitelisted or license server unreachable"}.`;
  document.body.appendChild(div);
}

function lux_showErrorOverlay(msg) {
  const id = "lux-error-overlay";
  let div = document.getElementById(id);
  if (!div) {
    div = document.createElement("div");
    div.id = id;
    div.style.cssText = "position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,0.88);color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;padding:32px;";
    const inner = document.createElement("div");
    inner.style.cssText = "max-width:420px;background:#111;border-radius:12px;border:1px solid #0b3d91;padding:20px;";
    const title = document.createElement("div");
    title.style.cssText = "font-size:18px;font-weight:700;margin-bottom:8px;";
    title.textContent = "LUX connection issue";
    const body = document.createElement("div");
    body.id = "lux-error-body";
    body.style.cssText = "font-size:14px;line-height:1.45;margin-bottom:16px;white-space:pre-wrap;";
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

async function lux_checkOnlineAccess(coneId) {
  if (!ACCESS_API_ENDPOINT) return { allowed: false, reason: "no-endpoint-configured" };
  try {
    const url = `${ACCESS_API_ENDPOINT}?coneid=${encodeURIComponent(coneId)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return { allowed: false, reason: "apps-script-http-" + res.status };
    return await res.json();
  } catch (e) {
    console.warn("LUX check error", e);
    return { allowed: false, reason: "network-error" };
  }
}

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

async function lux_ensureAccess() {
  let cache = lux_getAccessCache();
  let coneId = cache && cache.coneId;
  if (!coneId) {
    coneId = await lux_promptConeId();
    if (!coneId) {
      lux_lockUI("no ConeID provided");
      return false;
    }
    cache = { coneId };
  }

  const result = await lux_checkOnlineAccess(coneId);
  if (!result || !result.allowed) {
    const reason = result && result.reason ? result.reason : "not-allowed";
    lux_setAccessCache({ coneId, lastStatus: "denied", lastCheckMs: Date.now(), expiresAt: null });
    lux_lockUI(reason);
    return false;
  }

  lux_setAccessCache({ coneId, lastStatus: "allowed", lastCheckMs: Date.now() });
  return true;
}

(async function () {
  "use strict";

  const accessOk = await lux_ensureAccess();
  if (!accessOk) return;

  const API_URL_DEFAULT = "https://openrouter.ai/api/v1/chat/completions";
  const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
  const MODEL_DEFAULT = "x-ai/grok-4-fast";
  const POLL_MS = 3000;
  const HISTORY_MAX = 14;
  const REQUEST_TIMEOUT_MS = 28000;
  const MAX_CHARS = 800;
  const LUX_DEBUG_LOGGING = true;
  const LUX_NOTE_RETRY_DELAYS = [0, 500, 1200, 2200];
  const LUX_NOTE_AUTOSAVE = false;

  const LUX_SECRET = "lux_starr_secret_salt_v1";
  const LUX_API_KEY_ENC = "lux_openrouter_key_enc";
  const LUX_API_KEY_PLAIN_OLD = "lux_openrouter_key";

  const REPLY_INPUT_SELECTOR = "textarea#reply-textarea.form-control.border-start-0.border-end-0";
  const PERSONA_NAME_SEL = "h5.fw-bold.mb-1";
  const PERSONA_LOC_SEL = "h6.text-black-50";
  const PERSONA_COUNTRY_SEL = "div.col-auto.navbar-text.fw-bold.d-inline";
  const THREAD_SEL = "div#message-list.flex-grow-1.overflow-auto.p-4";
  const CLIENT_MSG_SELECTOR = "div.d-flex.flex-row-reverse.my-2.message-box";
  const PERSONA_MSG_SELECTOR = "div.d-flex.flex-row.my-2";
  const MEMBER_TIME_SEL = "span#memberTime.fw-bold";
  const AGE_SELECTOR = "td.p-1.ps-3.bg-light-subtle";
  const MEMBER_NOTE_SAVE_SELECTOR = "button.btn.btn-secondary";
  const ABOUT_USER_SELECTOR = "p#about-user";
  const LUX_NOTE_LAST_HASH_KEY = "lux_member_note_last_hash_v1";

  const CLIENT_IMAGE_SELECTOR = "img.rounded.mb-2";
  const LUX_IMG_START = "LUX_IMG_NOTES_START";
  const LUX_IMG_END = "LUX_IMG_NOTES_END";

  const MODEL_FALLBACK_PRESET = {
    temperature: 0.58,
    top_p: 0.92,
    repetition_penalty: 1.02,
    max_tokens: 240,
    stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
    seed: 11
  };

  const MODEL_PRESETS = {
    "x-ai/grok-4-fast": { temperature: 0.78, top_p: 0.96, repetition_penalty: 1.04, max_tokens: 250, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 37 },
    "deepseek/deepseek-chat": { temperature: 0.86, top_p: 0.94, repetition_penalty: 1.05, max_tokens: 260, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 41 },
    "openai/gpt-4.1": { temperature: 0.64, top_p: 0.92, repetition_penalty: 1.03, max_tokens: 255, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 33 },
    "openai/gpt-4.1-mini": { temperature: 0.68, top_p: 0.93, repetition_penalty: 1.04, max_tokens: 235, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 29 },
    "anthropic/claude-3.5-sonnet": { temperature: 0.66, top_p: 0.94, repetition_penalty: 1.02, max_tokens: 255, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 53 }
  };

  const LUX_ALLOWED_MODELS = Object.keys(MODEL_PRESETS);
  const LUX_TONE_STYLE_KEY = "lux_tone_style_v1";
  const LUX_TONE_STYLES = ["sweet", "naughty", "deflect", "humorous", "generous"];

  const LUX_RATE_WINDOW_MS = 10000;
  const LUX_RATE_MAX_REQ = 10;
  const LUX_RATE_LOG_KEY = "lux_req_log_v1";
  const LUX_CREATIVE_STATE_KEY = "lux_creative_state_v1";
  const LUX_REPLY_FP_KEY = "lux_reply_fp_v2";
  const LUX_THEME_MEMORY_KEY = "lux_theme_memory_v1";
  const LUX_REACTION_COOLDOWN_KEY = "lux_reaction_cooldown_v1";
  const LUX_REFUSAL_MEMORY_KEY = "lux_refusal_memory_v1";


  const LUX_REGEN_MEMORY_KEY = "lux_regen_memory_v1";

  function lux_regenMemoryKey() {
    try { return `${_threadKey()}__${LUX_REGEN_MEMORY_KEY}`; }
    catch { return LUX_REGEN_MEMORY_KEY; }
  }

  function lux_getRegenMemory() {
    try {
      const arr = JSON.parse(GM_getValue(lux_regenMemoryKey(), "[]"));
      return Array.isArray(arr) ? arr.slice(-10) : [];
    } catch {
      return [];
    }
  }

  function lux_pushRegenMemory(text) {
    try {
      const clean = normalizeLooseText(stripStampsAll(text || ""));
      if (!clean) return;
      const arr = lux_getRegenMemory();
      arr.push(clean);
      while (arr.length > 10) arr.shift();
      GM_setValue(lux_regenMemoryKey(), JSON.stringify(arr));
    } catch {}
  }

  function luxCollectVisibleReplies() {
    try {
      return [...document.querySelectorAll("#lux-list .lux-reply")]
        .map(el => normalizeLooseText(el.textContent || ""))
        .filter(Boolean)
        .slice(-4);
    } catch {
      return [];
    }
  }

  function luxBuildRegenerationDirective(customerMsg, previousReplies = [], attempt = 1) {
    const msg = normalizeLooseText(stripStampsAll(customerMsg || "")).slice(0, 420);
    const prior = dedupeCsvItems([...(previousReplies || []), ...lux_getRegenMemory(), ...lux_getRecentReplies()])
      .map(x => normalizeLooseText(x).slice(0, 260))
      .filter(Boolean)
      .slice(-10);
    const boundary = luxIsBoundaryRequest(msg);
    const profileCheck = luxWantsProfileCheck(msg);
    const imageTurn = /\b(?:photo|picture|image|pic|selfie|screenshot|profile picture)\b/i.test(msg);
    return [
      "Regeneration quality mode is active.",
      "Do not simply paraphrase the last answer. Produce a clearly better alternative with a different angle, rhythm, opening, emotional texture, and ending.",
      "The new reply must feel more human, more specific to the customer's actual message, and less like a dating script.",
      "Do not reuse the same alibi, boundary path, apology shape, reassurance shape, image opener, profile-check wording, or final question shape.",
      "Avoid starting with the same first idea or first six words as any previous reply.",
      "If the previous answer was safe but flat, make this one warmer, more grounded, and more conversational without adding fake drama.",
      "If a final question feels forced, remove it. A clean warm ending is better than filler.",
      boundary ? "This is a boundary type message. Refuse gently without sounding rude, dismissive, irritated, scripted, or final. Keep him invited into the conversation without giving contact, meetup, address, or social details." : "",
      profileCheck ? "This is a profile-check message. Do not say you peeked, checked, looked at, read, or reviewed the profile. React naturally to the substance only." : "",
      imageTurn ? "This may involve an image. Only mention an image if it is attached to the latest customer message, and mention a concrete visible detail rather than vague vibe language." : "",
      msg ? `Latest customer message, ${msg}.` : "",
      luxBuildCustomerCoverageDirective(msg),
      prior.length ? `Previous replies and wording to avoid completely, ${prior.join(" | ")}.` : "",
      `Regeneration attempt number ${Number(attempt) || 1}. Make it noticeably fresher than the last output.`
    ].filter(Boolean).join(" ");
  }



  function luxBuildOperatorBridgeDirective(operatorBridge = "") {
    const bridge = normalizeLooseText(stripStampsAll(operatorBridge || "")).slice(0, 260);
    if (!bridge) return "";
    const looksRandom = luxLooksLikeOperatorGibberish(bridge);
    return [
      "The text currently typed in the LUX input is an operator regeneration bridge, not a new customer message.",
      "Do not quote it, answer it, or let it replace the customer's latest message.",
      "Keep the typed bridge exactly as it is in the input box. Never erase it, rewrite it, or put the customer message back into the box during regeneration.",
      "Use the real latest customer message from chat history as the reply target, while leaving the typed box alone.",
      looksRandom ? "The bridge looks like random letters, so ignore it completely and regenerate from the latest customer message and conversation memory." : `If the bridge contains a useful intent, use it only as private guidance for improving the reply: ${bridge}.`,
      "The final answer must still respond to the customer's actual latest message, including any meetup, contact, address, social media, image, or profile context in that message."
    ].filter(Boolean).join(" ");
  }



  function luxBuildCustomerCoverageDirective(customerMsg = "") {
    const msg = normalizeLooseText(stripStampsAll(customerMsg || ""));
    if (!msg) return "";
    const hasCompliment = /\b(?:sexy|beautiful|pretty|gorgeous|cute|hot|attractive|lovely|sweet|nice|amazing|stunning|like\s+you|love\s+your|you\s+look|your\s+body|your\s+smile|your\s+eyes)\b/i.test(msg);
    const hasDirectDesire = /\b(?:want\s+you|turn\s+me\s+on|all\s+night|kiss|touch|bed|fun|naughty|desire|craving|come\s+over|be\s+there\s+soon)\b/i.test(msg);
    const hasBoundaryAsk = /\b(?:meet|meetup|meet\s+up|come\s+over|come\s+to\s+you|your\s+place|my\s+place|location|address|where\s+do\s+u\s+live|where\s+do\s+you\s+live|phone|cell|number|call\s+me|text\s+me|whatsapp|telegram|snapchat|instagram|\big\b|email)\b/i.test(msg);
    const hasQuestion = /\?/.test(msg) || /\b(?:where|why|how|what|when|would\s+you|can\s+you|are\s+you|do\s+you)\b/i.test(msg);
    const signals = [];
    if (hasCompliment) signals.push("a compliment or attraction signal");
    if (hasDirectDesire) signals.push("direct desire or sexual interest");
    if (hasBoundaryAsk) signals.push("a meetup, location, contact, address, phone, or social request");
    if (hasQuestion) signals.push("a direct question or request");
    if (!signals.length) return "";
    return [
      `Coverage rule, the customer's message contains ${signals.join(", ")}.`,
      "Do not flatten the whole message into only one generic refusal or only one generic question.",
      "Answer the main emotional pieces in order, briefly and naturally.",
      hasCompliment ? "If he compliments you, receive it warmly in your own words before any boundary, without sounding vain or scripted." : "",
      hasDirectDesire ? "If he is direct or sexual, acknowledge the boldness or desire without matching explicit detail too heavily." : "",
      hasBoundaryAsk ? "If he asks for meetup, location, phone, address, or social media, keep the boundary soft and clear, but do not ignore his compliment, humor, or other details." : "",
      "The reply should feel like one real woman reading the whole message, not a bot reacting to one keyword."
    ].filter(Boolean).join(" ");
  }

  function luxTunePayloadForRegeneration(payload, attempt = 1) {
    const p = { ...(payload || {}) };
    const n = Math.max(1, Math.min(6, Number(attempt) || 1));
    p.temperature = Math.min(1.04, Math.max(0.60, Number(p.temperature || 0.7) + 0.06 + n * 0.012));
    p.top_p = Math.min(0.97, Math.max(0.88, Number(p.top_p || 0.93) + 0.015));
    p.repetition_penalty = Math.min(1.10, Math.max(1.04, Number(p.repetition_penalty || 1.02) + 0.035));
    p.frequency_penalty = Math.max(Number(p.frequency_penalty || 0), 0.38);
    p.presence_penalty = Math.max(Number(p.presence_penalty || 0), 0.24);
    if (typeof p.max_tokens === "number") p.max_tokens = Math.min(p.max_tokens, 220);
    if (typeof p.seed === "number") p.seed = p.seed + 101 + n * 17 + (Date.now() % 997);
    return p;
  }



  const LUX_VALID_HOBBIES = [
    "cooking", "reading", "travel", "traveling", "hiking", "fishing", "gaming", "movies", "sports", "fitness",
    "gym", "music", "photography", "drawing", "painting", "cycling", "running", "swimming", "camping",
    "gardening", "watching movies", "playing music", "football", "basketball", "tennis", "biking",
    "hunting", "writing", "baking"
  ];

  const LUX_VOICE_CACHE = { voices: [], ready: false };

  function luxDebug(...args) { if (LUX_DEBUG_LOGGING) console.log("[LUX DEBUG]", ...args); }
  function notify(text) {
    try { GM_notification({ text, title: "LUX", timeout: 3500 }); }
    catch { console.log("[LUX]", text); }
  }
  function trimText(s, max) { s = (s || "").toString(); return s.length > max ? s.slice(0, max) + "..." : s; }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function _qs(root, selector) { try { return selector ? root.querySelector(selector) : null; } catch { return null; } }
  function _qst(root, selector) { const el = _qs(root, selector); return el ? el.innerText.trim() : ""; }

  function hashStr(s) {
    const str = String(s || "");
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pickByHash(options, seedStr) {
    if (!options || !options.length) return "";
    return options[hashStr(seedStr) % options.length];
  }

  function lux_xorEncrypt(plainText, key = LUX_SECRET) {
    if (!plainText) return "";
    const p = String(plainText);
    const k = String(key);
    let out = "";
    for (let i = 0; i < p.length; i++) {
      const c = p.charCodeAt(i) ^ k.charCodeAt(i % k.length);
      out += String.fromCharCode(c);
    }
    return btoa(out);
  }

  function lux_xorDecrypt(cipherText, key = LUX_SECRET) {
    if (!cipherText) return "";
    let decoded = "";
    try { decoded = atob(cipherText); }
    catch (e) { console.warn("LUX decrypt invalid base64", e); return ""; }
    const k = String(key);
    let out = "";
    for (let i = 0; i < decoded.length; i++) {
      const c = decoded.charCodeAt(i) ^ k.charCodeAt(i % k.length);
      out += String.fromCharCode(c);
    }
    return out;
  }

  function lux_getApiKey() {
    const enc = GM_getValue(LUX_API_KEY_ENC, "");
    if (enc) return lux_xorDecrypt(enc);
    const legacy = GM_getValue(LUX_API_KEY_PLAIN_OLD, "").trim();
    if (legacy) {
      GM_setValue(LUX_API_KEY_ENC, lux_xorEncrypt(legacy));
      return legacy;
    }
    return "";
  }

  function lux_setApiKey(plainKey) {
    GM_setValue(LUX_API_KEY_ENC, lux_xorEncrypt(plainKey || ""));
  }

  function getModelPreset(modelName) {
    const name = (modelName || GM_getValue("lux_model", MODEL_DEFAULT) || "").trim();
    return MODEL_PRESETS[name] || MODEL_FALLBACK_PRESET;
  }

  function lux_getReqLog() { try { return JSON.parse(GM_getValue(LUX_RATE_LOG_KEY, "[]")) || []; } catch { return []; } }
  function lux_setReqLog(log) { GM_setValue(LUX_RATE_LOG_KEY, JSON.stringify(log || [])); }

  function lux_canSendRequest() {
    const now = Date.now();
    let log = lux_getReqLog().filter(t => now - t < LUX_RATE_WINDOW_MS);
    if (log.length >= LUX_RATE_MAX_REQ) {
      lux_showErrorOverlay("You are triggering LUX too quickly.\nGive it a few seconds and try again.");
      return false;
    }
    log.push(now);
    lux_setReqLog(log);
    return true;
  }

  function lux_estimateTokens(str) { return !str ? 0 : Math.ceil(String(str).length / 4); }
  function lux_getCreativeState() { try { return JSON.parse(GM_getValue(LUX_CREATIVE_STATE_KEY, "{}")) || {}; } catch { return {}; } }
  function lux_setCreativeState(state) { GM_setValue(LUX_CREATIVE_STATE_KEY, JSON.stringify(state || {})); }

  function normalizeLooseText(s) {
    return String(s || "").replace(/\s+/g, " ").replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, "").trim();
  }

  function parseAgeFromProfile() {
    try {
      const el = document.querySelector(AGE_SELECTOR);
      const t = (el?.textContent || "").trim();
      const m = t.match(/\bAge\s*:\s*(\d{1,3})\b/i);
      if (!m) return null;
      const n = parseInt(m[1], 10);
      if (!Number.isFinite(n) || n < 18 || n > 100) return null;
      return n;
    } catch {
      return null;
    }
  }

  function extractBracketName(s) {
    if (!s) return "";
    let m = s.match(/\(([^()]*)\)\s*$/);
    if (!m) m = s.match(/\(([^)]+)\)/);
    return (m && m[1]) ? m[1].trim() : "";
  }

  function cleanOutsideName(s) {
    if (!s) return "";
    return s.replace(/\s*\([^)]*\)\s*/g, "").trim();
  }

  function parseProfileCountry() {
    const raw = _qst(document, PERSONA_COUNTRY_SEL) || "";
    const s = raw.toLowerCase();
    if (/great\s*britain|united\s*kingdom|uk\b|britain\b/.test(s)) return "Great Britain";
    if (/australia|australian/.test(s)) return "Australia";
    if (/canada|canadian/.test(s)) return "Canada";
    if (/usa\b|united\s*states|america\b|american/.test(s)) return "USA";
    return raw || "";
  }

  function getAccentInstructionByCountry(country) {
    const c = String(country || "").trim().toLowerCase();
    if (!c) return "Write in natural, warm, feminine English.";
    if (c === "usa") return "Write in warm, casual American English. Keep it natural, feminine, and easy flowing.";
    if (c === "canada") return "Write in soft, natural Canadian English. Keep it warm, feminine, polite, and conversational.";
    if (c === "australia") return "Write in relaxed, natural Australian English. Keep it feminine, playful, easygoing, and clear without overusing slang.";
    if (c === "great britain") return "Write in soft, natural British English. Keep it polished, feminine, and conversational without sounding stiff.";
    return "Write in natural, warm, feminine English.";
  }

  function luxAutoToneStyleFromText(text = "") {
    const s = normalizeLooseText(text || window.__LUX_LAST_USER || "").toLowerCase();
    if (!s) return "generous";

    const asksForBoundary = /\b(?:meet|meet\s*up|meeting|date|coffee|dinner|lunch|breakfast|drink|come\s+over|come\s+to|visit\s+you|visit\s+me|see\s+you|link\s+up|hang\s+out|your\s+place|my\s+place|hotel|room|address|location|where\s+(?:do\s+you\s+live|are\s+you\s+exactly|can\s+i\s+find\s+you)|send\s+me\s+(?:your\s+)?(?:location|address|number|phone|whatsapp|telegram|snap|instagram|email)|drop\s+(?:your\s+)?(?:location|address|number|phone|whatsapp|telegram|snap|instagram|email)|whatsapp|telegram|snapchat|instagram|\big\b|phone\s*number|cell\s*number|call\s+me|text\s+me|email\s+me|video\s*call|facetime|prove\s+it|proof|verify|verification|are\s+you\s+real|real\s+profile|fake|bot|scam|catfish)\b/i.test(s);
    if (asksForBoundary) return "deflect";

    const sexualOrNaughty = /\b(?:hot|sexy|naughty|horny|turn\s+me\s+on|turn\s+you\s+on|kiss|touch|bed|bedroom|all\s+night|body|curves|desire|fantasy|passion|wild|tease|teasing|dirty|wet|hard|cock|dick|pussy|fuck|suck|blowjob|cum)\b/i.test(s);
    if (sexualOrNaughty) return "naughty";

    const affectionate = /\b(?:beautiful|gorgeous|pretty|cute|lovely|sweet|sweetheart|dear|baby|babe|darling|honey|love\s+you|miss\s+you|thinking\s+of\s+you|you\s+look\s+good|you\s+are\s+amazing|compliment)\b/i.test(s);
    if (affectionate) return "sweet";

    const playfulOrFunny = /\b(?:lol|lmao|haha|hehe|funny|joke|kidding|teasing|made\s+me\s+laugh|you\s+crack\s+me\s+up)\b/i.test(s);
    if (playfulOrFunny) return "humorous";

    const seriousOrTender = /\b(?:sad|lonely|tired|hurt|angry|upset|worried|stress|stressed|serious|honest|truth|trust|believe|feel|heart|relationship|married|divorced|widowed|family|work|surgery|hospital|sick|pain)\b/i.test(s);
    if (seriousOrTender) return "generous";

    return "generous";
  }

  function luxGetToneStyle(text = "") {
    return luxAutoToneStyleFromText(text || window.__LUX_LAST_USER || "");
  }

  function luxToneStyleInstruction(style = luxGetToneStyle()) {
    const s = String(style || "generous").toLowerCase();
    if (s === "naughty") return "Auto tone, naughty. The customer is being sensual or teasing, so answer with playful adult tension and warm feminine confidence, but do not become explicit, crude, pushy, unsafe, or pornographic. Keep it suggestive, clever, and believable.";
    if (s === "deflect") return "Auto tone, deflect. The customer is pushing for contact, meetup, exact location, proof, site doubt, or pressure. Acknowledge the human intent or compliment first, then deflect the unsafe part smoothly with warmth and privacy. Never sound rude, cold, superior, dismissive, scripted, or like a policy.";
    if (s === "humorous") return "Auto tone, humorous. The customer is playful, so use light wit and a natural smile in the wording while keeping the reply warm, respectful, clear, and feminine.";
    if (s === "sweet") return "Auto tone, sweet. The customer is affectionate or complimentary, so sound warm, feminine, receptive, and emotionally natural without becoming sugary, fake, or repetitive.";
    return "Auto tone, generous. Match the customer's mood with patience, warmth, maturity, and emotional generosity. Sound grounded, human, respectful, and specific to what he said.";
  }

  function luxBoundaryToneInstruction() {
    return "Boundary tone rule. For contact, meetup, address, location, social media, proof, or pressure requests, stay warm, patient, and respectful. Do not scold him, mock him, sound offended, sound sarcastic, challenge his character, brush him off, make him feel silly, or make the refusal feel cold. A boundary should acknowledge his interest or concern briefly, then set the limit in a calm human way. Never sound rude, dismissive, final, or superior.";
  }

  function luxIsGreetingOnly(text) {
    const s = normalizeLooseText(text).toLowerCase();
    return /^(hi|hello|hey|heyy|good morning|good afternoon|good evening|morning|afternoon|evening|howdy|hiya|sup|what's up|whats up)[,.!?\s]*(beautiful|gorgeous|dear|sweetheart|baby|babe|love|sexy)?[,.!?\s]*$/i.test(s);
  }

  function jobOptionsForAge(age) {
    if (!age) return ["I work in customer support and admin", "I do office admin and scheduling", "I work in hospitality and service"];
    if (age >= 18 && age <= 22) return ["I'm a student and I do part time retail work", "I'm studying and I do customer support part time", "I'm a junior admin assistant and I study on the side"];
    if (age >= 23 && age <= 29) return ["I work in customer support and operations", "I'm in marketing and social media", "I do admin and project coordination"];
    if (age >= 30 && age <= 39) return ["I work in operations and team coordination", "I'm in HR and office management", "I do client services and account support"];
    if (age >= 40 && age <= 49) return ["I work in office management and operations", "I'm in customer relations and admin leadership", "I do business support and coordination"];
    if (age >= 50 && age <= 59) return ["I work in administration and supervision", "I'm in client relations and team support", "I do office coordination and scheduling"];
    if (age >= 60) return ["I'm semi retired and I do light consulting work", "I'm semi retired and I help with community projects", "I'm semi retired and I do part time admin support"];
    return ["I work in admin and coordination", "I do customer support and operations"];
  }

  function suggestJobLine(leftCard, age) {
    const base = jobOptionsForAge(age);
    const seed = (leftCard?.realName || leftCard?.displayName || "") + ":" + String(age || "");
    return pickByHash(base, seed) || base[0];
  }

  function parseLeftProfile() {
    const rawName = _qst(document, PERSONA_NAME_SEL);
    const age = parseAgeFromProfile();
    return {
      rawName,
      realName: extractBracketName(rawName) || "",
      displayName: cleanOutsideName(rawName) || rawName,
      location: _qst(document, PERSONA_LOC_SEL) || "nearby",
      country: parseProfileCountry(),
      age
    };
  }

  function luxReadCustomerProfile() {
    try {
      const el = document.querySelector(ABOUT_USER_SELECTOR);
      if (!el) return "";
      return (el.innerText || el.textContent || "").replace(/\bshow more\b/gi, "").replace(/\s{2,}/g, " ").trim();
    } catch {
      return "";
    }
  }

  function luxWantsProfileCheck(text) {
    return /\b(check|read|see|look)\b.*\b(profile|bio|about)\b/i.test(text || "") ||
      /\bwhat\s+do\s+you\s+think\s+about\s+my\s+profile\b/i.test(text || "") ||
      /\btake\s+a\s+look\s+at\s+my\s+profile\b/i.test(text || "");
  }

  function luxImageLooksUsable(img) {
    try {
      if (!img) return false;
      if (img.matches && !img.matches(CLIENT_IMAGE_SELECTOR)) return false;

      const src = (img.currentSrc || img.src || img.getAttribute("src") || "").trim();
      if (!src) return false;

      const classAlt = [
        img.className || "",
        img.getAttribute("alt") || "",
        img.getAttribute("title") || "",
        img.getAttribute("aria-label") || ""
      ].join(" ").toLowerCase();

      if (/\b(avatar|user avatar|profile avatar|flag|emoji|icon|logo|badge|spinner|loader)\b/i.test(classAlt)) return false;
      if (/\b(flag|emoji|icon|logo|badge|spinner|loader|avatar)\b/i.test(src)) return false;
      if (img.closest('[class*="avatar"], [class*="profile-avatar"], [class*="navbar"], [class*="dropdown"], [class*="flag"], [class*="emoji"], button')) return false;

      const rect = img.getBoundingClientRect ? img.getBoundingClientRect() : { width: 0, height: 0 };
      const w = img.naturalWidth || img.width || rect.width || 0;
      const h = img.naturalHeight || img.height || rect.height || 0;
      if (w && h && (w < 64 || h < 64)) return false;
      return true;
    } catch {
      return false;
    }
  }

  function luxGetImagesFromExactMessageRow(messageNode) {
    try {
      if (!messageNode) return [];
      if (messageNode.matches && !messageNode.matches(CLIENT_MSG_SELECTOR)) return [];
      const candidates = [...messageNode.querySelectorAll(CLIENT_IMAGE_SELECTOR)];
      return candidates.filter(luxImageLooksUsable);
    } catch {
      return [];
    }
  }

  function luxGetLatestClientImageUrlFromMessage(messageNode) {
    try {
      const imgs = luxGetImagesFromExactMessageRow(messageNode);
      if (!imgs.length) return "";
      const img = imgs[imgs.length - 1];
      const parentLink = img.closest("a");
      if (parentLink && parentLink.href && !/javascript:/i.test(parentLink.href)) return parentLink.href.trim();
      return (img.currentSrc || img.src || img.getAttribute("src") || "").trim();
    } catch {
      return "";
    }
  }

  function luxTextForLatestImageOnly(rawMsg, imageNotes) {
    const clean = stripStampsAll(rawMsg || "");
    if (clean) return clean;
    if (imageNotes && imageNotes.trim()) return "Customer sent a photo as the latest message.";
    return "";
  }

  function luxModelTextOnlyForImages(model) {
    const m = String(model || "").toLowerCase();
    return m.includes("deepseek/deepseek-chat") || !luxModelSupportsVision(model);
  }

  function luxRemoveImagesFromMessages(messages, imageNotes = "") {
    return (messages || []).map(msg => {
      if (!msg || !Array.isArray(msg.content)) return msg;
      const textParts = msg.content
        .filter(part => part && part.type === "text")
        .map(part => part.text || "")
        .join(" ")
        .trim();
      const noteLine = imageNotes ? " Latest image notes, " + imageNotes + "." : "";
      return { ...msg, content: (textParts + noteLine).trim() || "Customer sent a photo as the latest message." };
    });
  }

  function getImageNotes(node) {
    if (!node) return [];
    const imgs = luxGetImagesFromExactMessageRow(node);
    const notes = [];
    imgs.forEach(img => {
      const alt = (img.getAttribute("alt") || "").trim();
      const src = (img.currentSrc || img.getAttribute("src") || "").trim();
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      let name = "";
      if (src) {
        const clean = src.split("?")[0];
        name = clean.split("/").pop() || "";
      }
      const parts = [];
      if (alt && !/avatar|flag|emoji|icon|logo|badge|spinner|loader/i.test(alt)) parts.push(`visible label ${alt}`);
      if (name && !/avatar|flag|emoji|icon|logo|badge|spinner|loader/i.test(name)) parts.push(`file ${name}`);
      if (w && h) parts.push(`size ${w}x${h}`);
      notes.push(parts.length ? parts.join(", ") : "latest customer image attached, no safe text label available");
    });
    return notes;
  }

  function stripInlineImageNotes(text) {
    if (!text) return "";
    let t = String(text);
    t = t.replace(/\bmessage\b\s*image\s+attached\.?/gi, "");
    t = t.replace(/\bimage\s+attached\.?/gi, "");
    t = t.replace(/\bimage\s+note\b[^.]*\.?/gi, "");
    return t.replace(/\s{2,}/g, " ").trim();
  }

  const TS_PATTERNS = [
    /\[\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*\]/gi,
    /\(\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*\)/gi,
    /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/gi,
    /\b20\d{2}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b20\d{2}[01]\d[0-3]\d(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?\b/g,
    /\b\d{6,}\b/g,
    /\breport\b\.?$/gi,
    /\bmessage\b\.?$/gi
  ];

  function stripTimestamps(s) {
    let t = (s || "").trim();
    TS_PATTERNS.forEach(rx => { t = t.replace(rx, "").trim(); });
    t = t.replace(/[-–—|•]+\s*$/g, "").replace(/^\s*[-–—|•]+\s*/g, "").trim();
    return t;
  }

  function stripLuxImageMeta(s) {
    if (!s) return "";
    const rx = new RegExp(`${LUX_IMG_START}[\\s\\S]*?${LUX_IMG_END}`, "gi");
    return String(s).replace(rx, "").replace(/\s{2,}/g, " ").trim();
  }

  function extractLuxImageMeta(s) {
    const str = String(s || "");
    const rx = new RegExp(`${LUX_IMG_START}\\s*([\\s\\S]*?)\\s*${LUX_IMG_END}`, "i");
    const m = str.match(rx);
    const notes = m && m[1] ? String(m[1]).trim() : "";
    const clean = str.replace(new RegExp(`${LUX_IMG_START}[\\s\\S]*?${LUX_IMG_END}`, "gi"), "");
    return { text: clean.replace(/\s{2,}/g, " ").trim(), notes };
  }

  function stripTrailingStampLines(s) {
    if (!s) return "";
    const isTimeOnly = l => /^(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)$/i.test(l);
    const isDateOnly = l => /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|20\d{2}[\/\-]\d{1,2}[\/\-]\d{1,2})$/i.test(l);
    const isStampLine = l => {
      if (!l) return false;
      const line = String(l).trim();
      if (!line || line.length > 80) return false;
      if (/^(sent|delivered|seen|read|edited|today|yesterday)\b/i.test(line)) return true;
      if (/^(message|image|photo|picture)\b.*\b(sent|delivered|seen|read)\b/i.test(line)) return true;
      if (/\b(sent|delivered|seen|read)\b\s*(?:at\s*)?\d{1,2}:\d{2}/i.test(line)) return true;
      if (isTimeOnly(line) || isDateOnly(line)) return true;
      return false;
    };
    let lines = String(s).split(/\r?\n/).map(x => x.trim());
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    while (lines.length && isStampLine(lines[lines.length - 1])) lines.pop();
    return lines.join(" ").replace(/\s{2,}/g, " ").trim();
  }

  function stripStampsAll(s) {
    let t = String(s || "");
    t = stripLuxImageMeta(t);
    t = stripTimestamps(t);
    t = stripTrailingStampLines(t);
    return t.trim();
  }

  function stripStampsKeepMeta(s) {
    let t = String(s || "");
    t = stripTimestamps(t);
    t = stripTrailingStampLines(t);
    return t.trim();
  }

  function extractMessageContent(node) {
    const rawText = (node?.innerText || "").trim();
    const text = stripStampsAll(stripInlineImageNotes(rawText));
    const imageNotes = getImageNotes(node);
    if (!imageNotes.length) return text;
    const meta = `${LUX_IMG_START} ${imageNotes.join(" | ")} ${LUX_IMG_END}`;
    return text ? `${text}\n${meta}` : meta;
  }

  function personaCardLine(card) {
    if (!card) return "";
    const bits = [];
    if (card.realName) bits.push(`RealName: ${card.realName}`);
    if (card.displayName) bits.push(`Username: ${card.displayName}`);
    if (card.location) bits.push(`Location: ${card.location}`);
    if (card.country) bits.push(`Country: ${card.country}`);
    if (card.age) bits.push(`Age: ${card.age}`);
    return bits.length ? ` Persona card, ${bits.join(", ")}.` : "";
  }

  function clampToLimit(s, max = MAX_CHARS) {
    let t = (s || "").trim();
    if (t.length <= max) return t;
    t = t.slice(0, max);
    t = t.replace(/\s+\S*$/, "");
    t = t.replace(/[^\w?\.]$/, "");
    if (!/[.?]$/.test(t)) t = t.replace(/[,\-:]?$/, "") + ".";
    return t.trim();
  }

  function buildTimeContext() {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const el = document.querySelector(MEMBER_TIME_SEL);
    const raw = el?.textContent?.trim() || "";

    const parseHour24 = txt => {
      const m = txt.match(/(\d{1,2})[:.](\d{2})(?:\s*([AP]\.?M\.?))?/i);
      if (!m) return NaN;
      let h = parseInt(m[1], 10);
      const ap = (m[3] || "").replace(/\./g, "").toUpperCase();
      if (!ap) return Math.min(23, Math.max(0, h));
      if (ap === "AM") { if (h === 12) h = 0; }
      else if (ap === "PM") { if (h !== 12) h += 12; }
      return h;
    };

    const parseDayIndex = txt => {
      const s = (txt || "").toLowerCase();
      const map = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, fri: 5, sat: 6 };
      const long = s.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
      if (long) return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(long[0]);
      const short = s.match(/\b(sun|mon|tue|tues|wed|thu|thur|fri|sat)\b/);
      if (short) return map[short[0]];
      return NaN;
    };

    const now = new Date();
    const hour24 = Number.isFinite(parseHour24(raw)) ? parseHour24(raw) : now.getHours();
    const dayIndex = Number.isFinite(parseDayIndex(raw)) ? parseDayIndex(raw) : now.getDay();
    const dayName = dayNames[dayIndex] || now.toLocaleDateString(undefined, { weekday: "long" });
    const daypart = h => h >= 5 && h < 12 ? "morning" : h < 17 ? "afternoon" : h < 22 ? "evening" : "night";
    const fallbackTime = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const fallbackDayShort = dayShort[now.getDay()];
    const rawDayTime = raw && /\d/.test(raw) ? raw : `${fallbackDayShort} ${fallbackTime}`;
    return { hour24, dayIndex, dayName, daypart: daypart(hour24), rawDayTime, raw };
  }

  function lux_noteThreadKey() { try { return `${_threadKey()}__member_note_last_hash`; } catch { return LUX_NOTE_LAST_HASH_KEY; } }

  function dedupeCsvItems(arr) {
    const seen = new Set();
    const out = [];
    for (const item of (arr || [])) {
      const clean = normalizeLooseText(item);
      if (!clean) continue;
      const k = clean.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(clean);
    }
    return out;
  }

  function splitCsvLike(value) {
    return String(value || "").split(/,|\band\b|\&|\//i).map(x => normalizeLooseText(x)).filter(Boolean);
  }

  function luxTrimAnswerTail(v) {
    let t = String(v || "").trim();
    t = t.replace(/\s+/g, " ").trim();
    t = t.split(/\b(?:and you|what about you|how about you|you\?|wbu|hbu)\b/i)[0];
    t = t.split(/\b(?:by the way|btw)\b/i)[0];
    t = t.split(/[!?]/)[0];
    t = t.replace(/\b(?:if that makes sense|i guess|i think|you know)\b.*$/i, "");
    t = t.replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, "").trim();
    return t;
  }

  function cleanupNoteValue(v) {
    let t = luxTrimAnswerTail(v);
    t = t.replace(/^that\s+/i, "");
    t = t.replace(/^is\s+/i, "");
    t = t.replace(/^i\s+(?:am|m)\s+/i, "");
    t = t.replace(/^i\s+work\s+as\s+/i, "");
    t = t.replace(/^i\s+work\s+in\s+/i, "");
    t = t.replace(/^i\s+work\s+for\s+/i, "");
    t = t.replace(/^i\s+live\s+in\s+/i, "");
    t = t.replace(/^i\s+live\s+at\s+/i, "");
    t = t.replace(/^i\s+am\s+from\s+/i, "");
    t = t.replace(/^i'?m\s+from\s+/i, "");
    t = t.replace(/^my\s+name\s+is\s+/i, "");
    t = t.replace(/^call\s+me\s+/i, "");
    t = t.replace(/^you\s+can\s+call\s+me\s+/i, "");
    return normalizeLooseText(t);
  }

  function luxCleanNameValue(v) {
    let t = cleanupNoteValue(v);
    t = t.split(/\b(?:and|but|so)\b/i)[0].trim();
    t = t.replace(/[^A-Za-z'\-\s]/g, "").trim();
    return t;
  }

  function luxCleanLocationCapture(v) {
    let t = String(v || "").trim();
    t = t.split(/\b(?:and you|what about you|how about you|you)\b/i)[0];
    t = t.split(/[!?]/)[0];
    t = t.split(/\b(?:because|while|but|so)\b/i)[0];
    t = t.replace(/^[,\s\-]+|[,\s\-]+$/g, "").trim();
    t = t.replace(/[^A-Za-z0-9\s,\-]/g, "").trim();
    return normalizeLooseText(t);
  }

  function luxCleanJobValue(v) {
    let t = cleanupNoteValue(v);
    t = t.split(/\b(?:and|but|so|because)\b/i)[0].trim();
    t = t.replace(/[^A-Za-z0-9\s,&\-]/g, "").trim();
    return normalizeLooseText(t);
  }

  function luxCleanSimpleValue(v) { return normalizeLooseText(cleanupNoteValue(v)); }

  function extractFirst(text, regexes, cleaner) {
    for (const re of regexes) {
      const m = text.match(re);
      if (m && m[1]) {
        const v = cleaner ? cleaner(m[1]) : normalizeLooseText(m[1]);
        if (v) return v;
      }
    }
    return "";
  }

  function extractMany(text, regexes) {
    const out = [];
    for (const re of regexes) {
      let m;
      const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      while ((m = rx.exec(text)) !== null) {
        if (m[1]) out.push(...splitCsvLike(m[1]));
      }
    }
    return dedupeCsvItems(out);
  }

  function looksLikeNameCandidate(v) {
    const s = normalizeLooseText(v);
    if (!s) return false;
    if (!/^[A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?$/.test(s)) return false;
    if (/^(Single|Married|Divorced|Widowed|Separated|Here|Ready|Busy|Fine|Okay|Ok|Tired|Captain)$/i.test(s)) return false;
    if (/^(Baby|Babe|Dear|Darling|Love|Honey|Sweetheart)$/i.test(s)) return false;
    return true;
  }

  function sanitizeNoteFactValue(key, value) {
    const k = String(key || "").toLowerCase();
    let v = normalizeLooseText(value);
    if (!v) return "";
    const explicit = /\b(fuck|fucking|pussy|dick|cock|blowjob|anal|cum|cumming|horny|hard\s+on|suck|tits|boobs)\b/i;
    if (explicit.test(v)) return "";
    if (k === "preferences" || k === "sexual preferences" || k === "preference") {
      if (/\bdominant\b/i.test(v)) return "Prefers dominant partner";
      if (/\bsubmissive\b/i.test(v)) return "Prefers submissive partner";
      if (/\brole\s*play|roleplay\b/i.test(v)) return "Likes roleplay";
      if (/\bkink|kinky\b/i.test(v)) return "Open minded";
      if (/\brough\b/i.test(v)) return "Likes it rough";
      if (/\bgentle\b/i.test(v)) return "Likes it gentle";
      return v;
    }
    return v;
  }

  function isValidHobbyValue(v) {
    const s = normalizeLooseText(v).toLowerCase();
    if (!s) return false;
    if (/\b(boobs?|tits?|ass|white women|white girls|black girls|latinas?|asians?|milfs?|sex|fucking|nudes?)\b/i.test(s)) return false;
    return LUX_VALID_HOBBIES.some(h => s.includes(h));
  }

  function luxIsProfilePhotoComment(text) {
    const s = String(text || "").toLowerCase();
    return /\b(commented|comment|replied|reacted|liked)\b.{0,45}\b(profile\s*(?:photo|picture|pic)|photo|picture|pic)\b/i.test(s) ||
      /\b(profile\s*(?:photo|picture|pic))\b.{0,45}\b(commented|comment|reply|reaction|liked)\b/i.test(s) ||
      /\bcomment(?:ed)?\s+on\s+(?:your|the)\s+(?:profile\s*)?(?:photo|picture|pic)\b/i.test(s);
  }

  function luxModelSupportsVision(modelName) {
    const m = String(modelName || "").toLowerCase();
    return m.includes("x-ai/grok") || m.includes("openai/gpt-4.1") || m.includes("anthropic/claude");
  }

  function luxInferImageIntent(messageNode, messageText) {
    const text = String(messageText || "").toLowerCase();
    const rawNodeText = String(messageNode?.innerText || "").toLowerCase();
    const img = luxGetImagesFromExactMessageRow(messageNode)[0] || null;
    const src = String((img?.currentSrc || img?.src || "")).toLowerCase();
    const alt = String((img?.getAttribute("alt") || "")).toLowerCase();
    const blob = `${text} ${rawNodeText} ${src} ${alt}`;
    if (luxIsProfilePhotoComment(blob)) return "profile_comment";
    if (/\b(that'?s me|this is me|my photo|my pic|my picture|my selfie|selfie of me|here is me|here'?s me)\b/i.test(text)) return "selfie";
    if (/\b(screenshot|screen shot|chat screenshot|look at her|look at this girl|her photo|this woman|this lady|this girl)\b/i.test(blob)) return "screenshot";
    if (/\b(profile pic|profile picture|profile photo)\b/i.test(blob)) return "profile_photo";
    if (/\b(meme|funny pic|joke|reaction image|sticker)\b/i.test(blob)) return "meme";
    if (/\b(food|meal|breakfast|lunch|dinner|snack|plate|restaurant|dish|drink)\b/i.test(blob)) return "food";
    if (/\b(beach|vacation|holiday|travel|trip|mountain|hotel|city|view|sunset|pool|airport)\b/i.test(blob)) return "place";
    return img ? "attached_image" : "unknown";
  }

  function parseClientFactsFromLatestMessage(messageText) {
    const raw = normalizeLooseText(stripStampsAll(messageText || ""));
    if (!raw) return null;
    const text = raw;
    const lower = text.toLowerCase();
    const facts = {};

    const name = extractFirst(text, [
      /\bmy\s+name\s+is\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\bi(?:'m|\s+am)\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\bthis\s+is\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\bcall\s+me\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\byou\s+can\s+call\s+me\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i
    ], luxCleanNameValue);
    if (name && looksLikeNameCandidate(name)) facts.Name = name;

    const age = extractFirst(text, [
      /\bi(?:'m|\s+am)\s+(\d{1,3})\b/i,
      /\bmy\s+age\s+is\s+(\d{1,3})\b/i,
      /\bi\s+am\s+(\d{1,3})\s+years?\s+old\b/i,
      /\b(\d{1,3})\s+years?\s+old\b/i
    ], v => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 18 && n <= 100 ? String(n) : "";
    });
    if (age) facts.Age = age;

    const location = extractFirst(text, [
      /\bi\s+live\s+in\s+([A-Za-z][A-Za-z\s\-\.,]{1,60})/i,
      /\bi\s+am\s+from\s+([A-Za-z][A-Za-z\s\-\.,]{1,60})/i,
      /\bi'?m\s+from\s+([A-Za-z][A-Za-z\s\-\.,]{1,60})/i,
      /\bi'?m\s+in\s+([A-Za-z][A-Za-z\s\-\.,]{1,60})/i,
      /\bi\s+stay\s+in\s+([A-Za-z][A-Za-z\s\-\.,]{1,60})/i,
      /\bmy\s+address\s+is\s+([A-Za-z0-9][A-Za-z0-9\s,\-#\.]{3,100})/i
    ], luxCleanLocationCapture);
    if (location) {
      if (/\d/.test(location) && /(street|st\b|road|rd\b|avenue|ave\b|apartment|apt\b|house|close|crescent|lane|drive|dr\b|boulevard|blvd\b)/i.test(location)) facts.Address = location;
      else facts.Location = location;
    }

    const job = extractFirst(text, [
      /\bi\s+work\s+as\s+(?:an?\s+)?([^\.,!?]{2,80})/i,
      /\bi\s+am\s+(?:an?\s+)?([^\.,!?]{2,80})\s+by\s+profession/i,
      /\bmy\s+job\s+is\s+(?:an?\s+)?([^\.,!?]{2,80})/i,
      /\bi\s+work\s+in\s+([^\.,!?]{2,80})/i,
      /\bi\s+work\s+for\s+([^\.,!?]{2,80})/i,
      /\bi\s+served\s+as\s+(?:a\s+|an\s+)?([^\.,!?]{2,80})/i,
      /\bi\s+am\s+retired\s+from\s+([^\.,!?]{2,80})/i
    ], luxCleanJobValue);
    if (job && !/^(here|there|single|married|busy|ready|okay|ok|fine)$/i.test(job)) facts.Job = job;

    const workplace = extractFirst(text, [
      /\bi\s+work\s+for\s+([^\.,!?]{2,80})/i,
      /\bi'?ve\s+worked\s+for\s+([^\.,!?]{2,80})/i,
      /\bi'?ve\s+been\s+with\s+([^\.,!?]{2,80})/i,
      /\bi\s+am\s+with\s+([^\.,!?]{2,80})/i,
      /\bi'?m\s+with\s+([^\.,!?]{2,80})/i
    ], luxCleanJobValue);
    if (workplace) facts.Workplace = workplace;

    const experience = extractFirst(text, [
      /\bfor\s+(\d+\s+years?)\b/i,
      /\bover\s+(\d+\s+years?)\b/i,
      /\babout\s+(\d+\s+years?)\b/i,
      /\b(\d+\s+years?)\s+now\b/i,
      /\bworked\s+(?:there\s+)?for\s+(\d+\s+years?)\b/i
    ], luxCleanSimpleValue);
    if (experience) facts.Experience = experience;

    const status = extractFirst(text, [
      /\bi(?:'m|\s+am)\s+(single|divorced|widowed|separated|married)\b/i,
      /\bI'm\s+a\s+(single\s+(?:dad|mom|father|mother))\b/i,
      /\bI\s+am\s+a\s+(single\s+(?:dad|mom|father|mother))\b/i
    ], luxCleanSimpleValue);
    if (status) facts.Status = status;

    const family = extractFirst(text, [
      /\bi\s+have\s+([^\.,!?]{2,80})\s+(?:kids|children|sons|daughters)\b/i,
      /\bi\s+have\s+(\d+\s+(?:kids|children|sons|daughters))\b/i,
      /\bi'?m\s+a\s+(single\s+(?:dad|mom|father|mother))\b/i,
      /\bmy\s+(?:son|daughter|kids|children|mom|mother|dad|father|parents?)\b[^\.!?]{0,60}/i
    ], luxCleanSimpleValue);
    if (family) facts.Family = family;

    const hobbyMatches = extractMany(text, [
      /\bi\s+like\s+([^\.!?]{2,90})/i,
      /\bi\s+love\s+([^\.!?]{2,90})/i,
      /\bmy\s+hobbies\s+are\s+([^\.!?]{2,90})/i,
      /\bi\s+enjoy\s+([^\.!?]{2,90})/i,
      /\bin\s+my\s+free\s+time\s+i\s+([^\.!?]{2,90})/i
    ]).map(luxCleanSimpleValue);
    const hobbies = hobbyMatches.filter(isValidHobbyValue);
    if (hobbies.length) facts.Hobbies = dedupeCsvItems(hobbies).join(", ");

    const activities = extractMany(text, [
      /\bi\s+(?:usually|often|normally)\s+([^\.!?]{2,90})/i,
      /\bright\s+now\s+i'?m\s+([^\.!?]{2,90})/i,
      /\bi'?m\s+currently\s+([^\.!?]{2,90})/i,
      /\bi\s+spend\s+my\s+time\s+([^\.!?]{2,90})/i
    ]).map(luxCleanSimpleValue).filter(x => {
      if (!x) return false;
      if (/\b(boobs?|tits?|sex|nudes?|white women|black women)\b/i.test(x)) return false;
      if (/^(and you|what about you|you)$/i.test(x)) return false;
      return true;
    });
    if (activities.length) facts.Activity = dedupeCsvItems(activities).join(", ");

    const schedule = extractFirst(text, [
      /\bi\s+work\s+(nights|days|weekends|night shifts|day shifts)\b/i,
      /\bi\s+have\s+(?:an\s+)?appointment\s+([^\.,!?]{2,80})/i,
      /\bi\s+am\s+free\s+([^\.,!?]{2,80})/i,
      /\bi\s+usually\s+work\s+([^\.,!?]{2,80})/i,
      /\btomorrow\s+i\s+([^\.,!?]{2,80})/i,
      /\bthis\s+(?:week|weekend|evening|morning)\s+i\s+([^\.,!?]{2,80})/i
    ], luxCleanSimpleValue);
    if (schedule) facts.Schedule = schedule;

    const contact = extractFirst(text, [
      /\bmy\s+(?:number|phone\s+number)\s+is\s+([+\d\s\-()]{6,30})\b/i,
      /\breach\s+me\s+at\s+([+\d\s\-()]{6,30})\b/i,
      /\bwhatsapp\s+me\s+at\s+([+\d\s\-()]{6,30})\b/i,
      /\bmy\s+email\s+is\s+([^\s,;]+@[^\s,;]+)\b/i
    ], luxCleanSimpleValue);
    if (contact) facts.Contact = contact;
    if (/\bwhatsapp|telegram|snap(?:chat)?|instagram|ig\b/i.test(lower) && !facts.Contact) facts.ContactAttempt = "asked to move chat off site";

    const plan = extractFirst(text, [
      /\bi\s+plan\s+to\s+([^\.,!?]{2,80})/i,
      /\bi'?m\s+going\s+to\s+([^\.,!?]{2,80})/i,
      /\bi\s+want\s+to\s+([^\.,!?]{2,80})/i,
      /\bnext\s+week\s+i\s+([^\.,!?]{2,80})/i
    ], luxCleanSimpleValue);
    if (plan) facts.Plans = plan;

    const prefs = extractFirst(text, [
      /\bi\s+(?:like|prefer)\s+(?:a\s+)?(dominant|submissive)\s+(?:woman|partner|girl|lady)\b/i,
      /\bi\s+(?:like|prefer)\s+(?:a\s+)?(dominant|submissive)\b/i,
      /\bi'?m\s+into\s+(role\s*play|roleplay|kink(?:y)?)\b/i,
      /\bi\s+like\s+it\s+(rough|gentle)\b/i
    ], luxCleanSimpleValue);
    if (prefs) facts.Preferences = prefs;

    const fields = Object.entries(facts).filter(([, v]) => normalizeLooseText(v));
    if (!fields.length) return null;
    return Object.fromEntries(fields);
  }

  function parseExistingMemberNote(noteText) {
    const out = {};
    const text = String(noteText || "").trim();
    if (!text) return out;
    const parts = text.split("|").map(x => x.trim()).filter(Boolean);
    for (const part of parts) {
      const idx = part.indexOf(":");
      if (idx <= 0) continue;
      const k = normalizeLooseText(part.slice(0, idx));
      const v = normalizeLooseText(part.slice(idx + 1));
      if (k && v) out[k] = v;
    }
    return out;
  }

  function mergeMemberFacts(existing, incoming) {
    const merged = { ...(existing || {}) };
    let changed = false;
    for (const [key, value] of Object.entries(incoming || {})) {
      const cleanVal = sanitizeNoteFactValue(key, value);
      if (!cleanVal) continue;
      if (!merged[key]) {
        merged[key] = cleanVal;
        changed = true;
        continue;
      }
      const oldVal = normalizeLooseText(merged[key]);
      if (oldVal.toLowerCase() === cleanVal.toLowerCase()) continue;
      if (/^(Hobbies|Activity)$/i.test(key)) {
        const joined = dedupeCsvItems([...splitCsvLike(oldVal), ...splitCsvLike(cleanVal)]).join(", ");
        if (joined && joined.toLowerCase() !== oldVal.toLowerCase()) {
          merged[key] = joined;
          changed = true;
        }
      } else if (oldVal.length < cleanVal.length && !oldVal.toLowerCase().includes(cleanVal.toLowerCase())) {
        merged[key] = cleanVal;
        changed = true;
      }
    }
    return { merged, changed };
  }

  function formatMemberNote(obj) {
    const order = ["Name", "Age", "Location", "Address", "Job", "Workplace", "Experience", "Status", "Family", "Hobbies", "Activity", "Schedule", "Plans", "Preferences", "Contact", "ContactAttempt"];
    const parts = [];
    for (const key of order) if (obj && obj[key]) parts.push(`${key}: ${normalizeLooseText(obj[key])}`);
    for (const [k, v] of Object.entries(obj || {})) if (!order.includes(k) && normalizeLooseText(v)) parts.push(`${k}: ${normalizeLooseText(v)}`);
    return parts.join(" | ");
  }

  function memberNoteTextarea() {
    const all = [...document.querySelectorAll("textarea#log.form-control.mb-2.text-bg-light, textarea#log")];
    if (!all.length) return null;
    const visible = all.filter(el => {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") return false;
      if (el.offsetParent === null) return false;
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 40;
    });
    if (!visible.length) return all[0] || null;
    visible.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    const mid = window.innerWidth / 2;
    const rightSide = visible.filter(el => el.getBoundingClientRect().left >= mid);
    return rightSide[0] || visible[visible.length - 1] || visible[0] || null;
  }

  async function waitForMemberNoteTextarea(timeoutMs = 2500) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const el = memberNoteTextarea();
      if (el) return el;
      await sleep(120);
    }
    return null;
  }

  function memberNoteSaveButton() {
    const buttons = [...document.querySelectorAll(MEMBER_NOTE_SAVE_SELECTOR)];
    if (!buttons.length) return null;
    return buttons.find(b => /save/i.test((b.textContent || "").trim())) || buttons[0] || null;
  }

  function setFieldValue(el, value) {
    if (!el) return;
    const ownDesc = Object.getOwnPropertyDescriptor(el, "value");
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLInputElement ? HTMLInputElement.prototype : null;
    const protoDesc = proto ? Object.getOwnPropertyDescriptor(proto, "value") : null;
    if (ownDesc && ownDesc.set) ownDesc.set.call(el, value);
    else if (protoDesc && protoDesc.set) protoDesc.set.call(el, value);
    else el.value = value;
  }

  function fireFieldEvents(el) {
    if (!el) return;
    const opts = { bubbles: true, cancelable: true };
    try { el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); } catch {}
    try { el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })); } catch {}
    try { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); } catch {}
    try { el.dispatchEvent(new FocusEvent("focus", opts)); } catch { el.dispatchEvent(new Event("focus", opts)); }
    try { el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: el.value })); } catch {}
    try { el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: el.value })); } catch { el.dispatchEvent(new Event("input", opts)); }
    el.dispatchEvent(new Event("change", opts));
    try { el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true })); } catch {}
    try { el.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true })); } catch {}
    try { el.dispatchEvent(new FocusEvent("blur", opts)); } catch { el.dispatchEvent(new Event("blur", opts)); }
  }

  function forceClick(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: "nearest" }); } catch {}
    try { el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); } catch {}
    try { el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })); } catch {}
    try { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); } catch {}
    try { el.click(); } catch {}
    return true;
  }

  async function autoLogLatestClientInfo(messageText) {
    try {
      const facts = parseClientFactsFromLatestMessage(messageText);
      luxDebug("Extracted facts", facts, "from", messageText);
      if (!facts) return false;
      let noteBox = await waitForMemberNoteTextarea(2800);
      if (!noteBox) return false;
      noteBox = memberNoteTextarea() || noteBox;
      const existingText = String(noteBox.value || "").trim();
      const existing = parseExistingMemberNote(existingText);
      const { merged, changed } = mergeMemberFacts(existing, facts);
      const finalText = formatMemberNote(merged);
      if (!finalText) return false;

      const newHash = String(hashStr(finalText));
      const lastHash = GM_getValue(lux_noteThreadKey(), "");
      if (!changed && existingText.trim() === finalText.trim()) return false;
      if (lastHash && lastHash === newHash && existingText.trim() === finalText.trim()) return false;

      noteBox = memberNoteTextarea() || noteBox;
      noteBox.scrollIntoView({ block: "nearest" });
      try { noteBox.click(); } catch {}
      noteBox.focus();

      noteBox = memberNoteTextarea() || noteBox;
      setFieldValue(noteBox, finalText);
      try { noteBox.selectionStart = noteBox.selectionEnd = finalText.length; } catch {}
      fireFieldEvents(noteBox);
      await sleep(80);
      noteBox = memberNoteTextarea() || noteBox;
      fireFieldEvents(noteBox);

      GM_setValue(lux_noteThreadKey(), newHash);

      if (LUX_NOTE_AUTOSAVE) {
        const saveBtn = memberNoteSaveButton();
        if (saveBtn) {
          forceClick(saveBtn);
          await sleep(120);
          forceClick(saveBtn);
        }
        notify("LUX logged member note");
      } else {
        notify("LUX drafted member note");
      }
      return true;
    } catch (e) {
      console.warn("LUX member note logging failed", e);
      return false;
    }
  }

  function scoreCreativeIntent(text) {
    const s = (text || "").toLowerCase();
    let score = 0;
    if (/\b(cute|adorable|pretty|gorgeous|fun|play|vibe|chemistry|smile|eyes|sweet)\b/.test(s)) score += 0.10;
    if (/\b(pic|pics|picture|selfie|photo|gallery|profile)\b/.test(s)) score += 0.08;
    if (/\b(how.*day|what.*up|tell me about|you like|you enjoy)\b/.test(s)) score += 0.06;
    if (/\b(fact|proof|specific|exact|details?|policy|rule|why|explain|clarify)\b/.test(s)) score -= 0.06;
    if (/\b(meet|number|whatsapp|instagram|snap|telegram|address|call|text)\b/.test(s)) score -= 0.10;
    return Math.max(-0.10, Math.min(0.25, score));
  }

  function lux_getDaypart(date = new Date()) {
    const hour = date.getHours();
    if (hour < 5) return "late-night";
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 22) return "evening";
    return "night";
  }

  function lux_detectTone(text) {
    const s = (text || "").toLowerCase();
    const angry = /\b(stupid|idiot|wtf|annoying|trash|nonsense|you never|you always|mad|angry|pissed)\b/.test(s);
    const cold = /\b(k|ok|kay|fine|whatever|hm|hmm|sure)\b/.test(s) && s.replace(/\s+/g, " ").trim().length <= 20;
    const playful = /\b(lol|lmao|haha|hehe)\b/.test(s);
    const sweet = /\b(baby|babe|darling|sweetheart|dear|love|miss you|thinking of you)\b/.test(s);
    const flirty = /\b(hot|cute|pretty|kiss|touch|naughty|turn on)\b/.test(s);
    const serious = /\b(why|explain|honest|truth|seriously|real question|be straight)\b/.test(s);
    const interviewy = /\b(what do you do|job|work|occupation|career|where are you from|how old|age)\b/.test(s);
    const shortMsg = s.replace(/\s+/g, " ").trim().length <= 12;
    const questionHeavy = (s.match(/\?/g) || []).length >= 2;
    let tone = "neutral";
    if (angry) tone = "angry";
    else if (flirty) tone = "flirty";
    else if (sweet) tone = "sweet";
    else if (serious || interviewy) tone = "serious";
    else if (playful) tone = "playful";
    else if (cold) tone = "cold";
    const engagement = (cold || shortMsg) ? "low" : (questionHeavy ? "high" : "mid");
    return { tone, engagement };
  }

  function lux_recentReplyKey() { try { return `${_threadKey()}__recent_replies_v1`; } catch { return "lux_recent_replies_global_v1"; } }
  function lux_getRecentReplies() { try { const arr = JSON.parse(GM_getValue(lux_recentReplyKey(), "[]")); return Array.isArray(arr) ? arr.slice(-18) : []; } catch { return []; } }
  function lux_pushRecentReply(text) {
    try {
      const arr = lux_getRecentReplies();
      arr.push(String(text || "").trim());
      while (arr.length > 10) arr.shift();
      GM_setValue(lux_recentReplyKey(), JSON.stringify(arr));
    } catch {}
  }

  function lux_replyFpKey() { try { return `${_threadKey()}__${LUX_REPLY_FP_KEY}`; } catch { return LUX_REPLY_FP_KEY; } }
  function lux_getReplyFingerprints() {
    try {
      const arr = JSON.parse(GM_getValue(lux_replyFpKey(), "[]"));
      return Array.isArray(arr) ? arr.slice(-12) : [];
    } catch {
      return [];
    }
  }
  function lux_pushReplyFingerprint(text) {
    try {
      const fp = normalizeForCompare(text).split(" ").slice(0, 24).join(" ");
      if (!fp) return;
      const arr = lux_getReplyFingerprints();
      arr.push(fp);
      while (arr.length > 12) arr.shift();
      GM_setValue(lux_replyFpKey(), JSON.stringify(arr));
    } catch {}
  }
  function lux_isTooSimilarToRecent(text) {
    const current = normalizeForCompare(text).split(" ").slice(0, 24).join(" ");
    if (!current) return false;
    return lux_getReplyFingerprints().some(old => overlapScore(current, old) > 0.48);
  }

  function lux_themeMemoryKey() { try { return `${_threadKey()}__${LUX_THEME_MEMORY_KEY}`; } catch { return LUX_THEME_MEMORY_KEY; } }
  function lux_getThemeMemory() {
    try {
      const arr = JSON.parse(GM_getValue(lux_themeMemoryKey(), "[]"));
      return Array.isArray(arr) ? arr.slice(-5) : [];
    } catch {
      return [];
    }
  }
  function lux_pushThemeMemory(theme) {
    try {
      const arr = lux_getThemeMemory();
      arr.push(theme);
      while (arr.length > 5) arr.shift();
      GM_setValue(lux_themeMemoryKey(), JSON.stringify(arr));
    } catch {}
  }

  function luxQuestionGuide(tone, engagement, userText) {
    const latest = normalizeLooseText(stripStampsAll(userText || "")).slice(0, 300) || "the customer's latest message";
    const recent = lux_getRecentReplies()
      .map(x => normalizeLooseText(x).slice(0, 160))
      .filter(Boolean)
      .slice(-8)
      .join(" | ");
    let base = [
      "Strict no-repetition rule, never use a saved question, question bank, fallback pool, default line, or reusable question shape.",
      "Create the reply from the latest customer message only, not from a stock dating-chat script.",
      `The customer's latest message is, ${latest}.`,
      "A question is optional. Skip it if the only possible question sounds generic, forced, interview-like, daypart based, meetup-fantasy based, or similar to a recent reply.",
      "If you ask one, it must be anchored to one specific word, detail, feeling, concern, joke, plan, or compliment from his latest message.",
      "The question should sound like a natural woman staying in the same moment, not like an assistant trying to continue engagement.",
      "Avoid these question openings and shapes unless his exact wording demands it, what made you, what kind of, if you could, what would it look like, what is your idea of, how was your day, what are you up to, tell me about yourself.",
      "Avoid fantasy meetup questions, perfect-day questions, finally-together questions, Friday-afternoon questions, first-thing questions, and any question that could fit any customer.",
      "For contact, address, location, social media, or meetup requests, do not end with a repeated redirect question. A warm boundary without a question is better than a fake question.",
      "Do not reuse the first six words, rhythm, or emotional shape of recent questions or refusals.",
      recent ? `Recent wording and shapes to avoid completely, ${recent}.` : ""
    ].filter(Boolean).join(" ");
    if (tone === "angry") base += " His tone is tense, so do not challenge him or sound defensive. Keep it calm and human.";
    else if (tone === "cold") base += " His tone is short, so keep the follow up light, specific, and low pressure.";
    else if (tone === "serious") base += " His tone is serious, so stay grounded and avoid playful filler.";
    else if (tone === "sweet") base += " His tone is affectionate, so keep warmth without sounding needy or scripted.";
    else if (tone === "flirty") base += " His tone is teasing, so be playful without using repeated bait or meetup fantasy.";
    else if (tone === "playful") base += " His tone is playful, so respond with lightness without canned banter.";
    else if (engagement === "low") base += " Keep it easy to answer, but avoid dull generic questions.";
    return base;
  }


  function lux_toneKey() { try { return _threadKey() + "__tone_v1"; } catch { return "lux_tone_global_v1"; } }
  function lux_getToneMemory() {
    try {
      const raw = GM_getValue(lux_toneKey(), "[]");
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-3) : [];
    } catch {
      return [];
    }
  }
  function lux_pushToneMemory(item) {
    try {
      const arr = lux_getToneMemory();
      arr.push(item);
      while (arr.length > 3) arr.shift();
      GM_setValue(lux_toneKey(), JSON.stringify(arr));
    } catch {}
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
    let repetition_penalty = base.repetition_penalty ?? 1.02;
    let max_tokens = base.max_tokens ?? 240;

    const daypart = lux_getDaypart();
    if (daypart === "late-night" || daypart === "night") temperature = Math.min(temperature + 0.05, 1.2);
    else if (daypart === "morning") temperature = Math.max(temperature - 0.05, 0.45);

    const toneNow = lux_detectTone(msg);
    const mem = lux_getToneMemory();
    const lastTone = mem.length ? mem[mem.length - 1].tone : "neutral";
    const coldStreak = mem.filter(x => x && x.tone === "cold").length >= 2;
    const tone = toneNow.tone;
    const engagement = toneNow.engagement;

    if (tone === "flirty") {
      temperature = Math.min(temperature + 0.08, 1.15);
      top_p = Math.min(top_p + 0.03, 1.0);
      repetition_penalty = Math.max(1.00, repetition_penalty - 0.01);
      max_tokens = Math.min(280, max_tokens + 20);
    } else if (tone === "sweet") {
      temperature = Math.min(temperature + 0.05, 1.08);
      top_p = Math.min(top_p + 0.02, 1.0);
      repetition_penalty = Math.max(1.00, repetition_penalty - 0.01);
      max_tokens = Math.min(280, max_tokens + 15);
    } else if (tone === "serious") {
      temperature = Math.max(0.48, temperature - 0.08);
      top_p = Math.max(0.86, top_p - 0.05);
      repetition_penalty = Math.min(1.06, repetition_penalty + 0.02);
      max_tokens = Math.max(200, max_tokens - 10);
    } else if (tone === "angry") {
      temperature = Math.max(0.46, temperature - 0.10);
      top_p = Math.max(0.84, top_p - 0.06);
      repetition_penalty = Math.min(1.06, repetition_penalty + 0.02);
      max_tokens = Math.max(190, max_tokens - 20);
    } else if (tone === "cold") {
      temperature = Math.min(temperature + 0.03, 0.95);
      top_p = Math.min(top_p + 0.02, 0.98);
      max_tokens = Math.max(180, Math.min(230, max_tokens - 20));
    }

    if (coldStreak && tone !== "serious" && tone !== "angry") {
      temperature = Math.min(temperature + 0.03, 1.05);
      top_p = Math.min(top_p + 0.02, 1.0);
      max_tokens = Math.min(280, max_tokens + 10);
    }
    if (highCount >= 3) {
      temperature = Math.min(temperature + 0.12, 1.2);
      top_p = Math.min(top_p + 0.05, 1.0);
    } else if (highCount >= 1) {
      temperature = Math.min(temperature + 0.05, 1.1);
    }

    lux_setCreativeState({ history, lastTone: tone, lastEngagement: engagement, prevTone: lastTone });
    lux_pushToneMemory({ tone, engagement, ts: Date.now() });

    return { ...base, temperature, top_p, repetition_penalty, max_tokens };
  }

  function sanitizePayloadForModel(payload, model) {
    const m = (model || "").toLowerCase();
    const p = { ...payload };
    if ("transforms" in p) delete p.transforms;
    if ("logit_bias" in p && !p.logit_bias) delete p.logit_bias;

    if (luxModelTextOnlyForImages(model) && Array.isArray(p.messages)) {
      const lastUser = [...p.messages].reverse().find(msg => msg && msg.role === "user" && Array.isArray(msg.content));
      let noteText = "";
      if (lastUser) {
        noteText = (lastUser.content || []).filter(part => part && part.type === "text").map(part => part.text || "").join(" ");
      }
      p.messages = luxRemoveImagesFromMessages(p.messages, noteText);
    }

    if (m.includes("deepseek/deepseek-chat")) {
      delete p.seed;
      p.temperature = Math.min(Number(p.temperature || 0.86), 0.90);
      p.top_p = Math.min(Number(p.top_p || 0.94), 0.95);
      p.max_tokens = Math.min(Number(p.max_tokens || 260), 260);
    }

    if (m.includes("anthropic/claude")) {
      p.temperature = Math.min(Number(p.temperature || 0.66), 0.72);
      p.top_p = Math.min(Number(p.top_p || 0.94), 0.96);
      p.max_tokens = Math.min(Number(p.max_tokens || 255), 255);
    }

    if (m.includes("openai/gpt-4.1-mini")) p.max_tokens = Math.min(Number(p.max_tokens || 235), 235);
    if (m.includes("openai/gpt-4.1") && !m.includes("mini")) p.max_tokens = Math.min(Number(p.max_tokens || 255), 255);
    return p;
  }

  function normalizeForCompare(s) {
    return (s || "").toLowerCase().replace(/[\u2019']/g, "'").replace(/[^a-z0-9\s?!.]/g, " ").replace(/\s+/g, " ").trim();
  }

  function ngrams(text, n) {
    const t = normalizeForCompare(text).split(" ").filter(Boolean);
    const out = new Set();
    for (let i = 0; i <= t.length - n; i++) out.add(t.slice(i, i + n).join(" "));
    return out;
  }

  function overlapScore(a, b) {
    const A = ngrams(a, 3);
    const B = ngrams(b, 3);
    if (A.size === 0) return 0;
    let hit = 0;
    for (const x of A) if (B.has(x)) hit++;
    return hit / A.size;
  }

  function lux_getRefusalMemory() {
    try {
      const raw = GM_getValue(LUX_REFUSAL_MEMORY_KEY, "[]");
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-20) : [];
    } catch {
      return [];
    }
  }

  function lux_pushRefusalMemory(txt) {
    try {
      const arr = lux_getRefusalMemory();
      arr.push(normalizeForCompare(txt));
      while (arr.length > 20) arr.shift();
      GM_setValue(LUX_REFUSAL_MEMORY_KEY, JSON.stringify(arr));
    } catch {}
  }

  function lux_refusalAlreadyUsed(text) {
    const mem = lux_getRefusalMemory();
    const norm = normalizeForCompare(text);
    return mem.some(x => overlapScore(x, norm) > 0.55);
  }

  function buildBanlistFromRecent(recent) {
    const banned = new Set();
    (recent || []).forEach(r => {
      for (const x of ngrams(r, 4)) banned.add(x);
      for (const x of ngrams(r, 5)) banned.add(x);
    });
    [
      "what's the first thing", "whats the first thing", "what's on your mind", "whats on your mind",
      "most spontaneous", "wildest", "craziest", "that picture of you", "in that picture you",
      "love the vibe in that picture", "vibe in that picture", "nice vibe to it", "atmosphere in that photo",
      "picture caught my attention", "interesting picture you shared", "that caught me off guard", "i can picture that", "if today ended well", "what would it look like",
      "finally together", "perfect saturday afternoon", "perfect sunday afternoon", "take it slow here", "keep chatting here for now", "not up for meeting just yet",
      "tied up with some stuff", "build this up a little more first", "took a peek at your profile", "peek at your profile", "checked your profile", "looked at your profile", "your profile gives me", "your profile gives off", "that sounds tempting", "you\'re moving fast", "not quite ready to jump into that", "keep chatting here a bit longer", "low key for now", "heading out so spontaneously", "what are you craving for dinner yourself", "i took a peek at your profile", "took a peek at your profile",
      "i had a look at your profile", "i looked at your profile", "i checked your profile", "i read your profile", "your profile gives me",
      "nope", "not happening", "forget it", "stop asking", "deal with it", "take it or leave it", "if you can not handle that", "if you can't handle that", "that's not how this works", "dont be silly", "don't be silly", "you should know better", "not my problem", "whatever",
      "your profile gives off", "your profile has a", "from your profile", "that sounds tempting", "sounds tempting with the dinner idea",
      "you are moving fast", "you're moving fast", "arent you", "aren't you", "not quite ready to jump into that", "jump into that just yet",
      "keep chatting here a bit longer", "just keeping things low key", "keeping things low key for now", "what made you think of heading out",
      "heading out so spontaneously", "what are you craving for dinner yourself", "dinner yourself", "dessert talk has me smiling",
      "i like the interest but", "i like the interest", "can be there soon", "send me a location", "what made you", "what kind of", "if you could", "what would it look like", "what is your idea of", "i understand why you asked but i", "that is a quick jump"
    ].forEach(x => banned.add(x));
    return Array.from(banned).slice(0, 220);
  }

  function luxViolatesMeetupBoundary(text) {
    const t = String(text || "").toLowerCase();
    return /\b(i'm free|i am free|i'm available|i am available|we can meet|let's meet|let us meet|we should meet|let's go out|we can grab coffee|we can go for drinks|come over|come through|pull up|where should we meet|what time works|tonight works|tomorrow works|i can meet you|i'd love to meet|i would love to meet)\b/i.test(t);
  }

  function luxNeedsHardMeetupRepair(userMsg, text) {
    if (!userMsg || !text) return false;
    const askedMeet = Safety.wantsMeet(userMsg) || Safety.wantsMeetSoft(userMsg) || Safety.wantsContact(userMsg) || Safety.mentionsAddress(userMsg);
    if (!askedMeet) return false;
    return luxViolatesMeetupBoundary(text);
  }


  function luxIsSiteTrustComplaint(text) {
    const s = String(text || "").toLowerCase();
    if (!s) return false;
    return /\b(?:scam|fraud|fake\s+(?:site|profile|profiles|account|accounts)|profiles?\s+(?:are|is|seem|look|feel)\s+(?:fake|bot|bots|not\s+real)|(?:this|the)\s+site\s+(?:is|seems|feels|looks)\s+(?:fake|a\s+scam|scammy|fraudulent)|\b(?:bot|bots|robot|robots)\b|are\s+you\s+(?:a\s+)?(?:bot|robot|fake|real)|you\s+(?:sound|seem|feel|look)\s+(?:like\s+)?(?:a\s+)?(?:bot|robot|fake|scripted)|not\s+(?:a\s+)?real\s+(?:person|woman|profile)|catfish|catfishing)\b/i.test(s);
  }

  function luxLooksCannedReaction(text) {
    return /\b(?:that\s+caught\s+me\s+off\s+guard|now\s+that\s+made\s+me\s+smile|i\s+didn['’]?t\s+expect\s+you\s+to\s+say\s+that|that\s+actually\s+sounds\s+interesting|i\s+can\s+picture\s+that|that\s+pulled\s+me\s+in\s+a\s+little|you\s+have\s+a\s+way\s+of\s+saying\s+things|that\s+made\s+me\s+pause\s+for\s+a\s+second)\b/i.test(String(text || ""));
  }

  function luxLooksCannedRefusal(text) {
    const s = String(text || "").toLowerCase();
    if (!s) return false;
    return /\b(?:i['’]?d\s+rather\s+keep\s+chatting\s+here|keep\s+chatting\s+here\s+for\s+now|keep\s+chatting\s+here\s+a\s+bit\s+longer|keep\s+things\s+(?:on|in)\s+here\s+for\s+now|take\s+it\s+slow\s+here|not\s+up\s+for\s+meeting(?:\s+tonight|\s+just\s+yet)?|not\s+ready\s+to\s+meet\s+just\s+yet|not\s+quite\s+ready\s+to\s+jump\s+into\s+that(?:\s+just\s+yet)?|tied\s+up\s+with\s+some\s+stuff|can['’]?t\s+have\s+anyone\s+over\s+just\s+yet|build\s+this\s+up\s+a\s+little\s+more\s+first|let['’]?s\s+build\s+this\s+up|finally\s+together|perfect\s+(?:saturday|sunday|monday|tuesday|wednesday|thursday|friday)?\s*(?:morning|afternoon|evening|night|day)|what\s+would\s+you\s+do\s+if\s+we\s+were\s+finally\s+together|what['’]?s\s+your\s+idea\s+of\s+a\s+perfect|if\s+today\s+ended\s+well|what\s+would\s+it\s+look\s+like|that\s+sounds\s+tempting|sounds\s+tempting\s+with\s+the\s+dinner\s+idea|you['’]?re\s+moving\s+fast|you\s+are\s+moving\s+fast|just\s+keeping\s+things\s+low\s+key|keeping\s+things\s+low\s+key\s+for\s+now|what\s+made\s+you\s+think\s+of\s+heading\s+out|heading\s+out\s+so\s+spontaneously|what\s+are\s+you\s+craving\s+for\s+dinner\s+yourself|dessert\s+talk\s+has\s+me\s+smiling|i\s+like\s+the\s+interest\s*,?\s+but)\b/i.test(s);
  }

  function luxRemoveCannedPhrases(text) {
    let t = String(text || "");
    if (!t) return t;
    const badSentences = /(?:^|[.!?]\s+)(?:that\s+caught\s+me\s+off\s+guard|now\s+that\s+made\s+me\s+smile|i\s+didn['’]?t\s+expect\s+you\s+to\s+say\s+that|that\s+actually\s+sounds\s+interesting|i\s+can\s+picture\s+that|that\s+pulled\s+me\s+in\s+a\s+little|you\s+have\s+a\s+way\s+of\s+saying\s+things|that\s+made\s+me\s+pause\s+for\s+a\s+second)[^.!?]*[.!?]?/gi;
    t = t.replace(badSentences, " ");
    t = t.replace(/(?:^|[.!?]\s+)(?:i\s+(?:took\s+a\s+peek|had\s+a\s+look|looked|checked|read)\s+(?:at\s+)?your\s+profile|i\s+peeked\s+at\s+your\s+profile|your\s+profile\s+(?:gives\s+me|gives\s+off|has)\s+[^.!?]*|from\s+your\s+profile\s+[^.!?]*)[.!?]?/gi, " ");
    t = t.replace(/\bI(?:'m| am)\s+appreciated\b/gi, "I appreciate that");
    t = t.replace(/\bI(?:'d| would)\s+rather\s+keep\s+chatting\s+here\s+for\s+now\s+if\s+that['’]?s\s+alright\.?/gi, "I would rather not rush off the site.");
    t = t.replace(/\bI(?:'m| am)\s+not\s+up\s+for\s+meeting(?:\s+tonight|\s+just\s+yet)?\b/gi, "I do not want to rush into meeting from a few messages");
    t = t.replace(/\bI(?:'m| am)\s+not\s+quite\s+ready\s+to\s+jump\s+into\s+that(?:\s+just\s+yet)?\b/gi, "I do not want to rush that from one message");
    t = t.replace(/\blet['’]?s\s+take\s+it\s+slow\s+here\s+(?:on\s+the\s+site\s+)?for\s+now\.?/gi, "Let me get a real feel for you here first.");
    t = t.replace(/\blet['’]?s\s+keep\s+chatting\s+here\s+a\s+bit\s+longer\.?/gi, "Stay with me here a little.");
    t = t.replace(/\bI\s+tend\s+to\s+keep\s+things\s+(?:on|in)\s+here\s+for\s+now\.?/gi, "");
    t = t.replace(/\bI(?:'m| am)\s+tied\s+up\s+with\s+some\s+stuff\s+tonight\s+and\s+can['’]?t\s+have\s+anyone\s+over\s+just\s+yet\.?/gi, "I am not inviting anyone over from a few messages.");
    t = t.replace(/\bLet['’]?s\s+build\s+this\s+up\s+a\s+little\s+more\s+first,?\s*okay\.?/gi, "I want this to feel natural before anything moves further.");
    t = t.replace(/\bHey,?\s+that\s+sounds\s+tempting\s+with\s+the\s+dinner\s+idea,?\s+but\s*/gi, "Dinner sounds sweet, but ");
    t = t.replace(/\bAw,?\s+[^,.!?]{0,40}?that['’]?s\s+so\s+tempting,?\s+but\s*/gi, "That is sweet, but ");
    t = t.replace(/\bthat\s+sounds\s+tempting,?\s+but\s*/gi, "That is sweet, but ");
    t = t.replace(/\byou['’]?re\s+moving\s+fast,?\s+aren['’]?t\s+you[,.]?\s*/gi, "I understand why you asked, but ");
    t = t.replace(/\bI\s+like\s+the\s+interest,?\s+but\s*/gi, "");
    t = t.replace(/\bjust\s+keeping\s+things\s+low\s+key\s+for\s+now\.?/gi, "I am keeping my evening simple.");
    t = t.replace(/\bThe\s+dessert\s+talk\s+has\s+me\s+smiling\s+though,?\s+you['’]?re\s+sweet\.?/gi, "That dinner line was sweet.");
    t = t.replace(/\bwhat\s+would\s+you\s+do\s+if\s+we\s+were\s+finally\s+together\?/gi, "");
    t = t.replace(/\bwhat['’]?s\s+your\s+idea\s+of\s+a\s+perfect\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)?\s*(?:morning|afternoon|evening|night|day)\s+anyway\?/gi, "");
    t = t.replace(/\bif\s+today\s+ended\s+well,?\s+what\s+would\s+it\s+look\s+like\?/gi, "");
    t = t.replace(/\bwhat\s+made\s+you\s+think\s+of\s+heading\s+out\s+so\s+spontaneously\s+today\?/gi, "");
    t = t.replace(/\bwhat\s+are\s+you\s+craving\s+for\s+dinner\s+yourself\?/gi, "");
    t = t.replace(/\s+([,.?])/g, "$1");
    t = t.replace(/([,.?]){2,}/g, "$1");
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
  }

  async function luxSiteTrustResponse(profileCard, customerMsg, regenDirective = "") {
    const tc = buildTimeContext();
    const sys = [
      "You are an adult woman on a dating site.",
      getAccentInstructionByCountry(profileCard?.country || ""),
      luxToneStyleInstruction(luxGetToneStyle(customerMsg || window.__LUX_LAST_USER || "")),
      "The customer is worried the site is a scam, fake, bots, or profiles are not real.",
      "Do not agree with the accusation and do not repeat their negative claim as if it is true.",
      "Reassure calmly that this is a real conversation platform and that you are genuinely present in the chat.",
      "Do not overpromise, do not sound defensive, do not mention policies, moderators, scripts, AI, automation, or bots.",
      "Sound human, steady, and warm, like a woman responding to mistrust without getting offended.",
      "If you ask a question, make it about what made him feel unsure in this exact moment, not a generic question.",
      "Never ask daypart filler questions or perfect day questions.",
      "Only use comma, period, question mark, and apostrophe.",
      "No emojis.",
      "Keep it to 2 or 3 sentences.",
      `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
      personaCardLine(profileCard) || "",
      regenDirective || ""
    ].join(" ");
    const user = `Customer message: "${String(customerMsg || "").slice(0, 280)}"\nWrite one natural reassurance. Do not agree that the site is a scam or that profiles are bots.`;
    let out = "";
    try {
      out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], {
        max_tokens: 130,
        temperature: 0.42,
        top_p: 0.88,
        frequency_penalty: 0.25,
        presence_penalty: 0.15
      });
    } catch {}
    out = postFormat(luxRemoveCannedPhrases(out || ""));
    if (!out || /\b(?:scam|fake|bot|bots|robot|fraud)\b/i.test(out) && /\b(?:yes|yeah|true|agree)\b/i.test(out)) {
      out = "I understand why online places can make someone cautious, but this is a real conversation and I am here with you. What made you feel unsure about me just now?";
    }
    return out;
  }


  function luxHumanReaction(seed) {
    return "";
  }

  function luxShouldAddReaction(userMsg, replyText) {
    return false;
  }

  function luxEnsureQuestion(text, seed) {
    const t = String(text || "").trim();
    if (!t || /\?/.test(t)) return t;
    // No hardcoded fallback questions here. Forced question pools caused long-run repetition.
    // The system prompt now tells the model to create a fresh, context-based question itself.
    return t;
  }


  function luxExtractFinalQuestion(text) {
    const t = String(text || "").trim();
    if (!t.includes("?")) return "";
    const parts = t.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].includes("?")) return parts[i];
    }
    const idx = t.lastIndexOf("?");
    const start = Math.max(t.lastIndexOf(".", idx), t.lastIndexOf("!", idx));
    return t.slice(start + 1, idx + 1).trim();
  }

  function luxQuestionShape(q) {
    const words = normalizeForCompare(q).split(" ").filter(Boolean);
    return words.slice(0, 6).join(" ");
  }

  function luxQuestionRepeatsRecent(text) {
    const q = luxExtractFinalQuestion(text);
    if (!q) return false;
    const shape = luxQuestionShape(q);
    if (!shape) return false;
    return lux_getRecentReplies().some(r => {
      const rq = luxExtractFinalQuestion(r);
      if (!rq) return false;
      const oldShape = luxQuestionShape(rq);
      if (!oldShape) return false;
      return oldShape === shape || overlapScore(shape, oldShape) > 0.62;
    });
  }

  function luxLooksGenericQuestion(text) {
    const q = luxExtractFinalQuestion(text).toLowerCase();
    if (!q) return false;
    return /\b(?:what\s+made\s+you|what\s+kind\s+of|what\s+would\s+it\s+look\s+like|if\s+today\s+ended\s+well|what\s+is\s+your\s+idea\s+of|what['’]?s\s+your\s+idea\s+of|what\s+are\s+you\s+up\s+to|how\s+was\s+your\s+day|tell\s+me\s+about\s+yourself|what['’]?s\s+the\s+interesting\s+thing|perfect\s+(?:morning|afternoon|evening|night|weekend|day|date)|finally\s+together|first\s+thing\s+you\s+would\s+do|what\s+are\s+you\s+craving|what\s+would\s+you\s+do\s+if\s+we)\b/i.test(q);
  }

  function luxIsBoundaryRequest(userMsg) {
    const m = String(userMsg || "");
    try {
      return Safety.wantsMeet(m) || Safety.wantsMeetSoft(m) || Safety.wantsContact(m) || Safety.mentionsAddress(m) || Safety.wantsExactLocation(m);
    } catch {
      return /\b(?:meet|date|coffee|dinner|come\s+over|come\s+to\s+you|pull\s+up|location|address|where\s+do\s+you\s+live|where\s+exactly|number|phone|whatsapp|telegram|snapchat|instagram|facebook|email|hangouts|social\s+media)\b/i.test(m);
    }
  }

  function luxLooksBoundaryTemplate(text) {
    const s = String(text || "").toLowerCase();
    if (!s) return false;
    return /\b(?:keep\s+(?:chatting|things)\s+(?:here|on\s+here)|take\s+it\s+slow|not\s+(?:ready|up)\s+(?:to|for)|rather\s+not\s+rush|rush\s+off\s+the\s+site|build\s+this\s+up|low\s+key\s+for\s+now|moving\s+fast|quick\s+jump|tempting|privacy\s+matters|comfortable\s+sharing|give\s+out\s+my\s+(?:number|address|location)|not\s+giving\s+out|stay\s+with\s+me\s+here)\b/i.test(s);
  }

  function luxViolatesStrictNoRepeat(userMsg, text) {
    const t = String(text || "");
    if (!t.trim()) return false;
    if (luxLooksCannedReaction(t) || luxLooksCannedRefusal(t) || luxLooksDismissive(t)) return true;
    if (luxLooksGenericQuestion(t) || luxQuestionRepeatsRecent(t)) return true;
    if (luxIsBoundaryRequest(userMsg) && luxLooksBoundaryTemplate(t)) return true;
    if (lux_isTooSimilarToRecent(t)) return true;
    return false;
  }

  function luxDropFinalQuestionIfBad(text) {
    let t = String(text || "").trim();
    if (!t) return t;
    const q = luxExtractFinalQuestion(t);
    if (!q) return t;
    if (!luxLooksGenericQuestion(t) && !luxQuestionRepeatsRecent(t)) return t;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp("\\s*" + escaped + "\\s*$", "i"), "").trim();
    t = t.replace(/[,.\s]+$/g, ".").trim();
    return t;
  }

  function luxStrictNoRepeatClean(text, userMsg = "") {
    let t = String(text || "");
    t = luxRemoveCannedPhrases(t);
    t = luxDropFinalQuestionIfBad(t);
    if (luxIsBoundaryRequest(userMsg)) {
      t = t.replace(/\bI\s+understand\s+why\s+you\s+asked,?\s+but\s*/gi, "");
      t = t.replace(/\bI\s+like\s+the\s+interest,?\s+but\s*/gi, "");
      t = t.replace(/\bI\s+would\s+rather\s+not\s+rush\s+off\s+the\s+site\.?/gi, "That feels a little too soon for me.");
      t = t.replace(/\bI\s+do\s+not\s+want\s+to\s+rush\s+(?:into\s+meeting\s+from\s+a\s+few\s+messages|that\s+from\s+one\s+message)\.?/gi, "That feels a little too soon for me.");
      t = t.replace(/\bStay\s+with\s+me\s+here\s+a\s+little\.?/gi, "Let the conversation breathe a little.");
      t = t.replace(/\bI\s+want\s+this\s+to\s+feel\s+natural\s+before\s+anything\s+moves\s+further\.?/gi, "I want the conversation to feel real first.");
    }
    return t.replace(/\s{2,}/g, " ").trim();
  }



  function luxGetCustomPersonaText() {
    try {
      return String(GM_getValue("lux_persona", "") || "").trim();
    } catch {
      return "";
    }
  }

  function luxCustomPersonaPrompt() {
    const custom = luxGetCustomPersonaText();
    if (!custom) return "";
    return [
      "Custom persona active. The operator has written a custom LUX persona and it must shape the reply voice, backstory, identity details, emotional style, hobbies, job, preferences, relationship energy, and writing rhythm.",
      "Use the custom persona as the main character layer, not as a weak suggestion, while still obeying all LUX safety and platform rules.",
      "Never let the custom persona reveal contacts, social handles, exact address, private location, or agree to an immediate meetup when those are blocked.",
      "Never let the custom persona override latest-image-only handling, no repetition, warm boundary tone, punctuation cleanup, or scam/bot reassurance rules.",
      "Do not mention that a custom persona exists. Just sound like that person naturally.",
      "Custom persona text, " + custom
    ].join(" ");
  }

  function luxMessagesWithCustomPersona(messages) {
    const layer = luxCustomPersonaPrompt();
    const list = Array.isArray(messages) ? messages.map(m => ({ ...m })) : [];
    if (!layer) return list;
    const idx = list.findIndex(m => m && m.role === "system");
    if (idx >= 0) {
      const existing = String(list[idx].content || "");
      if (!existing.includes("Custom persona active.")) {
        list[idx].content = `${existing}\n${layer}`.trim();
      }
    } else {
      list.unshift({ role: "system", content: layer });
    }
    return list;
  }

  function buildSystemPrompt(leftCard, customSystem, imageNotes, imageIntent = "unknown") {
    const card = personaCardLine(leftCard) || "";
    const modelName = (GM_getValue("lux_model", MODEL_DEFAULT) || "").trim().toLowerCase();
    const last = (window.__LUX_LAST_USER || "");
    const toneInfo = lux_detectTone(last);
    const qGuide = luxQuestionGuide(toneInfo.tone, toneInfo.engagement, last);
    const accentInstruction = getAccentInstructionByCountry(leftCard?.country || "");
    const recent = lux_getRecentReplies();
    const banlist = buildBanlistFromRecent(recent);
    const banBlock = banlist.length ? ` Avoid echoing these recent words or reply shapes, ${banlist.join(" | ")}.` : "";
    const autoTone = luxGetToneStyle(last);
    const toneLine = luxToneStyleInstruction(autoTone);
    const greetingLine = luxIsGreetingOnly(last)
      ? "This is mainly a greeting. Answer with a warm, lived in greeting, not a bare hi and not a generic day question."
      : "";

    const imageLine = imageNotes && String(imageNotes).trim()
      ? `Latest customer turn includes an attached image. Use only the latest image, and only mention details you can safely infer from the vision input or these notes, ${String(imageNotes).trim()}.`
      : "No image is attached to the latest customer message. Do not mention pictures, photos, screenshots, or image vibes unless his words are clearly about a profile picture comment.";

    const profileLine = imageIntent === "profile_comment"
      ? "The customer is commenting on your profile picture, not sending his own picture. Reply to the compliment naturally and do not analyze the photo like a report."
      : "";

    let flavor = "";
    if (modelName.includes("x-ai/grok")) flavor = "Model voice, Grok. Be emotionally aware, mature, smooth, grounded, and feminine, with natural warmth and subtle wit only when it fits.";
    else if (modelName.includes("deepseek/deepseek-chat")) flavor = "Model voice, DeepSeek. Be smooth, conversational, and emotionally fluid, but keep it clear and not dramatic.";
    else if (modelName.startsWith("openai/gpt-4.1-mini")) flavor = "Model voice, GPT 4.1 mini. Be concise, clear, and exact while still sounding human.";
    else if (modelName.startsWith("openai/gpt-4.1")) flavor = "Model voice, GPT 4.1. Be coherent, grounded, precise, and still warm.";
    else if (modelName.startsWith("anthropic/claude-3.5-sonnet")) flavor = "Model voice, Claude. Be soft, mature, thoughtful, and emotionally present.";

    const baseCore = [
      "You are an adult woman, she and her, chatting with a man on a dating site.",
      accentInstruction,
      "Keep the v14.6.12 natural feel, warm, human, specific, and relaxed, not over polished and not AI sounding.",
      "Do not explain rules. Do not sound like customer support, a safety policy, or a chatbot.",
      toneLine,
      greetingLine,
      "Let the customer's tone choose the response style naturally, sweet, sensual, humorous, generous, or deflecting, but never label the tone in the reply.",
      "Answer the whole latest message, not just one keyword. If he mixes a compliment with a meetup, contact, address, or sexual line, receive the compliment briefly, then handle the boundary softly.",
      "For meetups, contact, social handles, exact address, location, phone, calls, or verification pressure, keep the boundary warm, respectful, and brief. Do not scold, mock, dismiss, or sound cold.",
      "If he says the site is fake, scam, bots, or profiles are not real, do not agree. Reassure naturally that he is speaking to a real person here without sounding corporate or defensive.",
      "No fixed alibis, no canned refusal templates, no canned profile check openers, no canned image openers, no repeated question shapes." + banBlock,
      "Do not say I took a peek at your profile, I checked your profile, your profile gives me, that caught me off guard, I can picture that, or if today ended well.",
      "Ask at most one open ended question. It must come from a concrete detail in his latest message. Skip the question if it would sound like filler.",
      qGuide,
      imageLine,
      profileLine,
      "For images, never use vague lines like I love the vibe in that picture. Mention one concrete visible detail only when it helps. Do not assume the person in the image is him unless he says so.",
      "Use only comma, period, question mark, and apostrophe. Keep under 800 characters.",
      flavor,
      card
    ].filter(Boolean).join(" ");

    const customLayer = luxCustomPersonaPrompt();
    return [baseCore, customLayer].filter(Boolean).join(" ").trim();
  }

  let shortHistory = [];
  let lastSeen = "";
  let luxGeneratingSig = "";
  let luxWatcherTimer = null;

  function _threadKey() {
    try {
      const name = (parseLeftProfile().realName || "Lux");
      const path = (location.pathname || "/").slice(0, 128);
      return `lux_thread_${name}__${path}`;
    } catch {
      return "lux_thread_Lux__/";
    }
  }

  function _loadHistory() {
    try {
      const raw = GM_getValue(_threadKey(), "[]");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) shortHistory = arr.slice(-HISTORY_MAX);
    } catch {}
  }

  function _saveHistory() {
    try { GM_setValue(_threadKey(), JSON.stringify(shortHistory.slice(-HISTORY_MAX))); }
    catch {}
  }
  _loadHistory();

  function lux_cleanHistoryMessage(msg) {
    if (!msg) return msg;
    if (Array.isArray(msg.content)) return msg;
    const split = extractLuxImageMeta(msg.content || "");
    const content = stripStampsAll(split.text || "");
    return { ...msg, content };
  }

  function lux_cleanHistoryArray(history) { return (history || []).map(lux_cleanHistoryMessage); }

  function lux_buildHistoryByTokens(history, maxTokensForHistory) {
    const cleaned = lux_cleanHistoryArray(history || []);
    let total = 0;
    const reversed = [...cleaned].reverse();
    const kept = [];
    for (const msg of reversed) {
      let tokenSource = "";
      if (Array.isArray(msg.content)) {
        tokenSource = msg.content.map(part => {
          if (!part) return "";
          if (part.type === "text") return part.text || "";
          if (part.type === "image_url") return "[image]";
          return "";
        }).join(" ");
      } else {
        tokenSource = msg.content || "";
      }
      const t = lux_estimateTokens(tokenSource);
      if (total + t > maxTokensForHistory) break;
      total += t;
      kept.push(msg);
    }
    return kept.reverse();
  }

  const LUXPatch = (typeof window.LUXPatch !== "undefined" ? window.LUXPatch : (window.LUXPatch = {}));

  LUXPatch.NoRepeat = (() => {
    const bannedPhrases = [
      "what's the first thing", "whats the first thing",
      "what's on your mind", "whats on your mind",
      "tell me what's on your mind", "tell me what is on your mind",
      "how was your day", "what are you up to", "tell me about yourself",
      "most spontaneous", "wildest", "craziest", "that picture of you", "in that picture you",
      "i love the vibe in that picture", "nice vibe to it", "atmosphere in that photo",
      "i'm catching up on work", "my battery is low", "i've got a few things to handle tonight", "that caught me off guard", "i can picture that", "that made me pause", "if today ended well", "what would it look like", "finally together", "perfect saturday afternoon", "take it slow here", "keep chatting here for now", "not up for meeting just yet", "tied up with some stuff", "build this up a little more first"
    ];
    const bannedRegexes = [
      /let['’]?s\s+keep\s+building\s+(?:the\s+)?(?:heat|connection)(?:\s+or\s+(?:the\s+)?(?:heat|connection))?/gi,
      /keep\s+building\s+(?:the\s+)?(?:heat|connection)/gi,
      /\bbuild(?:ing)?\s+(?:the\s+|our\s+)?(?:heat|connection)\b/gi
    ];
    function scrub(text) {
      if (!text) return text;
      let out = String(text);
      bannedPhrases.forEach(p => {
        const rx = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        out = out.replace(rx, "");
      });
      bannedRegexes.forEach(rx => { out = out.replace(rx, ""); });
      out = out.replace(/\b(\w+)(\s+\1\b)+/gi, "$1");
      out = out.replace(/\s{2,}/g, " ").trim();
      return out;
    }
    return { scrub };
  })();

  const Safety = (() => {
    const CONTACT_REQUEST_RE = /\b(?:what(?:'| i)?s\s+(?:your\s+)?(?:number|no\.?|email)|give\s+me\s+(?:your\s+)?(?:number|email)|add\s+me\s+on\s+(?:whatsapp|ig|instagram|snap(?:chat)?|telegram|discord)|dm\s+me\s+on\s+(?:ig|instagram|x|twitter)|hit\s+me\s+up\s+on\s+(?:whatsapp|ig|instagram|snap|telegram|discord)|call\s+me|text\s+me|send\s+me\s+(?:your\s+)?contact|share\s+(?:your\s+)?(?:number|email)|give\s+me\s+your\s+contact|reach\s+me\s+at)\b/i;
    const MEET_EXPLICIT_RE = /\b(?:let['’]?s\s+(?:meet|hang(?:\s*out)?|link\s*up|grab\s+(?:a\s+)?(?:drink|coffee)|go\s+for\s+(?:drinks?|coffee))|see\s+you\s+(?:tonight|tomorrow|later)|(?:bar|club|restaurant|dinner|lunch|brunch|date|coffee|café|cafe|drinks?|hookup))\b/i;
    const MEET_INDIRECT_RE = /\b(?:are\s+you\s+(?:available|free|around)\b|you\s+(?:free|available)\b|when\s+(?:are\s+you\s+)?free\b|what\s+time\s+works\b|would\s+you\s+like\s+to\s+meet\b|can\s+we\s+(?:meet|link|hang)\b|can\s+i\s+see\s+you\b|see\s+you\s+(?:later|tonight)\b|pull\s+up\b|come\s+through\b)\b/i;
    const ADDRESS_RE = /\b(address|house|apartment|home|street|avenue|road|rd\.?|st\.?)\b/i;
    const NAME_RE = /\b(what(?:'| i)?s\s+your\s+name|ur\s*name|name\s*please|name\s*pls|who\s+are\s+you)\b/i;
    const LOCATION_RE = /\b(where\s+do\s+you\s+(?:live|stay)|where\s+are\s+you|what\s+city|your\s+city|your\s+location|send\s+me\s+(?:a\s+)?(?:location|your\s+location|address|your\s+address)|give\s+me\s+(?:a\s+)?(?:location|your\s+location|address|your\s+address)|drop\s+(?:a\s+)?(?:location|your\s+location|address|your\s+address)|send\s+(?:your\s+)?pin|drop\s+(?:your\s+)?pin|where\s+are\s+you\s+based|where\s+are\s+u\s+at|what\s+part\s+are\s+you\s+in|where\s+do\s+you\s+reside|what\s+part\s+of\s+town|where\s+you\s+located|where\s+are\s+you\s+located)\b/i;
    const JOB_RE = /\b(what\s+do\s+you\s+do|your\s+job|your\s+work|what\s+is\s+your\s+job|occupation|career|what\s+do\s+you\s+work\s+as)\b/i;
    const USER_MENTIONS_FAMILY_RE = /\b(family|my\s+(?:sister|brother|mom|mother|dad|father|parents?|cousin|aunt|uncle|kids?|child|niece|nephew)|babysit(?:ting)?|family\s+issues?)\b/i;
    const FAMILY_WORD_RE = /\b(family|mom|mother|dad|father|parents?|sister|brother|cousin|aunt|uncle|kids?|child|children|babysit(?:ting)?|relatives?)\b/gi;
    const INCEST_RE = /\b(?:incest|brother and sister|mother and son|father and daughter|mom and son|dad and daughter|family sex|sleep with my sister|sleep with my mother|sleep with my mom|sleep with my daughter|sexual with my sister|sexual with my mother|sexual with my daughter)\b/i;
    const BESTIALITY_RE = /\b(?:bestiality|animal sex|sex with (?:a |an )?(?:dog|cat|horse|animal|pet)|fucking (?:a |an )?(?:dog|cat|horse|animal|pet)|my dog turned me on|my pet turned me on)\b/i;
    const DRUG_USE_RE = /\b(?:cocaine|weed|marijuana|meth|heroin|crack|ecstasy|mdma|molly|ketamine|lsd|shrooms|drug use|getting high|get high|snort|inject|smoke a blunt|take pills to get high)\b/i;
    const RACISM_RE = /\b(?:racist|race play|racial humiliation|white power|black people are|asian people are|slave play|nazi|neo nazi|kkk|hate (?:black|white|asian|jewish|muslim) people)\b/i;

    const wantsContact = s => CONTACT_REQUEST_RE.test((s || "").toLowerCase());
    const wantsMeet = s => MEET_EXPLICIT_RE.test((s || "").toLowerCase());
    const wantsMeetSoft = s => MEET_INDIRECT_RE.test((s || "").toLowerCase());
    const mentionsAddress = s => ADDRESS_RE.test((s || "").toLowerCase());
    const askName = s => NAME_RE.test((s || "").toLowerCase());
    const wantsLocation = s => LOCATION_RE.test((s || "").toLowerCase());
    const wantsJob = s => JOB_RE.test((s || "").toLowerCase());

    function getBlockedTopic(text) {
      const s = String(text || "");
      if (INCEST_RE.test(s)) return "incest";
      if (BESTIALITY_RE.test(s)) return "bestiality";
      if (DRUG_USE_RE.test(s)) return "drug use";
      if (RACISM_RE.test(s)) return "racism";
      return "";
    }

    function deFamily(text, customerMsg) {
      if (!text) return text;
      const userMentionedFamily = USER_MENTIONS_FAMILY_RE.test(customerMsg || "");
      if (userMentionedFamily) return text;
      let t = String(text);
      if (FAMILY_WORD_RE.test(t)) {
        const options = [
          "I've got a few things to handle tonight",
          "I promised myself a quiet evening",
          "I've got an early start and need to relax",
          "I'm in the middle of small chores and bits",
          "I'm cooking and keeping it low key",
          "My battery is low so I'm keeping it light",
          "I'm catching up on work and want to stay focused",
          "I'm staying in and keeping it simple"
        ];
        const tc = buildTimeContext();
        const pick = pickByHash(options, `${customerMsg || ""}|${tc.dayName}|${tc.daypart}`) || options[0];
        t = t.replace(FAMILY_WORD_RE, "").replace(/\s{2,}/g, " ").trim();
        if (!t || t.length < 8) t = pick + ".";
        else if (!/[.]\s*$/.test(t)) t += ".";
      }
      return t;
    }

    async function modelRefusal(kind, profileCard, customerMsg, regenDirective = "") {
      const tc = buildTimeContext();
      const kindLine =
        kind === "meet" ? "He is asking to meet, date, visit, come over, or make plans off the site."
        : kind === "address" ? "He is asking for address, location, exact place, or directions."
        : "He is asking for phone, WhatsApp, Telegram, email, social handle, call, text, or another off site contact.";
      const sys = [
        "You are an adult woman on a dating site.",
        getAccentInstructionByCountry(profileCard?.country || ""),
        luxToneStyleInstruction(luxGetToneStyle(customerMsg)),
        "Reply like a real woman texting in the moment, not like an assistant, policy, support agent, or scripted boundary.",
        "Keep it short, warm, calm, and believable.",
        "Receive the human part of his message first if there is a compliment, desire, joke, worry, or pressure, then refuse only the contact, meetup, address, or location part.",
        "Do not be rude, sharp, dismissive, sarcastic, offended, superior, or final.",
        "Do not use a stock excuse, repeated alibi, profile-review wording, daypart filler, or a generic final question.",
        "Do not give contact details, exact location, address, social media, or agree to meet.",
        "A final question is optional and should be skipped if it would sound fake.",
        luxBuildCustomerCoverageDirective(customerMsg),
        `Context, ${kindLine}`,
        `Time context, ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        personaCardLine(profileCard) || "",
        regenDirective || ""
      ].filter(Boolean).join(" ");
      const user = `Customer: "${(customerMsg || "").slice(0, 360)}"\nWrite one natural reply, maximum 2 short sentences.`;
      let out = "";
      try {
        out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], {
          max_tokens: 90,
          temperature: 0.36,
          top_p: 0.88
        });
      } catch {}
      out = postFormat(out || "");
      return out || "I like that you are direct, but I am not giving that out this quickly. Stay with me here a little longer.";
    }

    async function blockedTopicRefusal(kind, profileCard, customerMsg, regenDirective = "") {
      const tc = buildTimeContext();
      const kindLine = kind === "incest" ? "They brought up incest or sexual activity within family."
        : kind === "bestiality" ? "They brought up sex involving animals."
        : kind === "drug use" ? "They brought up drug use or getting high."
        : "They brought up racism or race based degradation.";
      const sys = [
        "You are an adult woman on a dating site.",
        getAccentInstructionByCountry(profileCard?.country || ""),
        "Refuse calmly and briefly.",
        "Do not engage with the topic.",
        "Do not debate it.",
        "Do not encourage it.",
        "Set a soft but clear boundary, then redirect to a harmless different topic.",
        "Keep it natural, feminine, simple, and human.",
        "No emojis.",
        "Only use comma, period, question mark, and apostrophe.",
        "Return only 2 sentences.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        personaCardLine(profileCard) || "",
        regenDirective || ""
      ].join(" ");
      const user = `Context: ${kindLine}\nCustomer: "${(customerMsg || "").slice(0, 260)}"\nReply with a brief refusal and redirect to a safer subject.`;
      let out = "";
      try {
        out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], {
          max_tokens: 95,
          temperature: 0.28,
          top_p: 0.86
        });
      } catch {}
      out = postFormat(out || "");
      return out || "I'm not comfortable with that kind of talk, dear. Tell me something lighter about you instead?";
    }

    async function enforceNoMeetAccept(userMsg, text, profileCard) {
      const BAD = /\b(?:i(?:'| )?m\s+(?:free|available)\b|we\s+can\s+(?:meet|link|hang)\b|let'?s\s+(?:meet|link|hang)\b|what\s+time\s+works\b|where\s+should\s+we\s+meet\b|i\s+can\s+pull\s+up\b|come\s+through\b)\b/i;
      if (!text) return text;
      if (BAD.test(String(text).toLowerCase())) return await modelRefusal("meet", profileCard, userMsg);
      return deFamily(text, userMsg);
    }

    return { wantsContact, wantsMeet, wantsMeetSoft, mentionsAddress, askName, wantsLocation, wantsJob, getBlockedTopic, modelRefusal, blockedTopicRefusal, enforceNoMeetAccept };
  })();

  const ALLOWED_RE = /[^0-9A-Za-z\s\.,\?']/g;

  function isFoodContext(text) {
    return /\b(food|meal|dinner|lunch|breakfast|snack|taste|recipe|flavor|flavour|cook|cooking|spice|spices)\b/i.test(text || "");
  }

  function purgeBannedWords(s) {
    let t = (s || "");
    t = t.replace(/\boh\s+wow\b/gi, "");
    t = t.replace(/\boh\b/gi, "");
    t = t.replace(/\bI(?:'m| am)\s+flattered\s+(?:that\s+)?(you(?:'re| are)\b)/gi, "I can tell $1");
    t = t.replace(/\bI(?:'m| am)\s+flattered\s+by\b/gi, "I appreciate");
    t = t.replace(/\bI(?:'m| am)\s+flattered\b/gi, "I appreciate that");
    t = t.replace(/\bflattered\b/gi, "touched");
    t = t.replace(/\bI(?:'m| am)\s+appreciated\b/gi, "I appreciate that");
    t = t.replace(/\benthusiasm(s)?\b/gi, "interest");
    t = t.replace(/\benthusaism(s)?\b/gi, "interest");
    t = t.replace(/\bwith\s+(?:great\s+)?enthusiasm\b/gi, "with interest");
    t = t.replace(/\bwith\s+(?:eager|high)\s+(?:enthusiasm|excitement)\b/gi, "with interest");
    t = t.replace(/\bsizzling\b/gi, "lively");
    if (!isFoodContext(t)) t = t.replace(/\bspicy\b/gi, "bold");
    t = t.replace(/\bflirty\b/gi, "playful");
    t = t.replace(/\bflirt(?:s|ed|ing)?\b/gi, "chat");
    t = t.replace(/\bthat picture of you\b/gi, "that photo");
    t = t.replace(/\bin that picture you\b/gi, "in that photo");
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
  }

  function toAscii(s) {
    return (s || "")
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2032|\u02BC|`|\u00B4/g, "'")
      .replace(/[–—\-]/g, " ")
      .replace(/\u2026/g, "...")
      .replace(/\r?\n+/g, " ");
  }

  function stripDisallowedPunct(s) { return (s || "").replace(ALLOWED_RE, ""); }

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
      [/\bneednt\b/gi, "needn't"]
    ];
    for (const [re, to] of rules) t = t.replace(re, to);
    return t;
  }

  function applyLexiconPrefs(s) {
    const prefs = [
      { from: /\binterested\b/gi, to: "curious" },
      { from: /\bvery\b/gi, to: "" },
      { from: /\bsexy\b/gi, to: "bold" },
      { from: /\bunwind\b/gi, to: "relax" },
      { from: /\berrand(s)?\b/gi, to: "small chores" },
      { from: /\bfavo(u?)rite(s)?\b/gi, to: "best thing" }
    ];
    let t = s;
    for (const r of prefs) t = t.replace(r.from, r.to);
    return t;
  }

  function normalizeSpaces(s) {
    let t = (s || "").replace(/\s+/g, " ");
    t = t.replace(/\s+([,\.!?])/g, "$1");
    t = t.replace(/([,\.!?])(?!\s|$)/g, "$1 ");
    t = t.replace(/\s{2,}/g, " ");
    return t.trim();
  }

  function fixPronounI(s) {
    return s.replace(/\b(i)\b/g, "I").replace(/\bi'm\b/gi, "I'm").replace(/\bi've\b/gi, "I've").replace(/\bi'd\b/gi, "I'd").replace(/\bi'll\b/gi, "I'll");
  }

  function ensureTerminalPunct(s) {
    s = s.trim();
    return s ? (/[.!?]$/.test(s) ? s : (s + ".")) : s;
  }

  function enforceFeminineTone(s) {
    let t = s || "";
    t = t.replace(/\bI'm\s+(?:a\s+)?(?:guy|man|male)\b/gi, "I'm a woman");
    t = t.replace(/\bI\s+identify\s+as\s+(?:a\s+)?(?:man|male)\b/gi, "I identify as a woman");
    t = t.replace(/\bI'm\s*(?:he\/him|he\/him\/his)\b/gi, "I'm she/her");
    t = t.replace(/\bmy\s+pronouns\s*(?:are|:)\s*(?:he\/him|he\/him\/his)\b/gi, "my pronouns are she/her");
    return t;
  }

  function luxSentenceCase(text) {
    let t = String(text || "").trim();
    if (!t) return t;
    t = t.replace(/\s+/g, " ");
    t = t.replace(/(^|[.!?]\s+)([a-z])/g, (_, a, b) => a + b.toUpperCase());
    t = t.replace(/\bi\b/g, "I");
    return t;
  }

  function luxRepairPunctuation(text) {
    let t = String(text || "");
    t = t.replace(/[!]{2,}/g, "!");
    t = t.replace(/[?]{2,}/g, "?");
    t = t.replace(/[.]{3,}/g, "...");
    t = t.replace(/[:;()]/g, " ");
    t = t.replace(/\s*([,.!?])\s*/g, "$1 ");
    t = t.replace(/\s+,/g, ",");
    t = t.replace(/\s+\./g, ".");
    t = t.replace(/\s+\?/g, "?");
    t = t.replace(/\s+!/g, "!");
    t = t.replace(/,\s*,+/g, ", ");
    t = t.replace(/\.\s*\./g, ".");
    t = t.replace(/\?\s*\?/g, "?");
    t = t.replace(/!\s*!/g, "!");
    t = t.replace(/,\s*\./g, ".");
    t = t.replace(/,\s*\?/g, "?");
    t = t.replace(/,\s*!/g, "!");
    t = t.replace(/\.\s*\?/g, "?");
    t = t.replace(/\.\s*!/g, "!");
    t = t.replace(/\?\s*\./g, "?");
    t = t.replace(/!\s*\./g, "!");
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
  }

  function luxSplitRunOns(text) {
    let t = String(text || "").trim();
    if (!t) return t;
    // Conservative only. Do not insert new periods before pronouns, because that creates broken fragments like "As. I" and "before. I".
    t = t.replace(/\b(as|if|when|while|before|after|because|though|although|until|unless|since|than|that|what|where|how|why)\.\s+(I|you|he|she|they|we)\b/gi, "$1 $2");
    t = t.replace(/\b(and|but|so|or)\.\s+(I|you|he|she|they|we)\b/gi, "$1 $2");
    t = t.replace(/\.\s*\.\s*/g, ". ");
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
  }

  function luxEnsureSingleQuestion(text) {
    let t = String(text || "").trim();
    if (!t) return t;
    const matches = [...t.matchAll(/\?/g)];
    if (matches.length <= 1) return t;
    const lastIndex = matches[matches.length - 1].index;
    t = t.split("").map((ch, i) => ch === "?" && i !== lastIndex ? "." : ch).join("");
    t = t.replace(/\.\./g, ".");
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
  }


  function luxDropGenericFinalQuestion(text) {
    let t = String(text || "").trim();
    if (!t || !/\?\s*$/.test(t)) return t;
    const parts = t.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [t];
    if (!parts.length) return t;
    const last = String(parts[parts.length - 1] || "").trim();
    const genericQuestion = /(?:what(?:'s| is)\s+(?:the\s+)?(?:most\s+)?(?:interesting|wildest|craziest|spontaneous|adventurous)\s+thing|what(?:'s| is)\s+something\s+(?:interesting|fun|different|wild|crazy|spontaneous)|what\s+kind\s+of\s+day\s+have\s+you\s+had|how\s+was\s+your\s+day|what\s+are\s+you\s+up\s+to|tell\s+me\s+about\s+yourself|what\s+.*\byou(?:'ve| have)\s+ever\s+done\b|what\s+.*\bon\s+a\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:morning|afternoon|evening|night)\s+like\s+this|what(?:'s| is)\s+your\s+idea\s+of\s+a\s+perfect|perfect\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)?\s*(?:morning|afternoon|evening|night|day)|what\s+would\s+you\s+do\s+if\s+we\s+were\s+finally\s+together|if\s+today\s+ended\s+well|what\s+would\s+it\s+look\s+like|what\s+made\s+you\s+think\s+of\s+heading\s+out|heading\s+out\s+so\s+spontaneously|what\s+are\s+you\s+craving\s+for\s+dinner\s+yourself|what\s+made\s+you\s+so\s+eager\s+to\s+move\s+this\s+fast|what\s+made\s+you\s+decide\s+to\s+push\s+for\s+that\s+right\s+now|what\s+were\s+you\s+hoping\s+would\s+happen|what\s+are\s+you\s+trying\s+to\s+find\s+here|what\s+your\s+plan\s+if\s+i\s+said\s+yes|what\s+your\s+first\s+move\s+if\s+i\s+trusted\s+you)/i;
    if (!genericQuestion.test(last)) return t;
    parts.pop();
    t = parts.join(" ").replace(/\s{2,}/g, " ").trim();
    if (!t) return "";
    if (!/[.!?]$/.test(t)) t += ".";
    return t;
  }

  function luxEnsureEnding(text) {
    let t = String(text || "").trim();
    if (!t) return t;
    if (!/[.!?]$/.test(t)) t += ".";
    return t;
  }

  function luxFinalGrammarPass(text) {
    let t = String(text || "").trim();
    if (!t) return t;
    t = t.replace(/^[\s,\.\?!]+/, "").trim();
    t = t.replace(/\bI(?:'m| am)\s+appreciated\b/gi, "I appreciate that");
    t = t.replace(/\bwhat(?:'s| is)\s+the\s+interesting\s+thing\b/gi, "what is something that actually stood out");
    t = t.replace(/\s*([,.?])\s*/g, "$1 ");
    t = t.replace(/,\s*([.?])/g, "$1");
    t = t.replace(/\.\s*,/g, ".");
    t = t.replace(/\?\s*,/g, "?");
    t = t.replace(/\b(as|if|when|while|before|after|because|though|although|until|unless|since|than|that|what|where|how|why)\.\s+(I|you|he|she|they|we)\b/gi, "$1 $2");
    t = t.replace(/\b(and|but|so|or)\.\s+(I|you|he|she|they|we)\b/gi, "$1 $2");
    t = t.replace(/\bAs\.\s+/g, "As ");
    t = t.replace(/\bbefore\.\s+I\b/gi, "before I");
    t = t.replace(/\bafter\.\s+I\b/gi, "after I");
    t = t.replace(/\bwhile\.\s+I\b/gi, "while I");
    t = t.replace(/\bbecause\.\s+I\b/gi, "because I");
    t = t.replace(/\b(?:and|but|so)\s*([.?])$/i, "$1");
    t = t.replace(/\b(?:I am|I\'m|You are|You\'re)\s*([,.?])/gi, "$1");
    t = t.replace(/^[\s,\.\?!]+/, "").trim();
    t = luxRemoveCannedPhrases(t);
    t = luxDropGenericFinalQuestion(t);
    t = t.replace(/(?:^|[.!?]\s+)(?:I\s+(?:took\s+a\s+peek|had\s+a\s+look|looked|checked|read)\s+(?:at\s+)?your\s+profile|I\s+peeked\s+at\s+your\s+profile)[^.!?]*[.!?]?/gi, " ");
    t = t.replace(/\b(?:That\s+is\s+a\s+quick\s+jump\.\s*){1,}/gi, "I understand why you asked, but ");
    t = t.replace(/\s{2,}/g, " ").trim();
    if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
    return t;
  }

  function luxCleanImageAssumption(text) {
    let t = String(text || "");
    t = t.replace(/\bI\s+(?:love|like)\s+the\s+vibe\s+(?:in|of)\s+that\s+(?:picture|photo)\b/gi, "That detail stands out");
    t = t.replace(/\bthat\s+(?:picture|photo)\s+has\s+(?:a\s+)?(?:nice|good)\s+vibe\b/gi, "that photo has an interesting detail");
    t = t.replace(/\bI\s+like\s+the\s+atmosphere\s+in\s+that\s+photo\b/gi, "I noticed the details in that photo");
    t = t.replace(/\bI\s+love\s+how\s+your\s+image\s+looks\b/gi, "That image caught my attention");
    t = t.replace(/\bthis\s+picture\s+is\s+such\s+a\s+vibe\b/gi, "this picture has an interesting detail");
    t = t.replace(/\bthat\s+picture\s+of\s+you\b/gi, "that photo");
    t = t.replace(/\bin\s+that\s+picture\s+you\b/gi, "in that photo");
    t = t.replace(/\byou\s+look\s+(?:nice|good|great|beautiful|gorgeous|hot)\s+in\s+that\s+(?:picture|photo)\b/gi, "that photo has a clear look to it");
    return t;
  }

  function luxSoftenBoundaryRudeness(text) {
    let t = String(text || "");
    t = t.replace(/\bthat\s+is\s+a\s+quick\s+jump\.?\s*/gi, "I understand why you asked, but ");
    t = t.replace(/\byou\s+are\s+moving\s+fast\.?\s*/gi, "I understand why you asked, but ");
    t = t.replace(/\byou['’]?re\s+moving\s+fast\.?\s*/gi, "I understand why you asked, but ");
    t = t.replace(/\bslow\s+down\b/gi, "let me keep my pace");
    t = t.replace(/\bcalm\s+down\b/gi, "give me a little room");
    t = t.replace(/\bdon['’]?t\s+push\s+me\b/gi, "do not rush me");
    t = t.replace(/\bthat['’]?s\s+pushy\b/gi, "that feels a little quick");
    return t.replace(/\s{2,}/g, " ").trim();
  }

  function luxLooksDismissive(text) {
    return /\b(?:nope|not\s+happening|forget\s+it|stop\s+asking|deal\s+with\s+it|take\s+it\s+or\s+leave\s+it|if\s+you\s+can['’]?t\s+handle|that['’]?s\s+not\s+how\s+this\s+works|don['’]?t\s+be\s+silly|you\s+should\s+know\s+better|not\s+my\s+problem|whatever|obviously)\b/i.test(String(text || ""));
  }

  function luxAntiDismissivePass(text) {
    let t = String(text || "");
    t = t.replace(/^\s*nope[,.]?\s*/i, "I understand why you asked, but ");
    t = t.replace(/\bnot\s+happening\b/gi, "I am not comfortable with that");
    t = t.replace(/\bforget\s+it\b/gi, "I would rather not do that");
    t = t.replace(/\bstop\s+asking\b/gi, "do not rush me on that");
    t = t.replace(/\bdeal\s+with\s+it\b/gi, "I hope you can respect that");
    t = t.replace(/\btake\s+it\s+or\s+leave\s+it\b/gi, "I hope you can understand that");
    t = t.replace(/\bif\s+you\s+can['’]?t\s+handle\s+that\b/gi, "I hope you can understand that");
    t = t.replace(/\bthat['’]?s\s+not\s+how\s+this\s+works\b/gi, "I would rather keep that private for now");
    t = t.replace(/\bdon['’]?t\s+be\s+silly\b/gi, "I understand why you wondered");
    t = t.replace(/\byou\s+should\s+know\s+better\b/gi, "I would rather be careful with that");
    t = t.replace(/\bnot\s+my\s+problem\b/gi, "I cannot really take that on");
    t = t.replace(/\bwhatever\b/gi, "I understand");
    t = t.replace(/\bobviously,?\s*/gi, "");
    return t.replace(/\s{2,}/g, " ").trim();
  }

  function postFormat(text) {
    if (!text) return text;
    let t = stripStampsAll(text);
    t = toAscii(t);
    t = enforceFeminineTone(t);
    t = purgeBannedWords(t);
    t = applyLexiconPrefs(t);
    t = fixMissingApostrophes(t);
    t = stripDisallowedPunct(t);
    t = luxRepairPunctuation(t);
    t = luxSplitRunOns(t);
    t = luxEnsureSingleQuestion(t);
    t = luxDropGenericFinalQuestion(t);
    t = luxSentenceCase(t);
    t = fixPronounI(t);
    t = normalizeSpaces(t);
    t = luxCleanImageAssumption(t);
    t = luxRemoveCannedPhrases(t);
    if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === "function") t = LUXPatch.NoRepeat.scrub(t);
    t = luxRemoveCannedPhrases(t);
    t = luxSoftenBoundaryRudeness(t);
    t = luxAntiDismissivePass(t);
    t = luxEnsureQuestion(t, window.__LUX_LAST_USER);
    t = luxEnsureEnding(t);
    t = luxFinalGrammarPass(t);
    return clampToLimit(t);
  }

  function parseOpenRouterContent(responseText) {
    try {
      const data = JSON.parse(responseText || "{}");
      const raw = (data?.choices?.[0]?.message?.content || "").trim();
      return raw || "";
    } catch {
      return "";
    }
  }

  function gmPostJSON(url, headers, body, timeoutMs) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url,
        headers,
        data: JSON.stringify(body),
        timeout: timeoutMs,
        onload: resolve,
        onerror: () => reject(new Error("network-error")),
        ontimeout: () => reject(new Error("timeout"))
      });
    });
  }

  async function llmCall(messages, overrides = {}) {
    if (!lux_canSendRequest()) throw new Error("Rate-limited");
    const key = lux_getApiKey().trim();
    const model = GM_getValue("lux_model", MODEL_DEFAULT).trim();
    if (!key) throw new Error("Missing OpenRouter API key");

    const activeMessages = luxMessagesWithCustomPersona(messages);
    const base = getModelPreset(model);
    const tuned = withCreativeBoost(base, (activeMessages?.[activeMessages.length - 1]?.content) || "");
    const body = sanitizePayloadForModel({
      model,
      messages: activeMessages,
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
        method: "POST",
        url: OPENROUTER_API_URL,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": location.origin,
          "X-Title": "LUX"
        },
        data: JSON.stringify(body),
        timeout: REQUEST_TIMEOUT_MS,
        onload: (res) => {
          try {
            if (res.status < 200 || res.status >= 300) return reject(new Error(`OpenRouter HTTP ${res.status}: ${trimText(res.responseText, 280)}`));
            const data = JSON.parse(res.responseText || "{}");
            const content = data?.choices?.[0]?.message?.content?.trim();
            if (!content) return reject(new Error("Empty content from OpenRouter"));
            resolve(content);
          } catch (e) {
            reject(e);
          }
        },
        onerror: () => reject(new Error("OpenRouter network error")),
        ontimeout: () => reject(new Error("OpenRouter timeout"))
      });
    });
  }

  function luxInitVoices() {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    function loadVoices() {
      const voices = synth.getVoices() || [];
      if (voices.length) {
        LUX_VOICE_CACHE.voices = voices;
        LUX_VOICE_CACHE.ready = true;
      }
    }
    loadVoices();
    try { synth.addEventListener("voiceschanged", loadVoices); }
    catch { synth.onvoiceschanged = loadVoices; }
  }

  function luxCleanTextForSpeech(text) {
    let t = String(text || "");
    t = t.replace(/\s+/g, " ").trim();
    t = t.replace(/\.{3,}/g, ".");
    t = t.replace(/\s*([,?.!])\s*/g, "$1 ");
    t = t.replace(/[^\w\s,?.!']/g, " ");
    t = t.replace(/\s{2,}/g, " ").trim();
    return t;
  }

  function luxPickBestVoice(gender = "female") {
    const voices = LUX_VOICE_CACHE.voices || [];
    if (!voices.length) return null;
    const englishVoices = voices.filter(v => /^en/i.test(v.lang || ""));
    const pool = englishVoices.length ? englishVoices : voices;
    const femalePreferred = [/aria/i, /jenny/i, /samantha/i, /zira/i, /serena/i, /hazel/i, /google us english/i, /female/i];
    const malePreferred = [/davis/i, /david/i, /guy/i, /mark/i, /alex/i, /daniel/i, /male/i];
    const wanted = gender === "male" ? malePreferred : femalePreferred;
    for (const rx of wanted) {
      const hit = pool.find(v => rx.test(v.name || ""));
      if (hit) return hit;
    }
    return pool[0] || null;
  }

  function luxSpeak(text) {
    if (!GM_getValue("lux_voice_enabled", 0)) return;
    if (!("speechSynthesis" in window)) return;
    const clean = luxCleanTextForSpeech(text);
    if (!clean) return;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      const gender = GM_getValue("lux_voice_gender", "female");
      const voice = luxPickBestVoice(gender);
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang || "en-US";
      } else {
        utter.lang = "en-US";
      }
      utter.volume = 1;
      utter.rate = 0.88;
      utter.pitch = gender === "male" ? 0.90 : 0.98;
      synth.speak(utter);
    } catch (e) {
      console.warn("LUX voice failed", e);
    }
  }

  const css = document.createElement("style");
  css.textContent = `
    #lux-btn{position:fixed;bottom:20px;right:20px;z-index:99999;background:#0b3d91;color:#fff;border:0;padding:10px 16px;border-radius:999px;font-weight:700;cursor:pointer;box-shadow:0 6px 16px rgba(11,61,145,.3)}
    #lux-popup{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:820px;max-width:98vw;max-height:84vh;overflow:auto;background:#1f1f1f;color:#eee;border:2px solid #0b3d91;border-radius:14px;padding:14px;z-index:100000;font-family:system-ui,sans-serif;display:none}
    #lux-responses{display:flex;flex-direction:column;gap:8px}
    .lux-reply{white-space:pre-wrap;border:1px solid #3a4155;border-radius:10px;padding:10px;background:#252525;color:#eaeaea;cursor:pointer}
    #lux-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
    #lux-actions button{flex:1 1 120px}
    #lux-settings-panel{display:none;margin-top:8px;border:1px solid #3a4155;border-radius:8px;padding:8px;background:#222;color:#eaeaea}
    #lux-settings-panel input[type=text],#lux-settings-panel textarea,#lux-settings-panel select{width:100%;padding:6px;border:1px solid #3a4155;background:#1a1a1a;color:#eaeaea;border-radius:6px;margin:4px 0}
    #lux-models{background:#2b3545;color:#bcd7ff;border:0;border-radius:8px;padding:8px 10px;font-weight:700}
    #lux-models-panel{display:none;margin-top:8px;border:1px dashed #3c4c66;border-radius:8px;padding:8px}
    #lux-models-panel .lux-model{margin:4px;padding:6px 10px;border:1px solid #3c4c66;border-radius:8px;background:#1f2937;color:#cfe0ff;cursor:pointer}
    #lux-models-panel .lux-tag{display:inline-block;background:#0b3d91;color:#fff;border-radius:999px;padding:2px 8px;font-size:12px;margin-left:8px}
  `;
  document.head.appendChild(css);

  const btn = document.createElement("button");
  btn.id = "lux-btn";
  btn.textContent = "LUX";
  document.body.appendChild(btn);

  const pop = document.createElement("div");
  pop.id = "lux-popup";
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
      <div><strong>Model</strong></div><input type="text" id="lux-model">
      <div style="font-size:12px;color:#b8c7e0;margin:4px 0 8px">Tone is automatic now, LUX reads the customer message and chooses sweet, naughty, generous, humorous, or deflect.</div>
      <div><strong>Voice replies</strong></div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:6px 0 10px">
        <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-voice-enabled"> Enable voice</label>
        <label style="display:flex;gap:8px;align-items:center;">Voice<select id="lux-voice-gender" style="width:auto;margin:0"><option value="female">Female</option><option value="male">Male</option></select></label>
      </div>
      <div><strong>Custom Persona</strong></div>
      <div style="font-size:12px;color:#b8c7e0;margin:4px 0 6px">Write the LUX identity, voice, backstory, job, hobbies, mood, relationship energy, and special style you want. It applies to every reply after Save.</div>
      <textarea id="lux-persona" placeholder="Example, I am Ava, warm, playful, feminine, a little teasing, emotionally mature, private with contacts, slow to meet, loves music and late night conversation." style="min-height:130px"></textarea>
      <button id="lux-save" style="margin-top:6px;background:#0b3d91;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-weight:700">Save</button>
    </div>
  `;
  document.body.appendChild(pop);

  function luxKeepPopupMounted() {
    try {
      if (!document.body) return;
      if (!document.getElementById("lux-btn")) document.body.appendChild(btn);
      if (!document.getElementById("lux-popup")) document.body.appendChild(pop);
      btn.style.display = "block";
      btn.style.visibility = "visible";
      btn.style.zIndex = "99999";
      pop.style.zIndex = "100000";
    } catch (e) {
      console.warn("LUX popup mount guard failed", e);
    }
  }
  luxKeepPopupMounted();
  setTimeout(luxKeepPopupMounted, 250);
  setTimeout(luxKeepPopupMounted, 1000);
  setInterval(luxKeepPopupMounted, 5000);

  const ui = {
    popup: pop,
    topbar: pop.querySelector("#lux-topbar"),
    customer: pop.querySelector("#lux-customer"),
    list: pop.querySelector("#lux-responses"),
    send: pop.querySelector("#lux-send"),
    regen: pop.querySelector("#lux-regen"),
    models: pop.querySelector("#lux-models"),
    modelsPanel: pop.querySelector("#lux-models-panel"),
    settings: pop.querySelector("#lux-settings"),
    close: pop.querySelector("#lux-close"),
    panel: pop.querySelector("#lux-settings-panel"),
    apiUrl: pop.querySelector("#lux-api-url"),
    apiKey: pop.querySelector("#lux-api-key"),
    model: pop.querySelector("#lux-model"),
    toneStyle: null,
    persona: pop.querySelector("#lux-persona"),
    voiceEnabled: pop.querySelector("#lux-voice-enabled"),
    voiceGender: pop.querySelector("#lux-voice-gender"),
    save: pop.querySelector("#lux-save")
  };

  ui.apiUrl.value = GM_getValue("lux_api_url", API_URL_DEFAULT);
  ui.apiKey.value = lux_getApiKey();
  ui.model.value = LUX_ALLOWED_MODELS.includes(GM_getValue("lux_model", MODEL_DEFAULT)) ? GM_getValue("lux_model", MODEL_DEFAULT) : MODEL_DEFAULT;
  ui.persona.value = GM_getValue("lux_persona", "");
  try {
    const personaNote = document.createElement("div");
    personaNote.id = "lux_persona_active_note";
    personaNote.style.cssText = "font-size:11px;color:#9fc5ff;margin-top:4px";
    personaNote.textContent = ui.persona.value.trim() ? "Custom persona is active after Save." : "No custom persona saved yet.";
    ui.persona.insertAdjacentElement("afterend", personaNote);
    ui.persona.addEventListener("input", () => { personaNote.textContent = ui.persona.value.trim() ? "Custom persona will apply after Save." : "No custom persona saved yet."; });
  } catch {}
  ui.voiceEnabled.checked = !!GM_getValue("lux_voice_enabled", 0);
  ui.voiceGender.value = GM_getValue("lux_voice_gender", "female");

  const modelChoices = [
    "x-ai/grok-4-fast",
    "deepseek/deepseek-chat",
    "openai/gpt-4.1",
    "openai/gpt-4.1-mini",
    "anthropic/claude-3.5-sonnet"
  ];

  let LUXSettingsDirty = false;

  function renderModelButtons() {
    const cur = (GM_getValue("lux_model", MODEL_DEFAULT) || "").trim();
    const p = ui.modelsPanel;
    p.innerHTML = "";
    const head = document.createElement("div");
    head.style.marginBottom = "6px";
    head.innerHTML = `<strong>Pick a model</strong> <span class="lux-tag">current: ${cur || "default"}</span>`;
    p.appendChild(head);
    modelChoices.forEach(m => {
      const b = document.createElement("button");
      b.className = "lux-model";
      b.textContent = m;
      b.addEventListener("click", () => {
        ui.model.value = m;
        GM_setValue("lux_model", m);
        LUXSettingsDirty = true;
        notify("Model set to " + m);
        LUXPatch.UIChips.refresh({ modelLabel: m, countryLabel: parseProfileCountry() || "—" });
        renderModelButtons();
      });
      p.appendChild(b);
    });
  }

  function toggleModelsPanel() {
    const p = ui.modelsPanel;
    const open = getComputedStyle(p).display !== "none" && getComputedStyle(p).visibility !== "hidden";
    if (open) {
      p.style.display = "none";
      p.style.visibility = "hidden";
    } else {
      renderModelButtons();
      p.style.display = "block";
      p.style.visibility = "visible";
    }
  }
  ui.models.addEventListener("click", toggleModelsPanel);

  LUXPatch.UIChips = (() => {
    const ids = { topbar: "lux-topbar", chipModel: "lux-chip-model", chipDaypart: "lux-chip-daypart", chipCountry: "lux-chip-country" };
    function ensureStyles() {
      if (document.getElementById("luxpatch-chips-style")) return;
      const css = document.createElement("style");
      css.id = "luxpatch-chips-style";
      css.textContent = ".luxpatch-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.luxpatch-chip{background:#2b3545;border:1px solid #3c4c66;color:#cfe0ff;border-radius:999px;padding:4px 10px;font-size:12px}.luxpatch-brand{font-weight:900;letter-spacing:.4px;color:#bcd7ff}";
      document.head.appendChild(css);
    }
    function timeChipLabel() {
      const tc = buildTimeContext();
      return `${tc.rawDayTime} • ${tc.daypart} • ${tc.dayName}`;
    }
    function mountTopbar(container) {
      ensureStyles();
      if (!container) return null;
      const top = document.createElement("div");
      top.id = ids.topbar;
      top.className = "luxpatch-topbar";
      top.innerHTML = `
        <div class="luxpatch-brand">LUX</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="luxpatch-chip" id="${ids.chipModel}">model: —</span>
          <span class="luxpatch-chip" id="${ids.chipCountry}">country: —</span>
          <span class="luxpatch-chip" id="${ids.chipDaypart}">—</span>
        </div>`;
      container.appendChild(top);
      refresh({ modelLabel: "default", countryLabel: parseProfileCountry() || "—" });
      return top;
    }
    function refresh({ modelLabel, countryLabel }) {
      const m = document.getElementById(ids.chipModel);
      const d = document.getElementById(ids.chipDaypart);
      const c = document.getElementById(ids.chipCountry);
      if (m && modelLabel) m.textContent = `model: ${modelLabel}`;
      if (c) c.textContent = `country: ${countryLabel || parseProfileCountry() || "—"}`;
      if (d) d.textContent = timeChipLabel();
    }
    return { mountTopbar, refresh };
  })();

  LUXPatch.UIChips.mountTopbar(ui.topbar);
  LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || "default"), countryLabel: parseProfileCountry() || "—" });

  function showReplies(items) {
    ui.list.innerHTML = "";
    items.forEach(txt => {
      const finalTxt = clampToLimit(stripStampsAll(txt));
      const d = document.createElement("div");
      d.className = "lux-reply";
      d.textContent = finalTxt;
      d.addEventListener("click", async () => {
        const ok = await pasteToSite(finalTxt);
        if (ok) ui.popup.style.display = "none";
      });
      ui.list.appendChild(d);
    });
  }

  function errorReply(text) {
    console.error("[LUX] error", text);
    lux_showErrorOverlay(String(text || "Unknown error contacting OpenRouter."));
  }

  async function callBackend(msgText, latestClientRowOverride = null, opts = {}) {
    if (!lux_canSendRequest()) return false;

    const leftCard = parseLeftProfile();
    const rawWithMeta = stripStampsKeepMeta((msgText || "").toString());
    const split = extractLuxImageMeta(rawWithMeta);
    const rawMsg = stripStampsAll(split.text || "");

    const latestClientRow = latestClientRowOverride || (() => {
      try {
        const thread = document.querySelector(THREAD_SEL);
        if (!thread) return null;
        const rows = [...thread.querySelectorAll(CLIENT_MSG_SELECTOR)];
        return rows.length ? rows[rows.length - 1] : null;
      } catch {
        return null;
      }
    })();

    const imageNotes = getImageNotes(latestClientRow).join(" | ").trim();
    const effectiveMsg = luxTextForLatestImageOnly(rawMsg, imageNotes);
    window.__LUX_LAST_USER = effectiveMsg || rawMsg;

    const regenMode = !!(opts && opts.regenerate);
    const regenPrevious = Array.isArray(opts?.previousReplies) ? opts.previousReplies.filter(Boolean) : [];
    const regenAttempt = Number(opts?.attempt || lux_getRegenMemory().length + 1 || 1);
    const operatorBridge = opts?.operatorBridge || "";
    const regenDirective = regenMode ? [
      luxBuildRegenerationDirective(effectiveMsg || rawMsg, regenPrevious, regenAttempt),
      luxBuildOperatorBridgeDirective(operatorBridge)
    ].filter(Boolean).join(" ") : "";

    const imageIntent = imageNotes
      ? luxInferImageIntent(latestClientRow, `${rawMsg} ${imageNotes}`)
      : luxInferImageIntent(null, rawMsg);

    if (luxIsSiteTrustComplaint(rawMsg)) {
      let out = await luxSiteTrustResponse(leftCard, rawMsg, regenDirective);
      out = postFormat(luxRemoveCannedPhrases(out)).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      if (regenMode) lux_pushRegenMemory(out);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    const blockedKind = Safety.getBlockedTopic(rawMsg);
    if (blockedKind) {
      let out = await Safety.blockedTopicRefusal(blockedKind, leftCard, rawMsg, regenDirective);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      if (regenMode) lux_pushRegenMemory(out);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    if (luxWantsProfileCheck(rawMsg)) {
      const profileText = luxReadCustomerProfile();
      let out = "";
      if (!profileText) {
        out = "There is not much showing there yet, but I can work with a little mystery. What were you hoping I would notice about you?";
      } else {
        const tc = buildTimeContext();
        const toneInfo = lux_detectTone(rawMsg);
        const qGuide = luxQuestionGuide(toneInfo.tone, toneInfo.engagement, rawMsg);
        const sys = [
          "You are an adult woman on a dating site.",
          getAccentInstructionByCountry(leftCard?.country || ""),
          luxToneStyleInstruction(luxGetToneStyle(rawMsg || window.__LUX_LAST_USER || "")),
          "The customer asked you to check or read their profile.",
          "Do not announce that you took a peek, checked, looked at, or read their profile.",
          "Do not say your profile gives me, your profile gives off, or from your profile.",
          "Answer as if you naturally noticed the substance and are reacting to him, not reviewing a page.",
          "Use the about text to infer their vibe, intention, tone, and what kind of person they may be.",
          "Respond naturally like a real woman reacting to his profile, not like a formal review.",
          "Do not make up profile details beyond the about text.",
          "If the about text is short or vague, say that lightly and react to what is there.",
          "Keep it warm, feminine, human, and conversational.",
          "No emojis.",
          "Only use comma, period, question mark, and apostrophe.",
          `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
          qGuide,
          personaCardLine(leftCard) || "",
          regenDirective || ""
        ].join(" ");
        const user = `Customer message: "${rawMsg.slice(0, 260)}"\nAbout text: "${profileText.slice(0, 900)}"\nWrite one natural response about the profile.`;
        try {
          out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], {
            max_tokens: 180,
            temperature: 0.52,
            top_p: 0.90
          });
        } catch {}
        if (!out) out = "You come across like someone who does not put everything on the surface. What part of you do people usually miss at first?";
      }
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      if (luxNeedsHardMeetupRepair(rawMsg, out)) out = await Safety.modelRefusal("meet", leftCard, rawMsg, regenDirective);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      if (regenMode) lux_pushRegenMemory(out);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    if (Safety.askName(rawMsg)) {
      const profName = (leftCard && leftCard.realName) ? leftCard.realName : "Luna";
      const sys = ["Natural English in the profile country style. " + luxToneStyleInstruction(luxGetToneStyle(rawMsg || window.__LUX_LAST_USER || "")) + " One short paragraph. No contacts or meetups. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow matching open ended question created by you. " + getAccentInstructionByCountry(leftCard?.country || ""), regenDirective || ""].filter(Boolean).join(" ");
      const user = `They asked your name. Use exactly: "${profName}". ${personaCardLine(leftCard) || ""}\nCustomer: "${rawMsg.slice(0, 240)}"`;
      let line = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], { max_tokens: 100, temperature: 0.30, top_p: 0.88 });
      line = await Safety.enforceNoMeetAccept(rawMsg, line, leftCard);
      if (luxNeedsHardMeetupRepair(rawMsg, line)) line = await Safety.modelRefusal("meet", leftCard, rawMsg, regenDirective);
      line = postFormat(line).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([line]);
      if (regenMode) lux_pushRegenMemory(line);
      pushHist(rawMsg, line);
      lux_pushRecentReply(line);
      lux_pushReplyFingerprint(line);
      luxSpeak(line);
      return;
    }


    if ((Safety.wantsMeet(rawMsg) || Safety.wantsMeetSoft(rawMsg)) && (Safety.wantsLocation(rawMsg) || Safety.mentionsAddress(rawMsg))) {
      let out = await Safety.modelRefusal("address", leftCard, rawMsg, regenDirective);
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      out = postFormat(luxRemoveCannedPhrases(out)).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      if (regenMode) lux_pushRegenMemory(out);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    if (Safety.wantsLocation(rawMsg)) {
      const profCity = (leftCard && leftCard.location) ? leftCard.location : "nearby";
      const sys = ["If asked where you are, give city only. No address. " + luxToneStyleInstruction(luxGetToneStyle(rawMsg || window.__LUX_LAST_USER || "")) + " One short paragraph. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow matching open ended question created by you. " + getAccentInstructionByCountry(leftCard?.country || ""), regenDirective || ""].filter(Boolean).join(" ");
      const user = `City only: "${profCity}". ${personaCardLine(leftCard) || ""}\nCustomer: "${rawMsg.slice(0, 240)}"`;
      let line = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], { max_tokens: 100, temperature: 0.30, top_p: 0.88 });
      line = await Safety.enforceNoMeetAccept(rawMsg, line, leftCard);
      if (luxNeedsHardMeetupRepair(rawMsg, line)) line = await Safety.modelRefusal("meet", leftCard, rawMsg, regenDirective);
      line = postFormat(line).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([line]);
      if (regenMode) lux_pushRegenMemory(line);
      pushHist(rawMsg, line);
      lux_pushRecentReply(line);
      lux_pushReplyFingerprint(line);
      luxSpeak(line);
      return;
    }

    if (Safety.wantsJob(rawMsg)) {
      const jobLine = suggestJobLine(leftCard, leftCard?.age);
      const tc = buildTimeContext();
      const toneInfo = lux_detectTone(rawMsg);
      const qGuide = luxQuestionGuide(toneInfo.tone, toneInfo.engagement, rawMsg);
      const sys = [
        "You are an adult woman on a dating site. Natural, warm, human, not formal.",
        getAccentInstructionByCountry(leftCard?.country || ""),
        luxToneStyleInstruction(luxGetToneStyle(rawMsg || window.__LUX_LAST_USER || "")),
        "Only use comma, period, question mark, and apostrophe.",
        "Do not mention policy, do not mention rules.",
        "Do not share contacts, do not agree to meetups.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        `Profile age is ${leftCard?.age || "unknown"}, your job must fit your age.`,
        `Use this job line as your job, ${jobLine}.`,
        qGuide,
        regenDirective || ""
      ].join(" ");
      const user = `They asked about your job.\nCustomer: "${rawMsg.slice(0, 240)}"\nReply in one short paragraph and end with exactly one open ended question if it feels natural.`;
      let out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], { max_tokens: 140, temperature: 0.45, top_p: 0.90 });
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      if (luxNeedsHardMeetupRepair(rawMsg, out)) out = await Safety.modelRefusal("meet", leftCard, rawMsg, regenDirective);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      if (regenMode) lux_pushRegenMemory(out);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    if (Safety.wantsMeet(rawMsg) || Safety.wantsMeetSoft(rawMsg)) {
      let out = await Safety.modelRefusal("meet", leftCard, rawMsg, regenDirective);
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      if (regenMode) lux_pushRegenMemory(out);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    if (Safety.wantsContact(rawMsg) || Safety.mentionsAddress(rawMsg)) {
      const kind = Safety.mentionsAddress(rawMsg) ? "address" : "contact";
      let out = await Safety.modelRefusal(kind, leftCard, rawMsg, regenDirective);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      if (regenMode) lux_pushRegenMemory(out);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    const system = [buildSystemPrompt(leftCard, (GM_getValue("lux_persona", "") || "").trim(), imageNotes, imageIntent), regenDirective || ""].filter(Boolean).join(" ");
    let chosenModel = GM_getValue("lux_model", MODEL_DEFAULT);
    if (!LUX_ALLOWED_MODELS.includes(chosenModel)) {
      chosenModel = MODEL_DEFAULT;
      GM_setValue("lux_model", chosenModel);
      if (ui && ui.model) ui.model.value = chosenModel;
    }
    const basePreset = getModelPreset(chosenModel);
    const tuned = withCreativeBoost(basePreset, effectiveMsg);
    const historyForModel = lux_buildHistoryByTokens(shortHistory, 3000);

    const shouldAttachVision = imageNotes && luxModelSupportsVision(chosenModel) && imageIntent !== "profile_comment" && !luxModelTextOnlyForImages(chosenModel);
    const latestImage = imageNotes && shouldAttachVision ? luxGetLatestClientImageUrlFromMessage(latestClientRow) : "";
    let userPayload = { role: "user", content: effectiveMsg || rawMsg || "Customer sent a message." };
    if (latestImage) {
      userPayload = {
        role: "user",
        content: [
          { type: "text", text: effectiveMsg || "Customer sent a photo as the latest message." },
          { type: "image_url", image_url: { url: latestImage } }
        ]
      };
    } else if (imageNotes) {
      userPayload = {
        role: "user",
        content: (effectiveMsg || "Customer sent a photo as the latest message.") + " Latest image notes, " + imageNotes + "."
      };
    }

    const messages = [{ role: "system", content: system }, ...historyForModel, userPayload];
    const api = GM_getValue("lux_api_url", API_URL_DEFAULT).trim();
    const key = lux_getApiKey().trim();

    if (!key) {
      errorReply("Missing OpenRouter API key. Open LUX Settings and paste your key.");
      return false;
    }

    const headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + key,
      "HTTP-Referer": location.origin,
      "X-Title": document.title || "LUX Userscript"
    };

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
    if (regenMode) payload = sanitizePayloadForModel(luxTunePayloadForRegeneration(payload, regenAttempt), chosenModel);

    try {
      let res1 = await gmPostJSON(api, headers, payload, REQUEST_TIMEOUT_MS);

      if (res1.status < 200 || res1.status >= 300) {
        if (latestImage && [400, 415, 422].includes(res1.status)) {
          const textOnlyPayload = {
            ...payload,
            messages: luxRemoveImagesFromMessages(payload.messages, (effectiveMsg || "Customer sent a photo as the latest message.") + (imageNotes ? " Latest image notes, " + imageNotes + "." : ""))
          };
          const resFallback = await gmPostJSON(api, headers, textOnlyPayload, REQUEST_TIMEOUT_MS);
          if (resFallback.status >= 200 && resFallback.status < 300) {
            res1 = resFallback;
            payload = textOnlyPayload;
          } else {
            let msg;
            if (resFallback.status === 401) msg = "OpenRouter API key is invalid or unauthorized.";
            else if (resFallback.status === 402) msg = "OpenRouter billing or quota exceeded, HTTP 402.";
            else if (resFallback.status === 404) msg = "OpenRouter endpoint or model not found, HTTP 404.";
            else if (resFallback.status === 429) msg = "OpenRouter rate limit reached, HTTP 429.";
            else msg = `HTTP ${resFallback.status} ${resFallback.statusText || ""}`.trim();
            errorReply(msg);
            return false;
          }
        } else {
          let msg;
          if (res1.status === 401) msg = "OpenRouter API key is invalid or unauthorized.";
          else if (res1.status === 402) msg = "OpenRouter billing or quota exceeded, HTTP 402.";
          else if (res1.status === 404) msg = "OpenRouter endpoint or model not found, HTTP 404.";
          else if (res1.status === 429) msg = "OpenRouter rate limit reached, HTTP 429.";
          else msg = `HTTP ${res1.status} ${res1.statusText || ""}`.trim();
          errorReply(msg);
          return false;
        }
      }

      let raw = parseOpenRouterContent(res1.responseText);
      if (!raw) {
        const res2 = await gmPostJSON(api, headers, payload, REQUEST_TIMEOUT_MS);
        raw = parseOpenRouterContent(res2.responseText);
      }
      if (!raw) {
        notify("No reply generated. Tap regenerate.");
        return false;
      }

      let content = raw;

      content = await Safety.enforceNoMeetAccept(rawMsg, content, leftCard);
      if (luxNeedsHardMeetupRepair(rawMsg, content)) content = await Safety.modelRefusal("meet", leftCard, rawMsg, regenDirective);

      if (luxShouldAddReaction(rawMsg, content)) {
        const reaction = luxHumanReaction(`${rawMsg}|${chosenModel}`);
        if (reaction) {
          content = `${content} ${reaction}`;
          GM_setValue(LUX_REACTION_COOLDOWN_KEY, Date.now());
        }
      }

      content = luxFinalGrammarPass(luxStrictNoRepeatClean(luxRemoveCannedPhrases(luxCleanImageAssumption(postFormat(content))), rawMsg))
        .replace(/\byour tits\b/gi, "that look")
        .replace(/\byour boobs\b/gi, "that look")
        .replace(/\s{2,}/g, " ")
        .replace(/^[,\.\?\s]+/, "")
        .trim();

      // Fast regeneration path: do not spend a second API call rewriting normal replies.
      // No-repetition is handled by the prompt and the local cleanup below so generation stays responsive.
      if (luxViolatesStrictNoRepeat(rawMsg, content) || lux_isTooSimilarToRecent(content)) {
        content = luxFinalGrammarPass(luxStrictNoRepeatClean(content, rawMsg))
          .replace(/\byour tits\b/gi, "that look")
          .replace(/\byour boobs\b/gi, "that look")
          .replace(/\s{2,}/g, " ")
          .replace(/^[,\.\?\s]+/, "")
          .trim();
      }

      LUXPatch.UIChips.refresh({ modelLabel: chosenModel, countryLabel: leftCard?.country || "—" });
      showReplies([content]);
      if (regenMode) lux_pushRegenMemory(content);
      pushHist(rawMsg, content);
      lux_pushRecentReply(content);
      lux_pushReplyFingerprint(content);
      luxSpeak(content);
    } catch (e) {
      console.error(e);
      errorReply("Network error talking to OpenRouter.");
      return false;
    }
  }

  function pushHist(user, assistant) {
    shortHistory.push(
      { role: "user", content: stripStampsAll(user) },
      { role: "assistant", content: postFormat(assistant) }
    );
    while (shortHistory.length > HISTORY_MAX) shortHistory.shift();
    _saveHistory();
  }

  function siteInput() {
    const el = document.querySelector(REPLY_INPUT_SELECTOR);
    if (!el) return null;
    const s = getComputedStyle(el);
    const visible = s.display !== "none" && s.visibility !== "hidden" && el.offsetParent !== null;
    const ro = el.hasAttribute("readonly") ? !el.readOnly : true;
    const dis = el.hasAttribute("disabled") ? !el.disabled : true;
    return (visible && ro && dis) ? el : null;
  }

  function setNativeValue(el, value) {
    const desc = Object.getOwnPropertyDescriptor(el, "value");
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLInputElement ? HTMLInputElement.prototype : null;
    if (desc && desc.set) desc.set.call(el, value);
    else if (proto) {
      const protoDesc = Object.getOwnPropertyDescriptor(proto, "value");
      protoDesc && protoDesc.set && protoDesc.set.call(el, value);
    }
  }

  function fireTypingEvents(el) {
    const opts = { bubbles: true, cancelable: true };
    try { el.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertFromPaste", data: el.value })); } catch {}
    try { el.dispatchEvent(new FocusEvent("focus", opts)); } catch { el.dispatchEvent(new Event("focus", opts)); }
    try { el.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertFromPaste", data: el.value })); } catch { el.dispatchEvent(new Event("input", opts)); }
    try { el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true })); } catch {}
    try { el.dispatchEvent(new KeyboardEvent("keypress", { key: " ", code: "Space", bubbles: true })); } catch {}
    try { el.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true })); } catch {}
    el.dispatchEvent(new Event("change", opts));
  }

  async function pasteToSite(text) {
    const el = siteInput();
    if (!el) {
      notify("Reply box not found. Update selector.");
      return false;
    }
    el.scrollIntoView({ block: "nearest" });
    el.click();
    el.focus();
    const final = clampToLimit(stripStampsAll(text));
    setNativeValue(el, final);
    try { el.selectionStart = el.selectionEnd = el.value.length; } catch {}
    fireTypingEvents(el);
    if (typeof queueMicrotask === "function") queueMicrotask(() => fireTypingEvents(el));
    else setTimeout(() => fireTypingEvents(el), 0);
    return true;
  }

  btn.addEventListener("click", () => {
    luxKeepPopupMounted();
    ui.popup.style.display = "block";
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || "default"), countryLabel: parseProfileCountry() || "—" });
  });

  ui.close.addEventListener("click", () => {
    if (LUXSettingsDirty) {
      if (confirm("You changed LUX settings. Save before closing?")) ui.save.click();
      LUXSettingsDirty = false;
    }
    ui.popup.style.display = "none";
  });

  ui.settings.addEventListener("click", () => {
    ui.panel.style.display = ui.panel.style.display === "none" ? "block" : "none";
  });

  ui.save.addEventListener("click", () => {
    GM_setValue("lux_api_url", ui.apiUrl.value.trim());
    lux_setApiKey(ui.apiKey.value.trim());
    const selectedModel = LUX_ALLOWED_MODELS.includes(ui.model.value.trim()) ? ui.model.value.trim() : MODEL_DEFAULT;
    GM_setValue("lux_model", selectedModel);
    ui.model.value = selectedModel;
    GM_setValue("lux_persona", ui.persona.value.trim());
    try {
      const personaNote = document.getElementById("lux_persona_active_note");
      if (personaNote) personaNote.textContent = ui.persona.value.trim() ? "Custom persona is active." : "No custom persona saved yet.";
    } catch {}
    GM_setValue("lux_voice_enabled", ui.voiceEnabled.checked ? 1 : 0);
    GM_setValue("lux_voice_gender", ui.voiceGender.value || "female");
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || "default"), countryLabel: parseProfileCountry() || "—" });
    LUXSettingsDirty = false;
    alert("Saved");
  });

  [ui.apiUrl, ui.apiKey, ui.model, ui.persona].filter(Boolean).forEach(el => el.addEventListener("input", () => { LUXSettingsDirty = true; }));
  ui.voiceEnabled.addEventListener("change", () => { LUXSettingsDirty = true; });
  ui.voiceGender.addEventListener("change", () => { LUXSettingsDirty = true; });

  ui.send.addEventListener("click", async () => {
    const typedRawValue = ui.customer.value || "";
    const msg = stripStampsAll(typedRawValue.trim());
    if (!msg) {
      notify("Type a message first.");
      return;
    }

    const latestTurn = luxGetLatestClientTurnForRegeneration();
    if (latestTurn && luxLooksLikeOperatorGibberish(msg)) {
      const typedNorm = normalizeLooseText(msg).toLowerCase();
      const latestNorm = normalizeLooseText(latestTurn.clean || "Customer sent a photo.").toLowerCase();
      if (typedNorm && typedNorm !== latestNorm) {
        const previousReplies = luxCollectVisibleReplies();
        await callBackend(latestTurn.content, latestTurn.row, {
          regenerate: true,
          previousReplies,
          attempt: previousReplies.length + 1,
          operatorBridge: msg
        });
        return;
      }
    }

    await callBackend(msg);
  });

  function luxLooksLikeOperatorGibberish(text) {
    const s = String(text || "").trim();
    if (!s) return true;
    const plain = s.replace(/\s+/g, "");
    if (plain.length <= 2) return true;
    if (plain.length <= 14 && !/[aeiou]/i.test(plain)) return true;
    if (plain.length <= 18 && !/[?.!,]/.test(s) && !/\b(the|you|me|my|your|love|meet|call|text|photo|pic|profile|why|how|what|where|when|yes|no)\b/i.test(s)) {
      const consonantRatio = (plain.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length / Math.max(1, plain.length);
      const repeatedJunk = /(.)\1{2,}|([a-z]{2,4})\2/i.test(plain);
      if (consonantRatio > 0.72 || repeatedJunk) return true;
    }
    return false;
  }

  function luxGetLatestClientTurnForRegeneration() {
    try {
      const root = document.querySelector(THREAD_SEL);
      if (!root) return null;
      const rows = [...root.querySelectorAll(CLIENT_MSG_SELECTOR)];
      const row = rows.length ? rows[rows.length - 1] : null;
      if (!row) return null;
      const content = extractMessageContent(row);
      const split = extractLuxImageMeta(content || "");
      const clean = stripStampsAll(split.text || "");
      const imageNotes = getImageNotes(row).join(" | ").trim();
      if (!clean && !imageNotes) return null;
      return { row, content: stripStampsKeepMeta(content || ""), clean, imageNotes };
    } catch (e) {
      console.warn("LUX regeneration latest-turn read failed", e);
      return null;
    }
  }

  ui.regen.onclick = async () => {
    const oldRegenLabel = ui.regen.textContent;
    try {
      ui.regen.disabled = true;
      ui.regen.textContent = oldRegenLabel || "Regenerate";
      const previousReplies = luxCollectVisibleReplies();
      const typedRawValue = ui.customer.value || "";
      const typedMsg = stripStampsAll(typedRawValue.trim());
      const latestTurn = luxGetLatestClientTurnForRegeneration();
      let msg = latestTurn ? latestTurn.content : typedMsg;
      let latestRowOverride = latestTurn ? latestTurn.row : null;

      if (!msg) {
        const lastUser = [...shortHistory].reverse().find(t => t.role === "user");
        if (!lastUser) return;
        msg = stripStampsAll(lastUser.content);
      }

      if (!latestTurn && typedMsg && luxLooksLikeOperatorGibberish(typedMsg)) {
        const lastUser = [...shortHistory].reverse().find(t => t.role === "user");
        if (lastUser) msg = stripStampsAll(lastUser.content);
      }

      let operatorBridge = "";
      if (latestTurn && typedMsg) {
        const typedNorm = normalizeLooseText(typedMsg).toLowerCase();
        const latestNorm = normalizeLooseText(latestTurn.clean || "Customer sent a photo.").toLowerCase();
        if (typedNorm && typedNorm !== latestNorm) operatorBridge = typedMsg;
      }

      if (shortHistory.length && shortHistory[shortHistory.length - 1].role === "assistant") {
        previousReplies.push(shortHistory[shortHistory.length - 1].content);
        shortHistory.pop();
        _saveHistory();
      }
      await callBackend(msg, latestRowOverride, { regenerate: true, previousReplies, attempt: previousReplies.length + 1, operatorBridge });
    } finally {
      ui.regen.disabled = false;
      ui.regen.textContent = oldRegenLabel || "Regenerate";
    }
  };

  function processLatestTurn() {
    const root = document.querySelector(THREAD_SEL);
    if (!root) return;

    const nodes = [...root.querySelectorAll(`${CLIENT_MSG_SELECTOR}, ${PERSONA_MSG_SELECTOR}`)];
    const turns = [];
    for (const row of nodes) {
      const fromClient = row.matches(CLIENT_MSG_SELECTOR);
      const content = fromClient
        ? extractMessageContent(row)
        : stripStampsAll(stripInlineImageNotes(row?.innerText || ""));
      if (content) turns.push({ role: fromClient ? "user" : "assistant", content: stripStampsKeepMeta(content), row });
    }

    const lastUser = turns.slice().reverse().find(t => t.role === "user");
    if (!lastUser) return;

    const split = extractLuxImageMeta(lastUser.content || "");
    const cleanForUI = stripStampsAll(split.text || "");
    const imageNotes = getImageNotes(lastUser.row).join(" | ").trim();
    if (!cleanForUI && !imageNotes) return;

    const turnSig = String(hashStr(`${_threadKey()}|${cleanForUI}|${imageNotes}`));
    if (turnSig === lastSeen || turnSig === luxGeneratingSig) return;
    luxGeneratingSig = turnSig;

    if (turns.length) {
      shortHistory = turns.slice(-HISTORY_MAX).map(t => ({
        role: t.role,
        content: stripStampsAll(extractLuxImageMeta(t.content || "").text || "")
      })).filter(t => t.content || t.role === "assistant");
      _saveHistory();
    }

    luxKeepPopupMounted();
    ui.customer.value = cleanForUI || "Customer sent a photo.";
    ui.popup.style.display = "block";
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || "default"), countryLabel: parseProfileCountry() || "—" });

    if (cleanForUI) {
      for (const delay of LUX_NOTE_RETRY_DELAYS) {
        setTimeout(() => {
          autoLogLatestClientInfo(cleanForUI).catch(err => console.warn("LUX member note draft error", err));
        }, delay);
      }
    }

    callBackend(lastUser.content, lastUser.row).then(ok => {
      if (ok !== false) lastSeen = turnSig;
    }).catch(err => {
      console.warn("LUX auto generation failed", err);
    }).finally(() => {
      if (luxGeneratingSig === turnSig) luxGeneratingSig = "";
    });
  }

  let luxObservedThreadRoot = null;
  let luxThreadObserver = null;

  function luxSafeProcessLatestTurn() {
    try {
      processLatestTurn();
    } catch (e) {
      console.warn("LUX latest-turn processing failed", e);
    }
  }

  function setupThreadWatcher() {
    luxKeepPopupMounted();
    const root = document.querySelector(THREAD_SEL);
    if (!root) return false;

    if (luxObservedThreadRoot === root && luxThreadObserver) return true;

    try {
      if (luxThreadObserver) luxThreadObserver.disconnect();
    } catch {}

    luxObservedThreadRoot = root;
    luxThreadObserver = new MutationObserver(() => {
      clearTimeout(luxWatcherTimer);
      luxWatcherTimer = setTimeout(luxSafeProcessLatestTurn, 250);
    });

    luxThreadObserver.observe(root, { childList: true, subtree: true });
    setTimeout(luxSafeProcessLatestTurn, 80);
    return true;
  }

  try {
    window.addEventListener("load", () => {
      luxKeepPopupMounted();
      setupThreadWatcher();
      luxSafeProcessLatestTurn();
    });
    window.addEventListener("pageshow", () => {
      luxKeepPopupMounted();
      setupThreadWatcher();
      luxSafeProcessLatestTurn();
    });
  } catch {}

  luxInitVoices();

  luxKeepPopupMounted();
  setupThreadWatcher();
  setInterval(() => {
    setupThreadWatcher();
    if (document.querySelector(THREAD_SEL)) luxSafeProcessLatestTurn();
  }, POLL_MS);
})();
