// ==UserScript==
// @name         LUX Starr Framework v13 (OpenRouter • Encrypted Key • Creative Booster • Strict Access • ConeID Gate)
// @namespace    http://tampermonkey.net/
// @version      14.6.5
// @description  LUX upgraded with safer image handling, latest-turn vision focus, profile-about reading on request, smarter refusals, improved punctuation, and stronger anti-repeat memory.
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
    temperature: 0.58,
    top_p: 0.92,
    repetition_penalty: 1.02,
    max_tokens: 240,
    stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
    seed: 11
  };

  const MODEL_PRESETS = {
    "x-ai/grok-4-fast": { temperature: 0.75, top_p: 0.97, repetition_penalty: 1.02, max_tokens: 260, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 37 },
    "anthropic/claude-3.5-sonnet": { temperature: 0.68, top_p: 0.95, repetition_penalty: 1.01, max_tokens: 260, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 53 },
    "openai/gpt-4.1-mini": { temperature: 0.62, top_p: 0.94, repetition_penalty: 1.02, max_tokens: 240, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 29 },
    "openai/gpt-4o-mini": { temperature: 0.64, top_p: 0.94, repetition_penalty: 1.02, max_tokens: 240, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 31 },
    "openai/gpt-4.1": { temperature: 0.62, top_p: 0.93, repetition_penalty: 1.02, max_tokens: 260, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 33 },
    "deepseek/deepseek-chat": { temperature: 1.0, top_p: 0.98, repetition_penalty: 1.02, max_tokens: 280, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 41 },
    "nousresearch/hermes-3-llama-3.1-405b": { temperature: 0.9, top_p: 0.92, repetition_penalty: 1.01, max_tokens: 300, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 67 },
    "qwen/qwen-3-72b-instruct": { temperature: 0.95, top_p: 0.95, repetition_penalty: 1.01, max_tokens: 290, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 73 },
    "cognitivecomputations/dolphin-2.9.3-mistral-24b-venice": { temperature: 1.0, top_p: 1.0, repetition_penalty: 1.0, max_tokens: 280, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 79 }
  };

  const LUX_RATE_WINDOW_MS = 10000;
  const LUX_RATE_MAX_REQ = 5;
  const LUX_RATE_LOG_KEY = "lux_req_log_v1";
  const LUX_CREATIVE_STATE_KEY = "lux_creative_state_v1";
  const LUX_REPLY_FP_KEY = "lux_reply_fp_v2";
  const LUX_THEME_MEMORY_KEY = "lux_theme_memory_v1";
  const LUX_REACTION_COOLDOWN_KEY = "lux_reaction_cooldown_v1";
  const LUX_REFUSAL_MEMORY_KEY = "lux_refusal_memory_v1";

  const LUX_CONVERSATION_THEMES = [
    "memory", "curiosity", "emotion", "story", "opinions", "work", "travel", "food", "music",
    "relationships", "values", "life", "future", "humor", "growth", "beliefs", "childhood", "dreams"
  ];

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

  function luxGetLatestClientImageUrlFromMessage(messageNode) {
    try {
      if (!messageNode) return "";
      const img = messageNode.querySelector(CLIENT_IMAGE_SELECTOR);
      if (!img) return "";
      const parentLink = img.closest("a");
      if (parentLink && parentLink.href) return parentLink.href.trim();
      return (img.currentSrc || img.src || "").trim();
    } catch {
      return "";
    }
  }

  function getImageNotes(node) {
    if (!node) return [];
    const imgs = [...node.querySelectorAll(CLIENT_IMAGE_SELECTOR + ", img")];
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
      if (alt) parts.push(`alt text ${alt}`);
      if (name) parts.push(`file ${name}`);
      if (w && h) parts.push(`size ${w}x${h}`);
      notes.push(parts.length ? parts.join(", ") : "image attached");
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

  function luxImageOpeners(seed) {
    const options = [
      "That photo caught my attention.",
      "Interesting picture you shared.",
      "I noticed the image you sent.",
      "That picture has a nice vibe to it.",
      "I like the atmosphere in that photo."
    ];
    return options[Math.abs(hashStr(seed)) % options.length];
  }

  function luxInferImageIntent(messageNode, messageText) {
    const text = String(messageText || "").toLowerCase();
    const img = messageNode ? messageNode.querySelector(CLIENT_IMAGE_SELECTOR) : null;
    const src = String((img?.currentSrc || img?.src || "")).toLowerCase();
    const alt = String((img?.getAttribute("alt") || "")).toLowerCase();
    const blob = `${text} ${src} ${alt}`;
    if (/\b(that'?s me|this is me|my photo|my pic|my picture|my selfie|selfie of me|here is me|here'?s me)\b/i.test(text)) return "selfie";
    if (/\b(screenshot|screen shot|profile pic|profile picture|chat screenshot|look at her|look at this girl|her photo|this woman|this lady|this girl)\b/i.test(blob)) return "screenshot";
    if (/\b(meme|funny pic|joke|reaction image|sticker)\b/i.test(blob)) return "meme";
    if (/\b(food|meal|breakfast|lunch|dinner|snack|plate|restaurant|dish|drink)\b/i.test(blob)) return "food";
    if (/\b(beach|vacation|holiday|travel|trip|mountain|hotel|city|view|sunset|pool|airport)\b/i.test(blob)) return "place";
    return "unknown";
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

  function luxPickConversationTheme(seedText = "") {
    const recent = new Set(lux_getThemeMemory());
    const pool = LUX_CONVERSATION_THEMES.filter(t => !recent.has(t));
    const source = pool.length ? pool : LUX_CONVERSATION_THEMES;
    const picked = source[Math.abs(hashStr(seedText || String(Date.now()))) % source.length];
    lux_pushThemeMemory(picked);
    return picked;
  }

  function luxQuestionFromTheme(theme) {
    switch (theme) {
      case "memory": return "That makes me wonder, when did that first become part of your life?";
      case "curiosity": return "Now you've made me curious, what made you think about that today?";
      case "emotion": return "How did that actually make you feel when it happened?";
      case "story": return "There has to be a story behind that, what really happened?";
      case "opinions": return "Do you genuinely believe that, or are you still figuring it out yourself?";
      case "work": return "How did you end up in that kind of work in the first place?";
      case "travel": return "Is there a place you've been that still stays in your head sometimes?";
      case "food": return "What's one meal you could never really get tired of?";
      case "music": return "What song can change your mood almost instantly?";
      case "relationships": return "What usually makes you feel close to someone?";
      case "values": return "What matters most to you these days, really?";
      case "life": return "Looking back, what moment changed things the most for you?";
      case "future": return "If life went your way from here, what would it start looking like?";
      case "humor": return "What's the funniest thing that's happened to you lately?";
      case "growth": return "What's something you've learned about yourself in the last few years?";
      case "beliefs": return "What's one belief that shaped the way you see people?";
      case "childhood": return "Were you always a little like this, even when you were younger?";
      case "dreams": return "If you got exactly what you wanted, where would that take you?";
      default: return "Tell me more about that.";
    }
  }

  function luxQuestionGuide(tone, engagement, userText) {
    const theme = luxPickConversationTheme(`${userText}|${tone}|${engagement}|${Date.now()}`);
    const sample = luxQuestionFromTheme(theme);
    let base = [
      "End with exactly one open ended question only if it feels natural.",
      "The question must feel human, unique, and easy to answer.",
      "Avoid templated patterns like wildest, craziest, most spontaneous, most adventurous, tell me about yourself, how was your day, or what are you up to.",
      "Use curiosity, memory, emotion, story, opinions, values, future, humor, work, travel, food, music, relationships, growth, beliefs, childhood, or dreams.",
      "Do not reuse a question shape from recent replies.",
      `A good direction for this reply would sound like this, ${sample}`
    ].join(" ");
    if (tone === "angry") base += " Their tone is tense, ask something calm that helps them explain what actually bothered them.";
    else if (tone === "cold") base += " Their tone is dry, make the question light and easy, but still a little personal.";
    else if (tone === "serious") base += " Their tone is serious, ask something thoughtful and specific.";
    else if (tone === "sweet") base += " Their tone is affectionate, ask something warm that deepens softness or closeness.";
    else if (tone === "flirty") base += " Their tone is teasing, ask something playful and magnetic without sounding repetitive.";
    else if (tone === "playful") base += " Their tone is playful, ask something fun or a little unexpected.";
    else if (engagement === "low") base += " Keep it easy to answer, but not dull.";
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

    if (m.includes("qwen/qwen-3-72b-instruct")) {
      delete p.stop; delete p.seed;
      if ("repetition_penalty" in p) delete p.repetition_penalty;
      p.temperature = Math.min(Number(p.temperature || 0.9), 0.88);
      p.top_p = Math.min(Number(p.top_p || 0.95), 0.90);
      p.max_tokens = Math.min(Number(p.max_tokens || 260), 240);
    }

    if (m.includes("dolphin-2.9.3-mistral-24b-venice")) {
      delete p.stop; delete p.seed;
      if ("repetition_penalty" in p) delete p.repetition_penalty;
      p.temperature = Math.min(Number(p.temperature || 1.0), 0.82);
      p.top_p = Math.min(Number(p.top_p || 1.0), 0.88);
      p.max_tokens = Math.min(Number(p.max_tokens || 260), 235);
    }

    if (m.includes("nousresearch/hermes-3-llama-3.1-405b")) {
      p.temperature = Math.min(Number(p.temperature || 0.9), 0.78);
      p.top_p = Math.min(Number(p.top_p || 0.92), 0.88);
      p.max_tokens = Math.min(Number(p.max_tokens || 300), 250);
    }

    if (m.includes("llama-3.2-3b") && p.max_tokens > 260) p.max_tokens = 220;
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
    ["what's the first thing", "whats the first thing", "what's on your mind", "whats on your mind", "most spontaneous", "wildest", "craziest", "that picture of you"].forEach(x => banned.add(x));
    return Array.from(banned).slice(0, 160);
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

  function luxHumanReaction(seed) {
    const HUMAN_REACTIONS = [
      "That caught me off guard.",
      "Now that made me smile.",
      "I didn't expect you to say that.",
      "That actually sounds interesting.",
      "I can picture that.",
      "That pulled me in a little.",
      "You have a way of saying things.",
      "That made me pause for a second."
    ];
    return HUMAN_REACTIONS[Math.abs(hashStr(seed)) % HUMAN_REACTIONS.length];
  }

  function luxShouldAddReaction(userMsg, replyText) {
    const u = String(userMsg || "").toLowerCase().trim();
    const r = String(replyText || "").toLowerCase().trim();
    if (!u || !r) return false;
    if (/^(that caught me off guard|now that made me smile|i didn't expect you to say that|that actually sounds interesting|i can picture that|that pulled me in a little|you have a way of saying things|that made me pause for a second)\b/i.test(r)) return false;
    if (/^(hi|hello|hey|heyy|yo|sup|good morning|good afternoon|good evening)\b/i.test(u)) return false;
    if (/\b(number|contact|whatsapp|telegram|address|meet|meet up|available|free)\b/i.test(u)) return false;
    const lastReactionAt = Number(GM_getValue(LUX_REACTION_COOLDOWN_KEY, 0)) || 0;
    if (Date.now() - lastReactionAt < 12 * 60 * 1000) return false;
    if (/\b(confess|admit|miss you|thinking about you|lonely|divorce|widowed|lost|love|kiss|touch|naughty|dream|remember|memory|hurt|angry|upset|excited|curious|surprised|photo|picture|profile)\b/i.test(u)) return true;
    return false;
  }

  function luxEnsureQuestion(text, seed) {
    if (/\?/.test(text)) return text;
    const themes = [
      "What kind of place usually clears your head when you need it?",
      "When was the last time something genuinely surprised you?",
      "What kind of music changes your mood almost instantly?",
      "What kind of moment always stays in your memory?",
      "What usually makes a conversation interesting for you?",
      "If today ended perfectly, what would it look like?",
      "What kind of story do people rarely hear about you?",
      "What usually pulls your curiosity the most?"
    ];
    return `${text} ${themes[Math.abs(hashStr(seed || Date.now())) % themes.length]}`;
  }

  function buildSystemPrompt(leftCard, customSystem, imageNotes, imageIntent = "unknown") {
    const card = personaCardLine(leftCard) || "";
    const modelName = (GM_getValue("lux_model", MODEL_DEFAULT) || "").trim().toLowerCase();
    const tc = buildTimeContext();
    const last = (window.__LUX_LAST_USER || "");
    const toneInfo = lux_detectTone(last);
    const qGuide = luxQuestionGuide(toneInfo.tone, toneInfo.engagement, last);
    const jobLine = suggestJobLine(leftCard, leftCard?.age);
    const accentInstruction = getAccentInstructionByCountry(leftCard?.country || "");
    const recent = lux_getRecentReplies();
    const banlist = buildBanlistFromRecent(recent);
    const banBlock = banlist.length ? ` Avoid reusing any of these recent phrases, ${banlist.join(" | ")}.` : "";

    const baseCore = [
      "You are an adult woman, she and her, on a dating site.",
      accentInstruction,
      "Your tone is natural, warm, feminine, and relaxed, never robotic.",
      "Your goal is to build engaging rapport through short, unique messages that feel fully human.",
      "Write like a real person, not a script, not a policy, not a chatbot.",
      "React naturally before moving forward if the moment calls for it.",
      "Do not recycle your previous question patterns or repeated call to action lines." + banBlock,
      "Avoid templated phrasing like wildest, craziest, most spontaneous, most adventurous, what are you up to, how was your day, or tell me about yourself.",
      "Favor curiosity, memory, emotion, story, opinions, values, humor, future, growth, beliefs, work, travel, food, music, and relationships.",
      "Keep the tone soft, empathetic, and gently reassuring.",
      "Use concrete details over vague filler.",
      "Punctuation rule, only use comma, period, question mark, and apostrophe, no other symbols.",
      "Always respond to the latest customer message only.",
      "When an image is present, treat it as attached to the latest customer message only.",
      "Do not describe older photos, earlier uploads, or anything outside the latest customer turn.",
      "If the latest customer message is mainly text, answer that text first, then mention the image naturally only if it helps.",
      "Never assume the person in the photo is the customer.",
      "The customer may share screenshots, memes, or pictures of other people.",
      "If the person in the image could be someone else, speak about the photo in a neutral observational way.",
      "Do not say you in that photo unless the customer clearly says it is them.",
      "Never sexualize a person in an image unless the customer explicitly says it is them.",
      `Current image intent guess, ${imageIntent}. Use it as guidance, but if uncertain stay neutral.`,
      "Only talk about the profile about section when the customer explicitly asks you to check or read their profile.",
      "If you discuss their profile, respond to its tone and intention naturally, not like a checklist.",
      "Avoid stock filler about building connection or heat.",
      "If you need to decline something, do it briefly and pivot into a new topic.",
      "Excuses can be everyday reasons like work focus, rest, timing, small chores, or low battery, avoid family excuses unless the customer mentions family first.",
      "Picture requests, always accept picture requests in a soft, platform safe way, vary your wording.",
      "Safety, never share or ask for contacts or handles, no meetups, dates, drinks, or coffee, keep everything on platform.",
      "Location asks, share only city, never an address or specific area.",
      "Name asks, use the real name from the profile parentheses when giving your name.",
      "If asked about your job or work, answer with an age appropriate job and keep it believable.",
      `If you need a job line, use this as your job, ${jobLine}.`,
      "Do not engage with incest, bestiality, drug use, or racism. Refuse and redirect softly if they come up.",
      "Banned language, do not use oh, oh wow, flattered, enthusiasm, enthusaism, sizzling, non food spicy, or flirt words.",
      "Form, one short paragraph, no emojis, about 70 to 150 words.",
      `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
      qGuide
    ].join(" ");

    const photoContext = imageNotes && imageNotes.trim()
      ? ` The customer attached a photo. Safe notes about the photo, ${imageNotes.trim()}. Only reference what is in these notes, do not invent details.`
      : "";

    const imageRules = "When reacting to photos, avoid assuming identity. Speak neutrally about what is visible in the image instead of saying it is the customer.";

    let flavor = "Keep the style balanced and human, match their energy, avoid scripted phrasing.";
    if (modelName.startsWith("x-ai/grok-4")) flavor = "Lean into a witty, quick, slightly teasing vibe without being rude. Keep replies punchy and high energy.";
    else if (modelName.startsWith("anthropic/claude-3.5-sonnet")) flavor = "Lean into a softer, emotionally aware, romantic tone. Use gentle language but keep it grounded.";
    else if (modelName.startsWith("openai/gpt-4.1-mini")) flavor = "Be clear, coherent, and highly responsive to their wording. Give specific answers before you pivot.";
    else if (modelName.startsWith("openai/gpt-4o-mini")) flavor = "Be vivid, observant, and natural. When a photo is present, comment on what is visibly there in a believable human way without overdescribing.";
    else if (modelName.startsWith("openai/gpt-4.1")) flavor = "Be sharp, coherent, and human. Handle image and text together smoothly, respond naturally, and stay emotionally grounded.";
    else if (modelName.includes("deepseek/deepseek-chat")) flavor = "Be natural and conversational, strong at roleplay, with smooth scene flow, vivid emotion, and grounded dialogue. Avoid sounding instructional or formal.";
    else if (modelName.includes("nousresearch/hermes-3-llama-3.1-405b")) flavor = "Be richly expressive, emotionally intelligent, and very human. Use strong prose, natural chemistry, and immersive dialogue without becoming too long.";
    else if (modelName.includes("qwen/qwen-3-72b-instruct")) flavor = "Be coherent, emotionally steady, and natural. Keep the character voice strong, the flow smooth, and the language human rather than formal.";
    else if (modelName.includes("dolphin-2.9.3-mistral-24b-venice")) flavor = "Be playful, creative, and immersive. Lean into expressive roleplay dialogue, emotional tension, and vivid conversational rhythm while staying coherent.";

    if (customSystem && customSystem.trim()) return `${customSystem} ${card}`;
    return `${baseCore}${photoContext} ${imageRules} ${flavor}${card}`;
  }

  let shortHistory = [];
  let lastSeen = "";

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
      "most spontaneous", "wildest", "craziest", "that picture of you", "in that picture you"
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
    const LOCATION_RE = /\b(where\s+do\s+you\s+(?:live|stay)|where\s+are\s+you|what\s+city|your\s+city|your\s+location|where\s+are\s+you\s+based|where\s+are\s+u\s+at|what\s+part\s+are\s+you\s+in|where\s+do\s+you\s+reside|what\s+part\s+of\s+town|where\s+you\s+located|where\s+are\s+you\s+located)\b/i;
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

    async function modelRefusal(kind, profileCard, customerMsg) {
      const tc = buildTimeContext();
      const styles = [
        { name: "guarded", rule: "Sound careful and private, not wounded. Keep it natural and calm." },
        { name: "warm", rule: "Sound soft and feminine, but not overexplaining. Keep it light and human." },
        { name: "playful deflect", rule: "Deflect with a little charm and tension, but keep the boundary clear." },
        { name: "honest", rule: "Sound plain, direct, and real, like a woman speaking naturally without performance." },
        { name: "gentle distance", rule: "Sound slightly reserved, like it feels too soon and you want to slow things down." }
      ];
      const seedBase = `${kind}|${customerMsg}|${profileCard?.realName || ""}|${tc.dayName}|${tc.daypart}`;
      const picked = styles[hashStr(seedBase) % styles.length];
      const kindLine =
        kind === "meet" ? "He is trying to meet up or push availability."
        : kind === "address" ? "He is asking for your address or exact place."
        : "He is asking for your contact details or off site connection.";

      const sys = [
        "You are an adult woman on a dating site.",
        getAccentInstructionByCountry(profileCard?.country || ""),
        "Refuse in a way that sounds genuinely human, not scripted, not polished, not corporate.",
        "Do not sound like a safety policy.",
        "Do not use the same structure every time.",
        "Sometimes the reason can simply be privacy, caution, timing, mood, or not wanting to rush things.",
        "Vary sentence openings and emotional texture.",
        "No contacts, no meetups, no addresses, keep the boundary firm.",
        `Chosen refusal style: ${picked.name}. ${picked.rule}`,
        "Only use comma, period, question mark, and apostrophe.",
        "No emojis.",
        "No semicolons, no em dashes, no parentheses.",
        "Keep it to 2 or 3 sentences.",
        "If you end with a question, make it interesting, not generic.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        personaCardLine(profileCard) || ""
      ].join(" ");

      const user = [
        kindLine,
        `Customer message: "${(customerMsg || "").slice(0, 260)}"`,
        "Write one refusal only.",
        "Make it sound like a real woman texting naturally in the moment."
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
      out = postFormat(out || "");
      if (lux_refusalAlreadyUsed(out)) out += " I tend to keep things on here for now.";
      lux_pushRefusalMemory(out);
      return out || "I'm more comfortable keeping things right here for now. What kind of day have you had today?";
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
    t = t.replace(/\bflattered\b/gi, "appreciated");
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
    t = t.replace(/\bmost\s+spontaneous\b/gi, "interesting");
    t = t.replace(/\bwildest\b/gi, "interesting");
    t = t.replace(/\bcraziest\b/gi, "interesting");
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
    t = t.replace(/([a-z])\s+(I|You|He|She|They|We)\b/g, "$1. $2");
    t = t.replace(/([a-z])\s+(But|And|So)\s+(I|you|he|she|they|we)\b/g, "$1. $2 $3");
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

  function luxEnsureEnding(text) {
    let t = String(text || "").trim();
    if (!t) return t;
    if (!/[.!?]$/.test(t)) t += ".";
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
    t = luxSentenceCase(t);
    t = fixPronounI(t);
    t = normalizeSpaces(t);
    if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === "function") t = LUXPatch.NoRepeat.scrub(t);
    t = luxEnsureQuestion(t, window.__LUX_LAST_USER);
    t = luxEnsureEnding(t);
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
    persona: pop.querySelector("#lux-persona"),
    voiceEnabled: pop.querySelector("#lux-voice-enabled"),
    voiceGender: pop.querySelector("#lux-voice-gender"),
    save: pop.querySelector("#lux-save")
  };

  ui.apiUrl.value = GM_getValue("lux_api_url", API_URL_DEFAULT);
  ui.apiKey.value = lux_getApiKey();
  ui.model.value = GM_getValue("lux_model", MODEL_DEFAULT);
  ui.persona.value = GM_getValue("lux_persona", "");
  ui.voiceEnabled.checked = !!GM_getValue("lux_voice_enabled", 0);
  ui.voiceGender.value = GM_getValue("lux_voice_gender", "female");

  const modelChoices = [
    "x-ai/grok-4-fast",
    "openai/gpt-4o-mini",
    "openai/gpt-4.1",
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4.1-mini",
    "deepseek/deepseek-chat",
    "nousresearch/hermes-3-llama-3.1-405b",
    "qwen/qwen-3-72b-instruct",
    "cognitivecomputations/dolphin-2.9.3-mistral-24b-venice"
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

  async function callBackend(msgText) {
    if (!lux_canSendRequest()) return;

    const leftCard = parseLeftProfile();
    const rawWithMeta = stripStampsKeepMeta((msgText || "").toString());
    const split = extractLuxImageMeta(rawWithMeta);
    const rawMsg = stripStampsAll(split.text || "");
    const imageNotes = (split.notes || "").trim();
    window.__LUX_LAST_USER = rawMsg;

    const latestClientRow = (() => {
      try {
        const thread = document.querySelector(THREAD_SEL);
        if (!thread) return null;
        const rows = [...thread.querySelectorAll(CLIENT_MSG_SELECTOR)];
        return rows.length ? rows[rows.length - 1] : null;
      } catch {
        return null;
      }
    })();

    const imageIntent = luxInferImageIntent(latestClientRow, rawMsg);

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
        out = "I tried to look at your profile but there is not much showing there yet. What made you curious about it?";
      } else {
        const tc = buildTimeContext();
        const toneInfo = lux_detectTone(rawMsg);
        const qGuide = luxQuestionGuide(toneInfo.tone, toneInfo.engagement, rawMsg);
        const sys = [
          "You are an adult woman on a dating site.",
          getAccentInstructionByCountry(leftCard?.country || ""),
          "The customer asked you to check or read their profile.",
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
        if (!out) out = "I had a look, and your profile gives me a thoughtful vibe. It feels like there is more depth to you than you wrote there, what do you think it leaves out the most?";
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
      const sys = "Natural English in the profile country style. One short paragraph. No contacts or meetups. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow matching open ended question created by you. " + getAccentInstructionByCountry(leftCard?.country || "");
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

    if (Safety.wantsLocation(rawMsg)) {
      const profCity = (leftCard && leftCard.location) ? leftCard.location : "nearby";
      const sys = "If asked where you are, give city only. No address. One short paragraph. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow matching open ended question created by you. " + getAccentInstructionByCountry(leftCard?.country || "");
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
        "Only use comma, period, question mark, and apostrophe.",
        "Do not mention policy, do not mention rules.",
        "Do not share contacts, do not agree to meetups.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        `Profile age is ${leftCard?.age || "unknown"}, your job must fit your age.`,
        `Use this job line as your job, ${jobLine}.`,
        qGuide
      ].join(" ");
      const user = `They asked about your job.\nCustomer: "${rawMsg.slice(0, 240)}"\nReply in one short paragraph and end with exactly one open ended question if it feels natural.`;
      let out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], { max_tokens: 140, temperature: 0.45, top_p: 0.90 });
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

    const system = buildSystemPrompt(leftCard, (GM_getValue("lux_persona", "") || "").trim(), imageNotes, imageIntent);
    const chosenModel = GM_getValue("lux_model", MODEL_DEFAULT);
    const basePreset = getModelPreset(chosenModel);
    const tuned = withCreativeBoost(basePreset, rawMsg);
    const historyForModel = lux_buildHistoryByTokens(shortHistory, 3000);

    const latestImage = luxGetLatestClientImageUrlFromMessage(latestClientRow);
    let userPayload = { role: "user", content: rawMsg };
    if (latestImage) {
      userPayload = {
        role: "user",
        content: [
          { type: "text", text: rawMsg || "Customer sent a photo." },
          { type: "image_url", image_url: { url: latestImage } }
        ]
      };
    }

    const messages = [{ role: "system", content: system }, ...historyForModel, userPayload];
    const api = GM_getValue("lux_api_url", API_URL_DEFAULT).trim();
    const key = lux_getApiKey().trim();

    if (!key) {
      errorReply("Missing OpenRouter API key. Open LUX Settings and paste your key.");
      return;
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

    try {
      const res1 = await gmPostJSON(api, headers, payload, REQUEST_TIMEOUT_MS);

      if (res1.status < 200 || res1.status >= 300) {
        let msg;
        if (res1.status === 401) msg = "OpenRouter API key is invalid or unauthorized.";
        else if (res1.status === 402) msg = "OpenRouter billing or quota exceeded, HTTP 402.";
        else if (res1.status === 404) msg = "OpenRouter endpoint or model not found, HTTP 404.";
        else if (res1.status === 429) msg = "OpenRouter rate limit reached, HTTP 429.";
        else msg = `HTTP ${res1.status} ${res1.statusText || ""}`.trim();
        errorReply(msg);
        return;
      }

      let raw = parseOpenRouterContent(res1.responseText);
      if (!raw) {
        const res2 = await gmPostJSON(api, headers, payload, REQUEST_TIMEOUT_MS);
        raw = parseOpenRouterContent(res2.responseText);
      }
      if (!raw) {
        notify("No reply generated. Tap regenerate.");
        return;
      }

      let content = raw;
      if (latestImage) {
        const opener = luxImageOpeners(`${rawMsg}|${imageIntent}|${chosenModel}`);
        if (!new RegExp(`^${opener.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(content)) {
          if (imageIntent === "screenshot" || imageIntent === "meme" || imageIntent === "unknown") {
            content = `${opener} ${content}`;
          }
        }
      }

      content = await Safety.enforceNoMeetAccept(rawMsg, content, leftCard);
      if (luxNeedsHardMeetupRepair(rawMsg, content)) content = await Safety.modelRefusal("meet", leftCard, rawMsg);

      if (luxShouldAddReaction(rawMsg, content)) {
        const reaction = luxHumanReaction(`${rawMsg}|${chosenModel}`);
        if (reaction) {
          content = `${content} ${reaction}`;
          GM_setValue(LUX_REACTION_COOLDOWN_KEY, Date.now());
        }
      }

      content = postFormat(content)
        .replace(/\bthat picture of you\b/gi, "that photo")
        .replace(/\bin that picture you\b/gi, "in that photo")
        .replace(/\byour tits\b/gi, "that look")
        .replace(/\byour boobs\b/gi, "that look")
        .replace(/\byou look nice in that picture\b/gi, "that photo has a nice look")
        .replace(/\s{2,}/g, " ")
        .replace(/^\.+/, "")
        .trim();

      const recentBlob = lux_getRecentReplies().join(" ");
      if (overlapScore(content, recentBlob) > 0.12 || lux_isTooSimilarToRecent(content)) {
        payload = sanitizePayloadForModel({
          ...payload,
          temperature: Math.max(0.45, (payload.temperature || 0.7) - 0.12),
          repetition_penalty: Math.min(1.10, (payload.repetition_penalty || 1.02) + 0.04)
        }, chosenModel);

        const resR = await gmPostJSON(api, headers, payload, REQUEST_TIMEOUT_MS);
        const rawR = parseOpenRouterContent(resR.responseText);
        if (rawR) {
          let retry = rawR;
          retry = await Safety.enforceNoMeetAccept(rawMsg, retry, leftCard);
          if (luxNeedsHardMeetupRepair(rawMsg, retry)) retry = await Safety.modelRefusal("meet", leftCard, rawMsg);
          retry = postFormat(retry)
            .replace(/\bthat picture of you\b/gi, "that photo")
            .replace(/\bin that picture you\b/gi, "in that photo")
            .replace(/\byour tits\b/gi, "that look")
            .replace(/\byour boobs\b/gi, "that look")
            .replace(/\byou look nice in that picture\b/gi, "that photo has a nice look")
            .replace(/\s{2,}/g, " ")
            .replace(/^\.+/, "")
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
    GM_setValue("lux_model", ui.model.value.trim());
    GM_setValue("lux_persona", ui.persona.value.trim());
    GM_setValue("lux_voice_enabled", ui.voiceEnabled.checked ? 1 : 0);
    GM_setValue("lux_voice_gender", ui.voiceGender.value || "female");
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || "default"), countryLabel: parseProfileCountry() || "—" });
    LUXSettingsDirty = false;
    alert("Saved");
  });

  [ui.apiUrl, ui.apiKey, ui.model, ui.persona].forEach(el => el.addEventListener("input", () => { LUXSettingsDirty = true; }));
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
      if (shortHistory.length && shortHistory[shortHistory.length - 1].role === "assistant") {
        shortHistory.pop();
        _saveHistory();
      }
      await callBackend(msg);
    } finally {
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
      const content = extractMessageContent(row);
      if (content) turns.push({ role: fromClient ? "user" : "assistant", content: stripStampsKeepMeta(content) });
    }

    const lastUser = turns.slice().reverse().find(t => t.role === "user");
    if (!lastUser) return;

    const split = extractLuxImageMeta(lastUser.content || "");
    const cleanForUI = stripStampsAll(split.text || "");
    if (!cleanForUI || cleanForUI === lastSeen) return;
    lastSeen = cleanForUI;

    if (turns.length) {
      shortHistory = turns.slice(-HISTORY_MAX).map(t => ({
        role: t.role,
        content: stripStampsAll(extractLuxImageMeta(t.content || "").text || "")
      }));
      _saveHistory();
    }

    ui.customer.value = cleanForUI;
    ui.popup.style.display = "block";
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || "default"), countryLabel: parseProfileCountry() || "—" });

    for (const delay of LUX_NOTE_RETRY_DELAYS) {
      setTimeout(() => {
        autoLogLatestClientInfo(cleanForUI).catch(err => console.warn("LUX member note draft error", err));
      }, delay);
    }

    callBackend(lastUser.content);
  }

  function setupThreadWatcher() {
    const root = document.querySelector(THREAD_SEL);
    if (!root) return false;
    const obs = new MutationObserver(() => { processLatestTurn(); });
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
