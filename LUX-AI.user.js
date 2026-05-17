// ==UserScript==
// @name         LUX Starr Framework v13 (OpenRouter • Encrypted Key • Creative Booster • Strict Access • ConeID Gate)
// @namespace    http://tampermonkey.net/
// @version      14.6.17
// @description  LUX upgraded with stricter latest-image handling, no-pool questions, natural profile reactions, softer human refusals, improved punctuation, and stronger anti-repeat memory.
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
  const MODEL_DEFAULT = "deepseek/deepseek-chat";
  const LUX_VISION_MODEL = "google/gemini-2.0-flash-lite-001";
  const POLL_MS = 3000;
  const HISTORY_MAX = 14;
  const REQUEST_TIMEOUT_MS = 35000;
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
    temperature: 0.68,
    top_p: 0.91,
    repetition_penalty: 1.06,
    max_tokens: 240,
    stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
    seed: 11
  };

  const MODEL_PRESETS = {
    "deepseek/deepseek-chat": { temperature: 0.78, top_p: 0.94, repetition_penalty: 1.06, max_tokens: 340, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 41 },
    "meta-llama/llama-3.3-70b-instruct": { temperature: 0.74, top_p: 0.94, repetition_penalty: 1.06, max_tokens: 345, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 47 },
    "nousresearch/hermes-3-llama-3.1-405b": { temperature: 0.78, top_p: 0.95, repetition_penalty: 1.06, max_tokens: 355, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 59 }
  };

  const LUX_ALLOWED_MODELS = Object.keys(MODEL_PRESETS);
  const LUX_TONE_STYLE_KEY = "lux_tone_style_v1";
  const LUX_TONE_STYLES = ["sweet", "naughty", "deflect", "savage", "humorous"];

  const LUX_RATE_WINDOW_MS = 10000;
  const LUX_RATE_MAX_REQ = 5;
  const LUX_RATE_COOLDOWN_MS = 45000;
  const LUX_RATE_LOG_KEY = "lux_req_log_v1";
  const LUX_RATE_COOLDOWN_KEY = "lux_rate_cooldown_until_v1";
  const LUX_VISION_CACHE_KEY = "lux_latest_image_desc_cache_v1";
  const LUX_CREATIVE_STATE_KEY = "lux_creative_state_v1";
  const LUX_REPLY_FP_KEY = "lux_reply_fp_v2";
  const LUX_THEME_MEMORY_KEY = "lux_theme_memory_v1";
  const LUX_REACTION_COOLDOWN_KEY = "lux_reaction_cooldown_v1";
  const LUX_REFUSAL_MEMORY_KEY = "lux_refusal_memory_v1";


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
  function lux_getRateCooldownUntil() { return Number(GM_getValue(LUX_RATE_COOLDOWN_KEY, 0) || 0); }
  function lux_setRateCooldown(ms = LUX_RATE_COOLDOWN_MS) { GM_setValue(LUX_RATE_COOLDOWN_KEY, Date.now() + ms); }

  function lux_canSendRequest() {
    const now = Date.now();
    let log = lux_getReqLog().filter(t => now - t < LUX_RATE_WINDOW_MS);
    if (log.length >= LUX_RATE_MAX_REQ) {
      return false;
    }
    log.push(now);
    lux_setReqLog(log);
    return true;
  }

  function lux_markOpenRouterRateLimit() {
    lux_setRateCooldown(LUX_RATE_COOLDOWN_MS);
    lux_showErrorOverlay("OpenRouter rate limit reached.\nLUX will pause briefly before sending another request.");
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

  function luxGetToneStyle() {
    const raw = String(GM_getValue(LUX_TONE_STYLE_KEY, "sweet") || "sweet").trim().toLowerCase();
    return LUX_TONE_STYLES.includes(raw) ? raw : "sweet";
  }

  function luxToneStyleInstruction(style = luxGetToneStyle()) {
    const s = String(style || "sweet").toLowerCase();
    if (s === "naughty") return "Tone style, naughty. Use playful adult tension and teasing warmth, but do not become explicit, crude, or unsafe. Keep it suggestive, clever, and still believable.";
    if (s === "deflect") return "Tone style, deflect. When the customer pushes for contacts, meetups, exact location, proof, or pressure, dodge smoothly with charm, privacy, and a fresh topic.";
    if (s === "savage") return "Tone style, savage. Be confident, witty, and lightly sharp when appropriate, but never cruel, insulting, or robotic.";
    if (s === "humorous") return "Tone style, humorous. Use light wit and playful observation, but keep the reply warm, clear, and natural.";
    return "Tone style, sweet. Sound warm, feminine, caring, and emotionally natural without becoming sugary or repetitive.";
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

      if (/\b(avatar|user avatar|profile avatar|profile image|profile picture|profile photo|flag|emoji|icon|logo|badge|spinner|loader)\b/i.test(classAlt)) return false;
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
    return true;
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
      if (alt && !/avatar|profile|flag|emoji|icon|logo|badge/i.test(alt)) parts.push(`alt text ${alt}`);
      if (name && !/avatar|flag|emoji|icon|logo|badge/i.test(name)) parts.push(`file ${name}`);
      if (w && h) parts.push(`size ${w}x${h}`);
      notes.push(parts.length ? parts.join(", ") : "latest customer image attached");
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
    /\breport\b\.?$/gi
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
    return m === String(LUX_VISION_MODEL).toLowerCase();
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
  function lux_getRecentReplies() { try { const arr = JSON.parse(GM_getValue(lux_recentReplyKey(), "[]")); return Array.isArray(arr) ? arr.slice(-10) : []; } catch { return []; } }
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
    return lux_getReplyFingerprints().some(old => overlapScore(current, old) > 0.55);
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
    const latest = normalizeLooseText(stripStampsAll(userText || "")).slice(0, 260) || "the customer's latest message";
    const recent = lux_getRecentReplies()
      .map(x => normalizeLooseText(x).slice(0, 120))
      .filter(Boolean)
      .slice(-4)
      .join(" | ");
    let base = [
      "End with exactly one open ended question only if it feels natural.",
      "Do not use a question pool, preset sample question, default fallback question, or saved question bank.",
      `Build the question from the customer's actual latest words and emotional context, ${latest}.`,
      "The question must feel freshly written for this exact message, not like a reusable line.",
      "Use the customer's own subject, mood, detail, worry, joke, compliment, memory, plan, or desire as the anchor.",
      "Ask about the reason, feeling, story, opinion, expectation, choice, or personal meaning behind what they just said.",
      "Avoid broad interview questions, generic date prompts, meetup fantasy questions, and repeated shapes like what are you up to, how was your day, tell me about yourself, wildest, craziest, most spontaneous, perfect afternoon, finally together, or if today ended well.",
      "Never ask daypart filler questions like what is the interesting thing you have ever done on a Friday afternoon like this.",
      "Do not end with a question if the only available question would be generic, broad, daypart based, meetup fantasy based, or disconnected from his exact words.",
      "Do not reuse the opening words, rhythm, or question shape from recent replies.",
      recent ? `Recent reply wording to avoid, ${recent}.` : ""
    ].filter(Boolean).join(" ");
    if (tone === "angry") base += " Their tone is tense, so the question should invite explanation without arguing.";
    else if (tone === "cold") base += " Their tone is dry, so the question should be easy and low pressure while still specific.";
    else if (tone === "serious") base += " Their tone is serious, so the question should be thoughtful and grounded in what they said.";
    else if (tone === "sweet") base += " Their tone is affectionate, so the question should deepen warmth without sounding needy.";
    else if (tone === "flirty") base += " Their tone is teasing, so the question can be playful but must still be original and context based.";
    else if (tone === "playful") base += " Their tone is playful, so the question should have lightness without becoming canned.";
    else if (engagement === "low") base += " Keep it simple to answer, but not dull or generic.";
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
      max_tokens = Math.min(380, max_tokens + 30);
    } else if (tone === "sweet") {
      temperature = Math.min(temperature + 0.05, 1.08);
      top_p = Math.min(top_p + 0.02, 1.0);
      repetition_penalty = Math.max(1.00, repetition_penalty - 0.01);
      max_tokens = Math.min(380, max_tokens + 25);
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
      max_tokens = Math.max(240, Math.min(320, max_tokens - 10));
    }

    if (coldStreak && tone !== "serious" && tone !== "angry") {
      temperature = Math.min(temperature + 0.03, 1.05);
      top_p = Math.min(top_p + 0.02, 1.0);
      max_tokens = Math.min(380, max_tokens + 20);
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
      p.temperature = Math.min(Number(p.temperature || 0.78), 0.86);
      p.top_p = Math.min(Number(p.top_p || 0.94), 0.96);
      p.max_tokens = Math.min(Number(p.max_tokens || 340), 360);
    }

    if (m.includes("meta-llama/llama-3.3-70b-instruct")) {
      p.temperature = Math.min(Number(p.temperature || 0.74), 0.84);
      p.top_p = Math.min(Number(p.top_p || 0.94), 0.96);
      p.max_tokens = Math.min(Number(p.max_tokens || 345), 365);
    }

    if (m.includes("nousresearch/hermes-3-llama-3.1-405b")) {
      p.temperature = Math.min(Number(p.temperature || 0.78), 0.88);
      p.top_p = Math.min(Number(p.top_p || 0.95), 0.97);
      p.max_tokens = Math.min(Number(p.max_tokens || 355), 380);
    }

    if (m === String(LUX_VISION_MODEL).toLowerCase()) {
      delete p.seed;
      delete p.repetition_penalty;
      delete p.stop;
      p.temperature = Math.min(Number(p.temperature || 0.20), 0.25);
      p.top_p = Math.min(Number(p.top_p || 0.80), 0.85);
      p.max_tokens = Math.min(Number(p.max_tokens || 180), 180);
    }
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
      "your profile gives off", "your profile has a", "from your profile", "that sounds tempting", "sounds tempting with the dinner idea",
      "you are moving fast", "you're moving fast", "arent you", "aren't you", "not quite ready to jump into that", "jump into that just yet",
      "keep chatting here a bit longer", "just keeping things low key", "keeping things low key for now", "what made you think of heading out",
      "heading out so spontaneously", "what are you craving for dinner yourself", "dinner yourself", "dessert talk has me smiling",
      "i like the interest but", "i like the interest", "can be there soon", "send me a location"
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
    t = t.replace(/\byou['’]?re\s+moving\s+fast,?\s+aren['’]?t\s+you[,.]?\s*/gi, "That is a quick jump. ");
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

  async function luxSiteTrustResponse(profileCard, customerMsg) {
    const tc = buildTimeContext();
    const sys = [
      "You are an adult woman on a dating site.",
      getAccentInstructionByCountry(profileCard?.country || ""),
      luxToneStyleInstruction(luxGetToneStyle()),
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
      personaCardLine(profileCard) || ""
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

  function buildSystemPrompt(leftCard, customSystem, imageNotes, imageIntent = "unknown") {
    const card = personaCardLine(leftCard) || "";
    const modelName = (GM_getValue("lux_model", MODEL_DEFAULT) || "").trim().toLowerCase();
    const tc = buildTimeContext();
    const last = (window.__LUX_LAST_USER || "");
    const toneInfo = lux_detectTone(last);
    const qGuide = luxQuestionGuide(toneInfo.tone, toneInfo.engagement, last);
    const regenMode = !!window.__LUX_REGEN_MODE;
    const regenAvoid = normalizeLooseText(window.__LUX_REGEN_AVOID || "").slice(0, 260);
    const regenLine = regenMode ? `Regeneration mode is active. Do not reuse the previous angle, opening, sentence shape, or question. Avoid sounding like this previous draft, ${regenAvoid || "the last draft"}. Write a fresh version that answers the same latest customer message more specifically and naturally.` : "";
    const jobLine = suggestJobLine(leftCard, leftCard?.age);
    const accentInstruction = getAccentInstructionByCountry(leftCard?.country || "");
    const recent = lux_getRecentReplies();
    const banlist = buildBanlistFromRecent(recent);
    const banBlock = banlist.length ? ` Avoid reusing any of these recent phrases, ${banlist.join(" | ")}.` : "";
    const toneStyle = luxGetToneStyle();
    const toneStyleLine = luxToneStyleInstruction(toneStyle);
    const greetingLine = luxIsGreetingOnly(last)
      ? "The latest customer message is mainly a greeting. Do not answer with a bare hi, hey, or hello. Give a warm, engaging salutation with one fresh detail or playful observation. Do not use daypart filler questions."
      : "";

    const baseCore = [
      "You are an adult woman, she and her, on a dating site.",
      accentInstruction,
      "Your tone is natural, warm, feminine, and relaxed, never robotic.",
      "Every reply must sound like a believable real human texting in the moment, with natural grammar, realistic emotion, and no assistant style wording.",
      toneStyleLine,
      greetingLine,
      "Your goal is to build engaging rapport through context rich, unique messages that feel fully human.",
      "Write like a real person, not a script, not a policy, not a chatbot.",
      "If the customer complains that the site is a scam, fake, bots, or profiles are not real, never agree with that idea. Reassure calmly that this is a real conversation platform and answer as a genuine person in the chat, without sounding defensive or corporate.",
      "Do not use canned reaction phrases like that caught me off guard, I can picture that, that made me pause, or if today ended well.",
      "React naturally before moving forward if the moment calls for it.",
      "Do not recycle your previous question patterns, refusal shapes, openings, alibis, or repeated call to action lines." + banBlock,
      "Do not pull open ended questions, refusals, greetings, reactions, excuses, or redirects from a pool, bank, sample list, or fallback list. Every response must be constructed from the latest customer message itself.",
      "Avoid templated phrasing like wildest, craziest, most spontaneous, most adventurous, what are you up to, how was your day, or tell me about yourself.",
      "Do not use profile-check openers like I took a peek at your profile, I looked at your profile, I checked your profile, or your profile gives me. If he asks you to check his profile, react directly to the substance as if it came up naturally.",
      "For meetup, call, video call, location, address, contact, or social media pushes, never accept, imply agreement, suggest later, suggest maybe, suggest coffee, drinks, dates, travel, visiting, meeting halfway, or moving off site. Do not use robotic refusal lines. Make the answer feel like a natural human sidestep that still keeps the door closed.",
      "When declining a meetup or location request, do not force a question. If the question would sound like filler, end cleanly without one.",
      "Never ask vague time filler such as what is the interesting thing you have ever done on a Friday afternoon like this.",
      "If the latest message is random, short, or nonsense, do not force a fake deep question. Respond simply and ask for what he meant only if needed.",
      "Favor context specific curiosity based on the customer's actual words, feelings, details, plans, jokes, compliments, worries, or memories.",
      "Keep the tone soft, empathetic, and gently reassuring.",
      "Use concrete details over vague filler.",
      "Punctuation rule, only use comma, period, question mark, and apostrophe, no other symbols.",
      "Always respond to the latest customer message only.",
      "Substance rule, answer the actual latest message before redirecting. If he gives details, react to at least two concrete details from his words. Do not ignore his topic and jump to a generic question.",
      "Match his emotional energy first, then add your own natural thought. Make the reply feel written for this exact man and this exact message.",
      "Avoid tiny one line replies unless his message is only a tiny greeting or one word. Normal replies should have enough body to feel present and specific.",
      "When an image is present, treat it as attached to the latest customer message only.",
      "Do not describe older photos, earlier uploads, or anything outside the latest customer turn.",
      "If the latest customer message is mainly text, answer that text first, then mention the image naturally only if it helps.",
      "Do not use generic photo phrases like I love the vibe in that picture, nice vibe, or atmosphere in that photo.",
      "Never assume the person in the photo is the customer.",
      "The customer may share screenshots, memes, profile picture comments, or pictures of other people.",
      "If the platform indicates the customer commented on a profile picture, treat it as them reacting to your profile picture, not sending their own picture.",
      "If the person in the image could be someone else, speak about the photo in a neutral observational way.",
      "Do not say you in that photo unless the customer clearly says it is them.",
      "Never sexualize a person in an image unless the customer explicitly says it is them.",
      `Current image intent guess, ${imageIntent}. Use it as guidance, but if uncertain stay neutral.`,
      "Only talk about the profile about section when the customer explicitly asks you to check or read their profile.",
      "If you discuss their profile, respond to its tone and intention naturally, not like a checklist.",
      "Avoid stock filler about building connection or heat.",
      "If you need to decline something, do not explain too much and do not sound rehearsed. Create a fresh human pivot from his exact wording, mood, or assumption.",
      "Excuses can be everyday reasons like work focus, rest, timing, small chores, or low battery, avoid family excuses unless the customer mentions family first.",
      "Picture requests, always accept picture requests in a soft, platform safe way, vary your wording.",
      "Safety, never share or ask for contacts or handles, no meetups, dates, drinks, coffee, hotels, visits, trips, calls, video calls, or off platform plans. Keep everything on platform.",
      "Location asks, share only city, never an address or specific area.",
      "Name asks, use the real name from the profile parentheses when giving your name.",
      "If asked about your job or work, answer with an age appropriate job and keep it believable.",
      `If you need a job line, use this as your job, ${jobLine}.`,
      "Do not engage with incest, bestiality, drug use, or racism. Refuse and redirect softly if they come up.",
      "Banned language, do not use oh, oh wow, flattered, enthusiasm, enthusaism, sizzling, non food spicy, or flirt words.",
      "Form, one natural paragraph, no emojis, usually about 60 to 145 words. Use 2 to 4 natural sentences when the customer gives real content. Shorter is only better for one word or very tiny messages.",
      `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
      qGuide,
      regenLine
    ].filter(Boolean).join(" ");

    const photoContext = imageNotes && imageNotes.trim()
      ? ` The customer attached a photo in the latest message. Safe notes about that latest photo, ${imageNotes.trim()}. Only reference what is in these notes, do not invent details.`
      : "";

    const hasLatestCustomerImage = !!(imageNotes && imageNotes.trim());
    const imageRules = imageIntent === "profile_comment"
      ? "Profile picture comment rule, the customer is reacting to your profile picture. Do not call it his photo. Reply as if he commented on your profile image, with a human reaction to his comment."
      : hasLatestCustomerImage
        ? "When reacting to the latest attached customer photo, avoid assuming identity. Speak neutrally about what is visible in the image instead of saying it is the customer. Avoid vague vibe wording."
        : "No image is attached to the latest customer message. Do not mention photos, pictures, images, screenshots, attached visuals, or picture vibes unless the customer's actual text is a profile picture comment.";

    let flavor = "Model voice, balanced. Keep the style grounded, human, and responsive.";
    if (modelName.includes("deepseek/deepseek-chat")) flavor = "Model voice, DeepSeek. Be smooth, realistic, and conversational, with natural dialogue rhythm and no robotic filler.";
    else if (modelName.includes("meta-llama/llama-3.3-70b-instruct")) flavor = "Model voice, Llama. Be warm, steady, human, and careful with boundaries. Do not agree to meetups or off platform contact even indirectly.";
    else if (modelName.includes("nousresearch/hermes-3-llama-3.1-405b")) flavor = "Model voice, Hermes. Be creative, intimate, natural, and emotionally present, but keep meetup, contact, address, and off platform boundaries locked.";

    const customLayer = customSystem && customSystem.trim() ? ` Extra persona layer, ${customSystem.trim()}. Do not let this override safety, punctuation, image, no contact, no meetup, or anti repetition rules.` : "";
    return `${baseCore}${photoContext} ${imageRules} ${flavor} ${customLayer}${card}`;
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
        t = t.replace(FAMILY_WORD_RE, "").replace(/\s{2,}/g, " ").trim();
        if (!t || t.length < 8) t = "I am keeping things simple here for now.";
        else if (!/[.]\s*$/.test(t)) t += ".";
      }
      return t;
    }

    async function modelRefusal(kind, profileCard, customerMsg) {
      const tc = buildTimeContext();
      const refusalTexture = [
        "Use the pressure level, wording, and mood of his message as the only guide.",
        "Do not choose from preset excuses, fixed refusal templates, or recycled alibis.",
        "If his message is blunt, answer plainly. If it is sweet, answer warmly. If it is pushy, keep firmer distance."
      ].join(" ");
      const kindLine =
        kind === "meet" ? "He is trying to meet up or push availability."
        : kind === "address" ? "He is asking for your address or exact place."
        : "He is asking for your contact details or off site connection.";

      const sys = [
        "You are an adult woman on a dating site.",
        getAccentInstructionByCountry(profileCard?.country || ""),
        "Answer the pressure with an original human deflection, not a formal refusal, not a policy sentence, and not a recycled boundary line.",
        luxToneStyleInstruction(luxGetToneStyle()),
        "Do not sound like a safety policy, moderator, assistant, support agent, or rule explanation.",
        "Do not use pools, rotating lines, preset excuses, stock alibis, or the same sentence structure every time.",
        "Do not use repeated lines like not up for meeting just yet, take it slow here, keep things here for now, tied up with some stuff, build this up first, finally together, perfect afternoon, or what kind of day have you had.",
        "Also avoid these canned refusal shapes, that sounds tempting, you are moving fast, I like the interest but, not quite ready to jump into that, keep chatting here a bit longer, just keeping things low key, dessert talk has me smiling, what made you think of heading out, and what are you craving for dinner yourself.",
        "Do not start with Hey or Aw plus a soft compliment before the boundary. Start where a real woman would start, with the actual point.",
        "Use the customer's exact pressure level and wording as the guide. Do not select from preset excuses or fixed alibis.",
        "Do not ask daypart filler questions like what is the interesting thing you have ever done on a Friday afternoon like this.",
        "Avoid repeated alibis. Do not keep using the same excuse about work, rest, timing, chores, or battery.",
        "Sometimes the reason can simply be privacy, caution, timing, mood, wanting real trust first, not wanting pressure, or preferring the chat here. Do not invent a fake detailed alibi unless it truly fits the latest message.",
        "Vary sentence openings and emotional texture.",
        "No contacts, no meetups, no calls, no video calls, no addresses, and no off platform plans. Keep the boundary firm without announcing it like a rule.",
        refusalTexture,
        "Only use comma, period, question mark, and apostrophe.",
        "No emojis.",
        "No semicolons, no em dashes, no parentheses.",
        "Keep it to 2 or 3 sentences.",
        "If you end with a question, make it specific to his exact latest words, not generic, not daypart based, not meetup fantasy based, and not about what would happen if you were finally together. It is also acceptable to end without a question if the refusal already feels complete.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        personaCardLine(profileCard) || ""
      ].join(" ");

      const user = [
        kindLine,
        `Customer message: "${(customerMsg || "").slice(0, 260)}"`,
        "Write one original human response only. Do not pick from a refusal pool. Build it from his exact words, tone, and pressure level.",
        "Make it sound like a real woman texting naturally in the moment. Use emotional redirection, a playful sidestep, or a grounded privacy instinct instead of a direct scripted no when that fits."
      ].join("\n");

      let out = "";
      try {
        out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], {
          max_tokens: 120,
          temperature: 0.68,
          top_p: 0.93,
          frequency_penalty: 0.35,
          presence_penalty: 0.25
        });
      } catch {}

      out = deFamily(out || "", customerMsg);
      out = postFormat(luxRemoveCannedPhrases(out || ""));
      if (luxLooksCannedRefusal(out) || lux_refusalAlreadyUsed(out)) {
        try {
          const retrySys = sys + " The previous refusal sounded too canned or repeated. Rewrite it with no fake alibi, no daypart filler, no perfect day question, no finally together question, no take it slow here, no keep chatting here for now, no build this up line, no moving fast line, no tempting line, no low key line, no jump into that line, and no heading out spontaneously question.";
          const retryUser = user + "\nRejected reply: " + out + "\nWrite a fresher refusal that still keeps the boundary.";
          const retry = await llmCall([{ role: "system", content: retrySys }, { role: "user", content: retryUser }], {
            max_tokens: 120,
            temperature: 0.58,
            top_p: 0.88,
            frequency_penalty: 0.55,
            presence_penalty: 0.35
          });
          if (retry) out = postFormat(luxRemoveCannedPhrases(deFamily(retry, customerMsg)));
        } catch {}
      }
      out = luxRemoveCannedPhrases(out || "");
      if (lux_refusalAlreadyUsed(out) || luxLooksCannedRefusal(out)) out = luxDropGenericFinalQuestion(out);
      lux_pushRefusalMemory(out);
      return out || "I prefer keeping things on the site, but I still want the conversation to feel easy between us.";
    }

    async function blockedTopicRefusal(kind, profileCard, customerMsg) {
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
        personaCardLine(profileCard) || ""
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
    const genericQuestion = /(?:what(?:'s| is)\s+(?:the\s+)?(?:most\s+)?(?:interesting|wildest|craziest|spontaneous|adventurous)\s+thing|what(?:'s| is)\s+something\s+(?:interesting|fun|different|wild|crazy|spontaneous)|what\s+kind\s+of\s+day\s+have\s+you\s+had|how\s+was\s+your\s+day|what\s+are\s+you\s+up\s+to|tell\s+me\s+about\s+yourself|what\s+.*\byou(?:'ve| have)\s+ever\s+done\b|what\s+.*\bon\s+a\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:morning|afternoon|evening|night)\s+like\s+this|what(?:'s| is)\s+your\s+idea\s+of\s+a\s+perfect|perfect\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)?\s*(?:morning|afternoon|evening|night|day)|what\s+would\s+you\s+do\s+if\s+we\s+were\s+finally\s+together|if\s+today\s+ended\s+well|what\s+would\s+it\s+look\s+like|what\s+made\s+you\s+think\s+of\s+heading\s+out|heading\s+out\s+so\s+spontaneously|what\s+are\s+you\s+craving\s+for\s+dinner\s+yourself|what\s+made\s+you\s+so\s+eager\s+to\s+move\s+this\s+fast|what\s+made\s+you\s+decide\s+to\s+push\s+for\s+that\s+right\s+now)/i;
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
    t = t.replace(/\b(?:That\s+is\s+a\s+quick\s+jump\.\s*){2,}/gi, "That is a quick jump. ");
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

  function lux_visionCacheKey(imageUrl) {
    try { return `${_threadKey()}__${hashStr(String(imageUrl || ""))}`; }
    catch { return `global__${hashStr(String(imageUrl || ""))}`; }
  }

  function lux_getVisionCache() {
    try {
      const obj = JSON.parse(GM_getValue(LUX_VISION_CACHE_KEY, "{}")) || {};
      return obj && typeof obj === "object" ? obj : {};
    } catch { return {}; }
  }

  function lux_setVisionCache(cache) {
    try { GM_setValue(LUX_VISION_CACHE_KEY, JSON.stringify(cache || {})); } catch {}
  }

  function lux_getCachedVisionDescription(imageUrl) {
    const key = lux_visionCacheKey(imageUrl);
    const item = lux_getVisionCache()[key];
    if (!item || !item.desc) return "";
    if (Date.now() - Number(item.ts || 0) > 24 * 60 * 60 * 1000) return "";
    return String(item.desc || "").trim();
  }

  function lux_cacheVisionDescription(imageUrl, desc) {
    const clean = String(desc || "").replace(/\s{2,}/g, " ").trim();
    if (!imageUrl || !clean) return;
    const cache = lux_getVisionCache();
    cache[lux_visionCacheKey(imageUrl)] = { desc: clean, ts: Date.now() };
    const keys = Object.keys(cache).sort((a, b) => Number(cache[b]?.ts || 0) - Number(cache[a]?.ts || 0));
    keys.slice(30).forEach(k => delete cache[k]);
    lux_setVisionCache(cache);
  }

  async function luxDescribeLatestCustomerImage(imageUrl, messageText, imageIntent, api, headers) {
    if (!imageUrl || imageIntent === "profile_comment") return "";
    const cached = lux_getCachedVisionDescription(imageUrl);
    if (cached) return cached;
    if (!lux_canSendRequest()) return "";
    const body = sanitizePayloadForModel({
      model: LUX_VISION_MODEL,
      messages: [
        {
          role: "system",
          content: [
            "You are LUX vision reader.",
            "Describe only the latest customer attached image for a text chat model.",
            "Do not write the customer reply.",
            "Do not guess identity, age, relationship, or private facts.",
            "Do not sexualize anyone in the image.",
            "Mention visible objects, setting, clothing, mood, text in screenshot if readable, and anything useful for a natural reply.",
            "Keep it factual, neutral, and under 70 words."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Latest customer text, ${String(messageText || "Customer sent a photo.").slice(0, 260)}. Image intent guess, ${imageIntent || "unknown"}. Describe the image only.` },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      temperature: 0.20,
      top_p: 0.80,
      max_tokens: 180
    }, LUX_VISION_MODEL);

    try {
      const res = await gmPostJSON(api, headers, body, REQUEST_TIMEOUT_MS);
      if (res.status < 200 || res.status >= 300) {
        if (res.status === 429) lux_markOpenRouterRateLimit();
        console.warn("LUX vision reader failed", res.status, trimText(res.responseText, 220));
        return "";
      }
      const desc = parseOpenRouterContent(res.responseText).replace(/\s{2,}/g, " ").trim();
      lux_cacheVisionDescription(imageUrl, desc);
      return desc;
    } catch (e) {
      console.warn("LUX vision reader error", e);
      return "";
    }
  }

  async function llmCall(messages, overrides = {}) {
    if (!lux_canSendRequest()) throw new Error("Rate-limited");
    const key = lux_getApiKey().trim();
    const model = GM_getValue("lux_model", MODEL_DEFAULT).trim();
    if (!key) throw new Error("Missing OpenRouter API key");

    const base = getModelPreset(model);
    const tuned = withCreativeBoost(base, (messages?.[messages.length - 1]?.content) || "");
    const body = sanitizePayloadForModel({
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
            if (res.status < 200 || res.status >= 300) {
              if (res.status === 429) lux_markOpenRouterRateLimit();
              return reject(new Error(`OpenRouter HTTP ${res.status}: ${trimText(res.responseText, 280)}`));
            }
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
      <div><strong>Tone style</strong></div>
      <select id="lux-tone-style">
        <option value="sweet">Sweet</option>
        <option value="naughty">Naughty</option>
        <option value="deflect">Deflect</option>
        <option value="savage">Savage</option>
        <option value="humorous">Humorous</option>
      </select>
      <div><strong>Voice replies</strong></div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:6px 0 10px">
        <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-voice-enabled"> Enable voice</label>
        <label style="display:flex;gap:8px;align-items:center;">Voice<select id="lux-voice-gender" style="width:auto;margin:0"><option value="female">Female</option><option value="male">Male</option></select></label>
      </div>
      <div><strong>Custom Persona, optional</strong></div><textarea id="lux-persona"></textarea>
      <button id="lux-save" style="margin-top:6px;background:#0b3d91;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-weight:700">Save</button>
    </div>
  `;
  document.body.appendChild(pop);

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
    toneStyle: pop.querySelector("#lux-tone-style"),
    persona: pop.querySelector("#lux-persona"),
    voiceEnabled: pop.querySelector("#lux-voice-enabled"),
    voiceGender: pop.querySelector("#lux-voice-gender"),
    save: pop.querySelector("#lux-save")
  };

  ui.apiUrl.value = GM_getValue("lux_api_url", API_URL_DEFAULT);
  ui.apiKey.value = lux_getApiKey();
  ui.model.value = LUX_ALLOWED_MODELS.includes(GM_getValue("lux_model", MODEL_DEFAULT)) ? GM_getValue("lux_model", MODEL_DEFAULT) : MODEL_DEFAULT;
  ui.toneStyle.value = luxGetToneStyle();
  ui.persona.value = GM_getValue("lux_persona", "");
  ui.voiceEnabled.checked = !!GM_getValue("lux_voice_enabled", 0);
  ui.voiceGender.value = GM_getValue("lux_voice_gender", "female");

  const modelChoices = [
    "deepseek/deepseek-chat",
    "meta-llama/llama-3.3-70b-instruct",
    "nousresearch/hermes-3-llama-3.1-405b"
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

  async function callBackend(msgText, latestClientRowOverride = null, regenMode = false) {
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
    window.__LUX_REGEN_MODE = !!regenMode;

    const imageIntent = imageNotes
      ? luxInferImageIntent(latestClientRow, `${rawMsg} ${imageNotes}`)
      : luxInferImageIntent(null, rawMsg);

    if (luxIsSiteTrustComplaint(rawMsg)) {
      let out = await luxSiteTrustResponse(leftCard, rawMsg);
      out = postFormat(luxRemoveCannedPhrases(out)).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    const blockedKind = Safety.getBlockedTopic(rawMsg);
    if (blockedKind) {
      let out = await Safety.blockedTopicRefusal(blockedKind, leftCard, rawMsg);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
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
          luxToneStyleInstruction(luxGetToneStyle()),
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
          personaCardLine(leftCard) || ""
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
      if (luxNeedsHardMeetupRepair(rawMsg, out)) out = await Safety.modelRefusal("meet", leftCard, rawMsg);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    if (Safety.askName(rawMsg)) {
      const profName = (leftCard && leftCard.realName) ? leftCard.realName : "Luna";
      const sys = "Natural English in the profile country style. " + luxToneStyleInstruction(luxGetToneStyle()) + " One short paragraph. No contacts or meetups. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow matching open ended question created by you. " + getAccentInstructionByCountry(leftCard?.country || "");
      const user = `They asked your name. Use exactly: "${profName}". ${personaCardLine(leftCard) || ""}\nCustomer: "${rawMsg.slice(0, 240)}"`;
      let line = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], { max_tokens: 100, temperature: 0.30, top_p: 0.88 });
      line = await Safety.enforceNoMeetAccept(rawMsg, line, leftCard);
      if (luxNeedsHardMeetupRepair(rawMsg, line)) line = await Safety.modelRefusal("meet", leftCard, rawMsg);
      line = postFormat(line).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([line]);
      pushHist(rawMsg, line);
      lux_pushRecentReply(line);
      lux_pushReplyFingerprint(line);
      luxSpeak(line);
      return;
    }


    if ((Safety.wantsMeet(rawMsg) || Safety.wantsMeetSoft(rawMsg)) && (Safety.wantsLocation(rawMsg) || Safety.mentionsAddress(rawMsg))) {
      let out = await Safety.modelRefusal("address", leftCard, rawMsg);
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      out = postFormat(luxRemoveCannedPhrases(out)).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    if (Safety.wantsLocation(rawMsg)) {
      const profCity = (leftCard && leftCard.location) ? leftCard.location : "nearby";
      const sys = "If asked where you are, give city only. No address. " + luxToneStyleInstruction(luxGetToneStyle()) + " One short paragraph. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow matching open ended question created by you. " + getAccentInstructionByCountry(leftCard?.country || "");
      const user = `City only: "${profCity}". ${personaCardLine(leftCard) || ""}\nCustomer: "${rawMsg.slice(0, 240)}"`;
      let line = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], { max_tokens: 100, temperature: 0.30, top_p: 0.88 });
      line = await Safety.enforceNoMeetAccept(rawMsg, line, leftCard);
      if (luxNeedsHardMeetupRepair(rawMsg, line)) line = await Safety.modelRefusal("meet", leftCard, rawMsg);
      line = postFormat(line).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([line]);
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
        luxToneStyleInstruction(luxGetToneStyle()),
        "Only use comma, period, question mark, and apostrophe.",
        "Do not mention policy, do not mention rules.",
        "Do not share contacts, do not agree to meetups.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        `Profile age is ${leftCard?.age || "unknown"}, your job must fit your age.`,
        `Use this job line as your job, ${jobLine}.`,
        qGuide
      ].join(" ");
      const user = `They asked about your job.\nCustomer: "${rawMsg.slice(0, 240)}"\nReply in one short paragraph and end with exactly one open ended question if it feels natural.`;
      let out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], { max_tokens: 190, temperature: 0.52, top_p: 0.92 });
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      if (luxNeedsHardMeetupRepair(rawMsg, out)) out = await Safety.modelRefusal("meet", leftCard, rawMsg);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    if (Safety.wantsMeet(rawMsg) || Safety.wantsMeetSoft(rawMsg)) {
      let out = await Safety.modelRefusal("meet", leftCard, rawMsg);
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    if (Safety.wantsContact(rawMsg) || Safety.mentionsAddress(rawMsg)) {
      const kind = Safety.mentionsAddress(rawMsg) ? "address" : "contact";
      let out = await Safety.modelRefusal(kind, leftCard, rawMsg);
      out = postFormat(out).replace(/\s{2,}/g, " ").replace(/^\.+/, "").trim();
      showReplies([out]);
      pushHist(rawMsg, out);
      lux_pushRecentReply(out);
      lux_pushReplyFingerprint(out);
      luxSpeak(out);
      return;
    }

    let chosenModel = GM_getValue("lux_model", MODEL_DEFAULT);
    if (!LUX_ALLOWED_MODELS.includes(chosenModel)) {
      chosenModel = MODEL_DEFAULT;
      GM_setValue("lux_model", chosenModel);
      if (ui && ui.model) ui.model.value = chosenModel;
    }
    const basePreset = getModelPreset(chosenModel);
    const tuned = withCreativeBoost(basePreset, effectiveMsg);
    const historyForModel = lux_buildHistoryByTokens(shortHistory, 3000);

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

    const latestImage = imageNotes && imageIntent !== "profile_comment" ? luxGetLatestClientImageUrlFromMessage(latestClientRow) : "";
    const visionDescription = latestImage
      ? await luxDescribeLatestCustomerImage(latestImage, effectiveMsg || rawMsg, imageIntent, api, headers)
      : "";
    const finalImageNotes = visionDescription || imageNotes;
    const system = buildSystemPrompt(leftCard, (GM_getValue("lux_persona", "") || "").trim(), finalImageNotes, imageIntent);

    let userTextForModel = effectiveMsg || rawMsg || "Customer sent a message.";
    if (finalImageNotes) {
      userTextForModel += " Latest customer image description, " + finalImageNotes + ".";
    }
    userTextForModel += " Reply must directly match this latest message, mention concrete details from it when available, and avoid a short generic deflection.";
    if (regenMode) userTextForModel += " This is a regeneration. Use a different angle and wording from the previous draft, while still answering the same customer message.";
    const userPayload = { role: "user", content: userTextForModel };

    const messages = [{ role: "system", content: system }, ...historyForModel, userPayload];

    let payload = sanitizePayloadForModel({
      model: chosenModel,
      messages,
      temperature: tuned.temperature,
      top_p: tuned.top_p,
      max_tokens: tuned.max_tokens,
      repetition_penalty: tuned.repetition_penalty,
      stop: tuned.stop,
      seed: regenMode ? Number(tuned.seed || 1) + Number(GM_getValue("lux_regen_count_v1", 0) || 0) + 101 : tuned.seed
    }, chosenModel);

    if (regenMode) {
      payload.temperature = Math.min(0.92, Number(payload.temperature || tuned.temperature || 0.78) + 0.08);
      payload.top_p = Math.min(0.98, Number(payload.top_p || tuned.top_p || 0.94) + 0.02);
      payload.max_tokens = Math.max(Number(payload.max_tokens || 320), 340);
      payload.repetition_penalty = Math.min(1.10, Number(payload.repetition_penalty || 1.06) + 0.02);
    }

    try {
      const res1 = await gmPostJSON(api, headers, payload, REQUEST_TIMEOUT_MS);

      if (res1.status < 200 || res1.status >= 300) {
        let msg;
        if (res1.status === 401) msg = "OpenRouter API key is invalid or unauthorized.";
        else if (res1.status === 402) msg = "OpenRouter billing or quota exceeded, HTTP 402.";
        else if (res1.status === 404) msg = "OpenRouter endpoint or model not found, HTTP 404.";
        else if (res1.status === 429) { lux_markOpenRouterRateLimit(); msg = "OpenRouter rate limit reached, HTTP 429. LUX paused briefly to prevent repeated retries."; }
        else msg = `HTTP ${res1.status} ${res1.statusText || ""}`.trim();
        errorReply(msg);
        return false;
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
      if (luxNeedsHardMeetupRepair(rawMsg, content)) content = await Safety.modelRefusal("meet", leftCard, rawMsg);

      if (luxShouldAddReaction(rawMsg, content)) {
        const reaction = luxHumanReaction(`${rawMsg}|${chosenModel}`);
        if (reaction) {
          content = `${content} ${reaction}`;
          GM_setValue(LUX_REACTION_COOLDOWN_KEY, Date.now());
        }
      }

      content = luxFinalGrammarPass(luxRemoveCannedPhrases(luxCleanImageAssumption(postFormat(content))))
        .replace(/\byour tits\b/gi, "that look")
        .replace(/\byour boobs\b/gi, "that look")
        .replace(/\s{2,}/g, " ")
        .replace(/^[,\.\?\s]+/, "")
        .trim();

      const recentBlob = lux_getRecentReplies().join(" ");
      if (overlapScore(content, recentBlob) > 0.12 || lux_isTooSimilarToRecent(content)) {
        payload = sanitizePayloadForModel({
          ...payload,
          temperature: Math.max(0.45, (payload.temperature || 0.7) - 0.12),
          repetition_penalty: Math.min(1.10, (payload.repetition_penalty || 1.02) + 0.04)
        }, chosenModel);

        if (!lux_canSendRequest()) return false;
        const resR = await gmPostJSON(api, headers, payload, REQUEST_TIMEOUT_MS);
        if (resR.status === 429) lux_markOpenRouterRateLimit();
        const rawR = parseOpenRouterContent(resR.responseText);
        if (rawR) {
          let retry = rawR;
          retry = await Safety.enforceNoMeetAccept(rawMsg, retry, leftCard);
          if (luxNeedsHardMeetupRepair(rawMsg, retry)) retry = await Safety.modelRefusal("meet", leftCard, rawMsg);
          retry = luxFinalGrammarPass(luxRemoveCannedPhrases(luxCleanImageAssumption(postFormat(retry))))
            .replace(/\byour tits\b/gi, "that look")
            .replace(/\byour boobs\b/gi, "that look")
            .replace(/\s{2,}/g, " ")
            .replace(/^[,\.\?\s]+/, "")
            .trim();
          content = retry;
        }
      }

      LUXPatch.UIChips.refresh({ modelLabel: chosenModel, countryLabel: leftCard?.country || "—" });
      showReplies([content]);
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
    GM_setValue(LUX_TONE_STYLE_KEY, LUX_TONE_STYLES.includes(ui.toneStyle.value) ? ui.toneStyle.value : "sweet");
    GM_setValue("lux_persona", ui.persona.value.trim());
    GM_setValue("lux_voice_enabled", ui.voiceEnabled.checked ? 1 : 0);
    GM_setValue("lux_voice_gender", ui.voiceGender.value || "female");
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || "default"), countryLabel: parseProfileCountry() || "—" });
    LUXSettingsDirty = false;
    alert("Saved");
  });

  [ui.apiUrl, ui.apiKey, ui.model, ui.persona].forEach(el => el.addEventListener("input", () => { LUXSettingsDirty = true; }));
  ui.toneStyle.addEventListener("change", () => { LUXSettingsDirty = true; });
  ui.voiceEnabled.addEventListener("change", () => { LUXSettingsDirty = true; });
  ui.voiceGender.addEventListener("change", () => { LUXSettingsDirty = true; });

  ui.send.addEventListener("click", async () => {
    const msg = stripStampsAll((ui.customer.value || "").trim());
    if (!msg) {
      notify("Type a message first.");
      return;
    }
    await callBackend(msg);
  });

  ui.regen.onclick = async () => {
    try {
      ui.regen.disabled = true;
      let msg = stripStampsAll((ui.customer.value || "").trim());
      if (!msg) {
        const lastUser = [...shortHistory].reverse().find(t => t.role === "user");
        if (!lastUser) return;
        msg = stripStampsAll(lastUser.content);
        ui.customer.value = msg;
      }
      let previousDraft = "";
      if (shortHistory.length && shortHistory[shortHistory.length - 1].role === "assistant") {
        previousDraft = String(shortHistory[shortHistory.length - 1].content || "");
        shortHistory.pop();
        _saveHistory();
      }
      const regenCount = Number(GM_getValue("lux_regen_count_v1", 0) || 0) + 1;
      GM_setValue("lux_regen_count_v1", regenCount);
      window.__LUX_REGEN_AVOID = previousDraft;
      window.__LUX_REGEN_MODE = true;
      await callBackend(msg, null, true);
      window.__LUX_REGEN_MODE = false;
    } finally {
      window.__LUX_REGEN_MODE = false;
      ui.regen.disabled = false;
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

    const turnSig = String(hashStr(`${cleanForUI}|${imageNotes}`));
    if (turnSig === lastSeen || turnSig === luxGeneratingSig) return;
    luxGeneratingSig = turnSig;

    if (turns.length) {
      shortHistory = turns.slice(-HISTORY_MAX).map(t => ({
        role: t.role,
        content: stripStampsAll(extractLuxImageMeta(t.content || "").text || "")
      })).filter(t => t.content || t.role === "assistant");
      _saveHistory();
    }

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

  function setupThreadWatcher() {
    const root = document.querySelector(THREAD_SEL);
    if (!root) return false;
    const obs = new MutationObserver(() => {
      clearTimeout(luxWatcherTimer);
      luxWatcherTimer = setTimeout(processLatestTurn, 250);
    });
    obs.observe(root, { childList: true, subtree: true });
    processLatestTurn();
    return true;
  }

  luxInitVoices();

  if (!setupThreadWatcher()) {
    const fallbackId = setInterval(() => {
      if (setupThreadWatcher()) clearInterval(fallbackId);
    }, POLL_MS);
  }
})();
