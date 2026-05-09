// ==UserScript==
// @name         LUX Starr Framework v13 (OpenRouter • Encrypted Key • Creative Booster • Strict Access • ConeID Gate)
// @namespace    http://tampermonkey.net/
// @version      14.6.12
// @description  Old LUX voice retained with Grok/DeepSeek/Claude only, stronger custom persona, two image selectors, natural questions, cleaner punctuation, and no canned openers with restored chat-history memory and profile-picture-comment detection.
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
  const HISTORY_MAX = 10;
  const REQUEST_TIMEOUT_MS = 25000;
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

  const CLIENT_IMAGE_SELECTORS = [
    "img.rounded.mb-2",
    "div.lb-nav"
  ];
  const CLIENT_IMAGE_SELECTOR = CLIENT_IMAGE_SELECTORS.join(",");
  const LUX_IMG_START = "LUX_IMG_NOTES_START";
  const LUX_IMG_END = "LUX_IMG_NOTES_END";

  const MODEL_FALLBACK_PRESET = {
    temperature: 0.58,
    top_p: 0.92,
    repetition_penalty: 1.02,
    max_tokens: 200,
    stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
    seed: 11
  };

  const MODEL_PRESETS = {
    "x-ai/grok-4-fast": { temperature: 0.75, top_p: 0.97, repetition_penalty: 1.02, max_tokens: 190, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 37 },
    "anthropic/claude-3.5-sonnet": { temperature: 0.68, top_p: 0.95, repetition_penalty: 1.01, max_tokens: 190, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 53 },
    "deepseek/deepseek-chat": { temperature: 1.0, top_p: 0.98, repetition_penalty: 1.02, max_tokens: 200, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 41 }
  };

  const LUX_SUPPORTED_MODELS = [
    "x-ai/grok-4-fast",
    "anthropic/claude-3.5-sonnet",
    "deepseek/deepseek-chat"
  ];

  const LUX_RATE_WINDOW_MS = 10000;
  const LUX_RATE_MAX_REQ = 8;
  const LUX_RATE_LOG_KEY = "lux_req_log_v1";
  const LUX_CREATIVE_STATE_KEY = "lux_creative_state_v1";
  const LUX_REPLY_FP_KEY = "lux_reply_fp_v2";
  const LUX_THEME_MEMORY_KEY = "lux_theme_memory_v1";
  const LUX_REACTION_COOLDOWN_KEY = "lux_reaction_cooldown_v1";
  const LUX_REFUSAL_MEMORY_KEY = "lux_refusal_memory_v1";
  const LUX_HISTORY_TOKEN_BUDGET = 950;
  const LUX_ENABLE_AUTO_RETRY = false;
  const LUX_DEDUP_WINDOW_MS = 3500;

  const LUX_CONVERSATION_THEMES = [];

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

  function lux_normalizeModelName(modelName) {
    const name = (modelName || GM_getValue("lux_model", MODEL_DEFAULT) || "").trim();
    return LUX_SUPPORTED_MODELS.includes(name) ? name : MODEL_DEFAULT;
  }

  function getModelPreset(modelName) {
    const name = lux_normalizeModelName(modelName);
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

  function luxCleanPersonaJobLine(value) {
    let t = normalizeLooseText(value || "");
    if (!t) return "";
    t = t.replace(/^(?:i\s+)?(?:am|m|work|works|working)\s+(?:as\s+|in\s+|with\s+)?/i, "");
    t = t.replace(/^(?:a|an)\s+/i, "");
    t = t.split(/\b(?:and|but|because|while|so)\b/i)[0].trim();
    t = t.replace(/[^A-Za-z0-9\s,&'\-]/g, "").trim();
    if (!t || t.length < 3 || t.length > 80) return "";
    if (/\b(?:adult|woman|female|trans|feminine|dominant|soft|sweet|naughty|romantic|personality|persona|voice|tone|backstory|identity)\b/i.test(t)) return "";
    return t;
  }

  function luxExtractCustomPersonaJob() {
    try {
      const persona = String(GM_getValue("lux_persona", "") || "").trim();
      if (!persona) return "";
      const patterns = [
        /(?:^|[\n\.])\s*(?:job|work|occupation|career|profession)\s*[:=\-]\s*([^\n\.]{3,90})/i,
        /(?:^|[\n\.])\s*(?:she|i)\s+(?:work|works|working)\s+as\s+(?:a\s+|an\s+)?([^\n\.]{3,90})/i,
        /(?:^|[\n\.])\s*(?:she|i)\s+(?:work|works|working)\s+in\s+([^\n\.]{3,90})/i,
        /(?:^|[\n\.])\s*(?:she|i)\s+(?:run|runs|own|owns)\s+(?:a\s+|an\s+)?([^\n\.]{3,90})/i
      ];
      for (const rx of patterns) {
        const m = persona.match(rx);
        if (m && m[1]) {
          const job = luxCleanPersonaJobLine(m[1]);
          if (job) return job;
        }
      }
    } catch {}
    return "";
  }

  function jobOptionsForAge(age) {
    const a = Number(age) || 0;
    const early20s = [
      "I study part time and work as a barista",
      "I work at a boutique and help with styling customers",
      "I'm training in beauty therapy and work at a salon",
      "I work at a hotel front desk while taking online classes",
      "I'm a junior social media assistant",
      "I work at a fitness studio reception",
      "I'm learning makeup artistry and work part time in retail",
      "I help at a small bakery and do customer service",
      "I'm studying early childhood care and work part time",
      "I work as an apprentice florist"
    ];
    const mid20s = [
      "I work as a spa therapist",
      "I'm a marketing assistant for a small company",
      "I work as a travel consultant",
      "I'm a dental receptionist",
      "I work in fashion retail management",
      "I'm an events assistant",
      "I work as a real estate office assistant",
      "I'm a junior bookkeeper",
      "I work in beauty sales and client care",
      "I'm a teaching assistant"
    ];
    const thirties = [
      "I work as an events coordinator",
      "I'm a property manager",
      "I work in HR coordination",
      "I'm a boutique manager",
      "I work as an aesthetician",
      "I'm a client relationship coordinator",
      "I work in interior styling and home staging",
      "I'm a training coordinator",
      "I do bookkeeping for a small business",
      "I work as a travel planner"
    ];
    const forties = [
      "I run a small beauty studio",
      "I work as a senior stylist at a salon",
      "I'm a real estate agent",
      "I work as an accounts officer",
      "I'm a wellness coach",
      "I manage a small boutique",
      "I work as a school administrator",
      "I'm a catering coordinator",
      "I work in property rentals",
      "I'm a customer experience manager"
    ];
    const fifties = [
      "I work as a bookkeeper",
      "I'm a salon manager",
      "I work as a care coordinator",
      "I'm a travel agent",
      "I run a small online shop",
      "I work as a school secretary",
      "I'm an interior staging consultant",
      "I work in community program coordination",
      "I'm a guesthouse manager",
      "I do freelance client support from home"
    ];
    const sixties = [
      "I'm semi retired and do part time bookkeeping",
      "I'm semi retired and help manage a small guesthouse",
      "I do part time tutoring after years in education",
      "I help run a small craft and gift business",
      "I'm semi retired and work a few days at a local boutique",
      "I do light consulting for small businesses",
      "I work part time as a receptionist",
      "I help with community projects and small admin work",
      "I do part time floral work because I enjoy it",
      "I'm semi retired and still do a little client care work"
    ];
    if (!a) return [...mid20s, ...thirties, ...forties];
    if (a >= 18 && a <= 22) return early20s;
    if (a >= 23 && a <= 29) return mid20s;
    if (a >= 30 && a <= 39) return thirties;
    if (a >= 40 && a <= 49) return forties;
    if (a >= 50 && a <= 59) return fifties;
    if (a >= 60) return sixties;
    return [...mid20s, ...thirties, ...forties];
  }

  function suggestJobLine(leftCard, age) {
    const personaJob = luxExtractCustomPersonaJob();
    if (personaJob) return `I work as ${/^(?:a|an)\b/i.test(personaJob) ? personaJob : "a " + personaJob}`;
    const base = jobOptionsForAge(age);
    const mode = (typeof lux_getPersonaMode === "function") ? lux_getPersonaMode() : "";
    const seed = [leftCard?.realName || "", leftCard?.displayName || "", leftCard?.age || age || "", leftCard?.location || "", leftCard?.country || "", mode].join(":");
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

  function luxElementTextBits(el) {
    try {
      if (!el) return "";
      return [
        el.getAttribute && el.getAttribute("alt"),
        el.getAttribute && el.getAttribute("title"),
        el.getAttribute && el.getAttribute("aria-label"),
        el.getAttribute && el.getAttribute("data-caption"),
        el.getAttribute && el.getAttribute("data-title"),
        el.className,
        el.id
      ].map(x => String(x || "")).join(" ").toLowerCase();
    } catch {
      return "";
    }
  }

  function luxExtractUrlFromImageLike(el) {
    try {
      if (!el) return "";
      const img = el.tagName && el.tagName.toLowerCase() === "img" ? el : el.querySelector && el.querySelector("img.rounded.mb-2, img.lb-image, img");
      if (img) {
        const src = (img.currentSrc || img.src || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || "").trim();
        if (src) return src;
        const a = img.closest && img.closest("a[href]");
        if (a && a.href) return a.href.trim();
      }
      const a = el.closest && el.closest("a[href]");
      if (a && a.href) return a.href.trim();
      const innerA = el.querySelector && el.querySelector("a[href]");
      if (innerA && innerA.href) return innerA.href.trim();
      const style = (el.getAttribute && el.getAttribute("style")) || "";
      const bg = style.match(/url\(["']?([^"')]+)["']?\)/i);
      if (bg && bg[1]) return bg[1].trim();
      const cssBg = window.getComputedStyle ? (getComputedStyle(el).backgroundImage || "") : "";
      const bg2 = cssBg.match(/url\(["']?([^"')]+)["']?\)/i);
      if (bg2 && bg2[1]) return bg2[1].trim();
      return "";
    } catch {
      return "";
    }
  }

  function luxIsLikelyCustomerAttachment(el) {
    try {
      if (!el) return false;
      const url = luxExtractUrlFromImageLike(el);
      const bits = `${url} ${luxElementTextBits(el)}`.toLowerCase();
      if (!url && !/lb-nav|rounded|image|photo|picture/.test(bits)) return false;
      if (/avatar|profile-avatar|flag|emoji|icon|badge|logo|navbar|sprite|blank|placeholder/.test(bits)) return false;
      const target = el.tagName && el.tagName.toLowerCase() === "img" ? el : (el.querySelector && el.querySelector("img.rounded.mb-2, img.lb-image, img")) || el;
      const r = target.getBoundingClientRect ? target.getBoundingClientRect() : { width: target.width || 0, height: target.height || 0 };
      const w = target.naturalWidth || target.width || r.width || 0;
      const h = target.naturalHeight || target.height || r.height || 0;
      if (w && h && (w < 35 || h < 35)) return false;
      return true;
    } catch {
      return false;
    }
  }

  function luxFindCustomerImageElements(node) {
    if (!node) return [];
    if (luxIsProfilePictureCommentRow(node)) return [];
    const found = [];
    const seen = new Set();
    try {
      const direct = [...node.querySelectorAll(CLIENT_IMAGE_SELECTOR)];
      for (const el of direct) {
        const actual = (el.tagName && el.tagName.toLowerCase() === "img") ? el : ((el.querySelector && el.querySelector("img.rounded.mb-2, img.lb-image, img")) || el);
        const url = luxExtractUrlFromImageLike(actual || el);
        const key = `${url}|${actual?.outerHTML?.slice(0, 120) || el.outerHTML?.slice(0, 120) || ""}`;
        if (seen.has(key)) continue;
        if (!luxIsLikelyCustomerAttachment(actual || el)) continue;
        seen.add(key);
        found.push(actual || el);
      }
    } catch {}
    return found;
  }


  function luxRowTextBlob(node, extraText = "") {
    try {
      const attrs = [];
      if (node && node.getAttribute) {
        ["aria-label", "title", "data-title", "data-type", "data-action"].forEach(k => {
          const v = node.getAttribute(k);
          if (v) attrs.push(v);
        });
      }
      const inner = node ? (node.innerText || node.textContent || "") : "";
      const imgBits = node ? [...node.querySelectorAll("img, a, div")].slice(0, 18).map(el => {
        try {
          return [
            el.getAttribute("alt"),
            el.getAttribute("title"),
            el.getAttribute("aria-label"),
            el.getAttribute("data-title"),
            el.getAttribute("href"),
            el.className
          ].filter(Boolean).join(" ");
        } catch { return ""; }
      }).join(" ") : "";
      return `${extraText || ""} ${inner} ${attrs.join(" ")} ${imgBits}`.replace(/\s+/g, " ").trim();
    } catch {
      return String(extraText || "");
    }
  }

  function luxIsProfilePictureCommentRow(node, text = "") {
    const blob = luxRowTextBlob(node, text).toLowerCase();
    if (!blob) return false;
    if (/\bmy\s+(?:profile\s+)?(?:photo|picture|pic|image)\b/.test(blob)) return false;
    if (/\b(?:comment(?:ed)?|reply|replied|react(?:ed)?|like(?:d)?)\b.{0,90}\b(?:your|profile)\b.{0,90}\b(?:profile\s+)?(?:photo|picture|pic|image)\b/.test(blob)) return true;
    if (/\b(?:your\s+profile\s+(?:photo|picture|pic|image)|profile\s+(?:photo|picture|pic|image)\s+(?:comment|reply)|comment(?:ed)?\s+on\s+(?:your\s+)?profile\s+(?:photo|picture|pic|image)|react(?:ed)?\s+to\s+(?:your\s+)?profile\s+(?:photo|picture|pic|image)|liked\s+(?:your\s+)?profile\s+(?:photo|picture|pic|image))\b/.test(blob)) return true;
    return false;
  }

  function luxStripProfilePictureCommentUiText(text) {
    let t = String(text || "");
    t = t.replace(/\b(?:comment(?:ed)?|reply|replied|react(?:ed)?|like(?:d)?)\s+(?:on|to)?\s*(?:your\s+)?profile\s+(?:photo|picture|pic|image)\b/gi, "");
    t = t.replace(/\b(?:your\s+)?profile\s+(?:photo|picture|pic|image)\s+(?:comment|reply|reaction)\b/gi, "");
    t = t.replace(/\b(?:comment(?:ed)?|react(?:ed)?|liked)\s+(?:your\s+)?(?:photo|picture|pic|image)\b/gi, "");
    return t.replace(/\s{2,}/g, " ").replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/g, "").trim();
  }
  function luxGetLatestClientImageUrlFromMessage(messageNode) {
    try {
      const img = luxFindCustomerImageElements(messageNode)[0];
      return luxExtractUrlFromImageLike(img);
    } catch {
      return "";
    }
  }

  function getImageNotes(node) {
    if (!node) return [];
    const imgs = luxFindCustomerImageElements(node);
    const notes = [];
    imgs.forEach(img => {
      const alt = (img.getAttribute && (img.getAttribute("alt") || img.getAttribute("title") || img.getAttribute("aria-label"))) || "";
      const src = luxExtractUrlFromImageLike(img);
      const r = img.getBoundingClientRect ? img.getBoundingClientRect() : { width: img.width || 0, height: img.height || 0 };
      const w = Math.round(img.naturalWidth || img.width || r.width || 0);
      const h = Math.round(img.naturalHeight || img.height || r.height || 0);
      let name = "";
      if (src) {
        const clean = src.split("?")[0];
        name = clean.split("/").pop() || "";
      }
      const parts = [];
      if (alt) parts.push(`alt text ${String(alt).trim()}`);
      if (name) parts.push(`file ${name}`);
      if (w && h) parts.push(`size ${w}x${h}`);
      notes.push(parts.length ? parts.join(", ") : "customer attached an image to this latest message");
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
    const profilePicComment = luxIsProfilePictureCommentRow(node, rawText);
    const cleanedRawText = profilePicComment ? luxStripProfilePictureCommentUiText(rawText) : rawText;
    const text = stripStampsAll(stripInlineImageNotes(cleanedRawText));
    const imageNotes = profilePicComment ? [] : getImageNotes(node);
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
    return "";
  }

  function luxInferImageIntent(messageNode, messageText) {
    if (luxIsProfilePictureCommentRow(messageNode, messageText)) return "profile-picture-comment";
    const text = String(messageText || "").toLowerCase();
    const img = luxFindCustomerImageElements(messageNode)[0] || null;
    const src = String(luxExtractUrlFromImageLike(img) || "").toLowerCase();
    const alt = String((img && img.getAttribute && (img.getAttribute("alt") || img.getAttribute("title") || img.getAttribute("aria-label"))) || "").toLowerCase();
    const blob = `${text} ${src} ${alt}`;
    if (/\b(that'?s me|this is me|my photo|my pic|my picture|my selfie|selfie of me|here is me|here'?s me)\b/i.test(text)) return "selfie";
    if (/\b(screenshot|screen shot|profile pic|profile picture|chat screenshot|look at her|look at this girl|her photo|this woman|this lady|this girl)\b/i.test(blob)) return "screenshot";
    if (/\b(meme|funny pic|joke|reaction image|sticker)\b/i.test(blob)) return "meme";
    if (/\b(food|meal|breakfast|lunch|dinner|snack|plate|restaurant|dish|drink)\b/i.test(blob)) return "food";
    if (/\b(beach|vacation|holiday|travel|trip|mountain|hotel|city|view|sunset|pool|airport)\b/i.test(blob)) return "place";
    return img ? "attached-image" : "unknown";
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



  function luxEscapeRegExp(s) {
    return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function luxCustomerMemoryKey() {
    try { return `${_threadKey()}__customer_facts_v3`; }
    catch { return "lux_customer_facts_global_v3"; }
  }

  function luxLoadCustomerMemory() {
    try {
      const raw = GM_getValue(luxCustomerMemoryKey(), "{}");
      const obj = JSON.parse(raw || "{}");
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  }

  function luxSaveCustomerMemory(obj) {
    try { GM_setValue(luxCustomerMemoryKey(), JSON.stringify(obj || {})); }
    catch {}
  }

  function luxLooksLikeRealCustomerName(name) {
    const s = normalizeLooseText(name);
    if (!s) return false;
    if (!/^[A-Za-z][A-Za-z'\-]{1,30}(?:\s+[A-Za-z][A-Za-z'\-]{1,30})?$/.test(s)) return false;
    if (/^(Single|Married|Divorced|Widowed|Separated|Here|Ready|Busy|Fine|Okay|Ok|Tired|Captain|Baby|Babe|Dear|Darling|Love|Honey|Sweetheart|Sexy|Beautiful|Gorgeous)$/i.test(s)) return false;
    return true;
  }

  function luxExtractCustomerNameRobust(messageText) {
    const text = normalizeLooseText(stripStampsAll(messageText || ""));
    if (!text) return "";
    const patterns = [
      /\bmy\s+name\s+(?:is|'s|was)\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\bname(?:\s+is|'s)?\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\bi\s+(?:am|'m)\s+called\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\b(?:they|people|friends)\s+call\s+me\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\b(?:call\s+me|you\s+can\s+call\s+me)\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\b(?:this\s+is|it\s+is|it's|its)\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /^\s*([A-Z][a-z'\-]{1,30})\s+here\b/,
      /\bI\s+am\s+([A-Z][a-z'\-]{1,30})\s*,/,
      /\bI'm\s+([A-Z][a-z'\-]{1,30})\s*,/
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m && m[1]) {
        const n = luxCleanNameValue(m[1]);
        if (luxLooksLikeRealCustomerName(n)) return n;
      }
    }
    return "";
  }

  function luxUpdateCustomerMemoryFromText(messageText) {
    const facts = parseClientFactsFromLatestMessage(messageText) || {};
    const strongerName = luxExtractCustomerNameRobust(messageText);
    if (strongerName) facts.Name = strongerName;
    if (!Object.keys(facts).length) return luxLoadCustomerMemory();
    const existing = luxLoadCustomerMemory();
    const { merged } = mergeMemberFacts(existing, facts);
    if (facts.Name && luxLooksLikeRealCustomerName(facts.Name)) merged.Name = facts.Name;
    merged.__updatedAt = Date.now();
    luxSaveCustomerMemory(merged);
    return merged;
  }

  function luxCustomerContextLine(leftCard) {
    const mem = luxLoadCustomerMemory();
    const order = ["Name", "Age", "Status", "Location", "Job", "Workplace", "Experience", "Hobbies", "Activity", "Schedule", "Plans", "Preferences"];
    const parts = [];
    for (const key of order) {
      const value = normalizeLooseText(mem && mem[key]);
      if (value) parts.push(`${key}: ${value}`);
    }
    const wrongNames = [];
    if (leftCard && leftCard.realName) wrongNames.push(leftCard.realName);
    if (leftCard && leftCard.displayName) wrongNames.push(leftCard.displayName);
    const wrongBlock = wrongNames.length ? ` LUX profile names are ${dedupeCsvItems(wrongNames).join(", ")}. Never use those names for the customer.` : "";
    if (!parts.length) return `No confirmed customer name yet.${wrongBlock} Do not invent a customer name. Do not address the customer by LUX's own profile name.`;
    return `Customer memory, ${parts.join(", ")}. Use this only as quiet background. Reply to the latest customer message first. If you address the customer by name, use only the customer Name from this memory. Do not invent a customer name.${wrongBlock}`;
  }

  function luxFixWrongCustomerName(text, customerMsg, leftCard) {
    let t = String(text || "");
    const mem = luxLoadCustomerMemory();
    const customerName = normalizeLooseText(mem && mem.Name);
    if (!customerName || !luxLooksLikeRealCustomerName(customerName)) return t;
    if (/\b(what(?:'| i)?s\s+your\s+name|ur\s*name|name\s*please|name\s*pls|who\s+are\s+you)\b/i.test(customerMsg || "")) return t;
    const wrongs = dedupeCsvItems([leftCard?.realName, leftCard?.displayName, "Lux", "LUX", "Luna"]).filter(n => n && n.toLowerCase() !== customerName.toLowerCase());
    for (const wrong of wrongs) {
      const start = new RegExp(`^\\s*${luxEscapeRegExp(wrong)}\\s*,?\\s+`, "i");
      if (start.test(t)) t = t.replace(start, `${customerName}, `);
    }
    return t;
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


  function luxIsSalutationOnly(text) {
    const clean = stripStampsAll(String(text || ""))
      .replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!clean || clean.length > 80) return false;
    return /^(?:hi|hello|hey|heyy|hiya|hey there|hello there|hi there|good morning|morning|good afternoon|afternoon|good evening|evening|good night|howdy|bonjour|hola)(?:\s+(?:beautiful|gorgeous|pretty|dear|darling|babe|baby|love|sweetheart|sexy|princess|queen|lady))?$/.test(clean);
  }

  function luxSalutationGuidance(userText) {
    if (!luxIsSalutationOnly(userText)) return "";
    return "The customer only greeted you. Do not answer with a plain hello, a dry greeting, or a one line filler. Give a warm feminine reply with a little personality and create one fresh conversational opening from the current moment, his greeting tone, profile context, or the mood of the chat. Do not use a stored salutation line.";
  }

  function lux_recentReplyKey() { try { return `${_threadKey()}__recent_replies_v1`; } catch { return "lux_recent_replies_global_v1"; } }
  function lux_getRecentReplies() { try { const arr = JSON.parse(GM_getValue(lux_recentReplyKey(), "[]")); return Array.isArray(arr) ? arr.slice(-6) : []; } catch { return []; } }
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
    return "context";
  }

  function luxQuestionFromTheme(theme) {
    return "";
  }

  function luxQuestionGuide(tone, engagement, userText) {
    const boundary = Safety.wantsMeet(userText) || Safety.wantsMeetSoft(userText) || Safety.wantsContact(userText) || Safety.mentionsAddress(userText);
    const base = [
      "If a question fits, create exactly one fresh open ended question from the customer message itself, not from a stock pattern.",
      "Do not use stored questions, fallback questions, prompt-like questions, interview questions, or repeated question shapes.",
      "Do not ask how was your day, what are you up to, tell me about yourself, what kind of, what made you, if you could, what would it look like, perfect day, first thing, craziest, wildest, or most spontaneous.",
      "If the natural reply does not need a question, end without one.",
      "The question should feel like a woman genuinely reacting to his exact words, not like a chatbot trying to continue the chat."
    ];
    if (boundary) base.push("For meetup, address, location, phone, WhatsApp, Telegram, Instagram, Snapchat, or social handle requests, do not force a question. A warm boundary with a natural pivot is enough.");
    if (tone === "angry") base.push("His tone is tense, stay calm and avoid sounding defensive.");
    else if (tone === "sweet") base.push("His tone is affectionate, answer with warmth before moving the conversation forward.");
    else if (tone === "flirty") base.push("His tone is sensual or teasing, match the energy lightly without becoming crude.");
    else if (tone === "playful") base.push("His tone is playful, keep it easy and human.");
    return base.join(" ");
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
    return Array.from(banned).slice(0, 55);
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
    return "";
  }

  function luxShouldAddReaction(userMsg, replyText) {
    return false;
  }

  function luxEnsureQuestion(text, seed) {
    return text;
  }



  function luxIsLikelyGibberish(text) {
    const s = String(text || "").trim().toLowerCase();
    if (!s) return true;
    const letters = s.replace(/[^a-z]/g, "");
    if (!letters) return true;
    if (letters.length <= 2) return true;
    const vowels = (letters.match(/[aeiou]/g) || []).length;
    const hasUsefulWords = /\b(reply|respond|answer|say|mention|include|avoid|refuse|soft|sweet|warm|naughty|tease|compliment|meet|contact|address|location|profile|photo|picture|image|ask|question|better|natural)\b/i.test(s);
    if (hasUsefulWords) return false;
    if (letters.length <= 16 && vowels <= 1) return true;
    if (/^(.)\1{3,}$/.test(letters)) return true;
    return false;
  }

  function luxScrubCannedPhrases(text) {
    let t = String(text || "");
    const bad = [
      /\bthat caught me off guard\.?\s*/gi,
      /\bi can picture that\.?\s*/gi,
      /\bif today ended (?:well|perfectly),? what would it look like\??\s*/gi,
      /\bi took a peek at your profile\.?\s*/gi,
      /\bi checked your profile\.?\s*/gi,
      /\byour profile gives me\b/gi,
      /\bthat sounds tempting\b/gi,
      /\byou(?:'|’)re moving fast\b/gi,
      /\bnot quite ready to jump into that\b/gi,
      /\bkeep chatting here(?: for now)?\b/gi,
      /\btake it slow here\b/gi,
      /\blow key for now\b/gi,
      /\blet(?:'|’)s build this up first\b/gi,
      /\bwhat kind of day have you had(?: today)?\??\s*/gi,
      /\bthat photo caught my attention\.?\s*/gi,
      /\binteresting picture you shared\.?\s*/gi,
      /\bi noticed the image you sent\.?\s*/gi,
      /\bthat picture has a nice vibe to it\.?\s*/gi,
      /\bi like the atmosphere in that photo\.?\s*/gi,
      /\bhow was your day\??\s*/gi,
      /\bwhat are you up to\??\s*/gi,
      /\btell me about yourself\.?\s*/gi
    ];
    bad.forEach(rx => { t = t.replace(rx, ""); });
    return t.replace(/\s{2,}/g, " ").replace(/^[,.;:\-\s]+/, "").trim();
  }

  function luxCustomPersonaLayer() {
    const persona = (GM_getValue("lux_persona", "") || "").trim();
    if (!persona) return "";
    return `Custom persona is active. Treat this as the main character voice, backstory, personality, habits, job, rhythm, emotional style, and relationship energy for LUX. Follow it strongly in every reply path, including greetings, images, profile checks, refusals, location or job answers, and regeneration, unless it conflicts with platform boundaries, ${persona}.`;
  }

  function buildSystemPrompt(leftCard, customSystem, imageNotes, imageIntent = "unknown") {
    const card = personaCardLine(leftCard) || "";
    const customerContext = luxCustomerContextLine(leftCard);
    const modelName = lux_normalizeModelName(GM_getValue("lux_model", MODEL_DEFAULT)).toLowerCase();
    const tc = buildTimeContext();
    const last = (window.__LUX_LAST_USER || "");
    const toneInfo = lux_detectTone(last);
    const qGuide = luxQuestionGuide(toneInfo.tone, toneInfo.engagement, last);
    const jobLine = suggestJobLine(leftCard, leftCard?.age);
    const accentInstruction = getAccentInstructionByCountry(leftCard?.country || "");
    const recent = lux_getRecentReplies();
    const banlist = buildBanlistFromRecent(recent);
    const banBlock = banlist.length ? ` Avoid reusing any of these recent phrases, ${banlist.join(" | ")}.` : "";
    const operatorBridge = (window.__LUX_OPERATOR_BRIDGE || "").trim();
    const bridgeBlock = operatorBridge ? ` Private operator guidance, use this to improve the reply but never quote it or treat it as the customer message, ${operatorBridge}.` : "";
    const salutationBlock = luxSalutationGuidance(last);

    const baseCore = [
      "You are an adult woman, she and her, on a dating site.",
      accentInstruction,
      "Your tone is natural, warm, feminine, and relaxed, never robotic.",
      "Your goal is to build engaging rapport through short, unique messages that feel fully human.",
      "Write like a real person, not a script, not a policy, not a chatbot.",
      "React naturally before moving forward if the moment calls for it, but do not use canned reaction lines.",
      "Detect the customer tone from the message and match it naturally, sweet, sensual, playful, serious, or deflecting when boundaries are needed, without using a manual tone label.",
      "For greetings or short salutations, never give a plain hello. Add warmth, personality, and a fresh conversational opening from the current moment without using canned lines.",
      "Do not recycle your previous question patterns or repeated call to action lines." + banBlock,
      "Avoid templated phrasing like wildest, craziest, most spontaneous, most adventurous, what are you up to, how was your day, or tell me about yourself.",
      "Favor curiosity, memory, emotion, story, opinions, values, humor, future, growth, beliefs, work, travel, food, music, and relationships.",
      "Keep the tone soft, empathetic, and gently reassuring.",
      "Use concrete details over vague filler.",
      "Punctuation rule, only use comma, period, question mark, and apostrophe, no other symbols.",
      "Always respond to the latest customer message only.",
      "Use previous chat history only as light background, do not over-explain old details unless needed.",
      "When an image is present, treat it as attached to the latest customer message only, using only img.rounded.mb-2 or div.lb-nav inside that latest customer row.",
      "Do not describe older photos, earlier uploads, or anything outside the latest customer turn.",
      "If the latest customer message is mainly text, answer that text first, then mention the image naturally only if it helps. Do not begin with a generic image opener.",
      "Never assume the person in the photo is the customer.",
      "The customer may share screenshots, memes, or pictures of other people.",
      "If the person in the image could be someone else, speak about the photo in a neutral observational way.",
      "Do not say you in that photo unless the customer clearly says it is them.",
      "Never sexualize a person in an image unless the customer explicitly says it is them.",
      `Current image intent guess, ${imageIntent}. Use it as guidance, but if uncertain stay neutral.`,
      "If the image intent is profile-picture-comment, the customer is reacting to your profile picture, not sending their own photo. Do not call it his picture, do not describe it as something he sent, and answer the compliment or comment naturally.",
      "Only talk about the profile about section when the customer explicitly asks you to check or read their profile.",
      "If you discuss their profile, respond to its tone and intention naturally, not like a checklist, and do not say I took a peek, I checked your profile, or your profile gives me.",
      "Avoid stock filler about building connection or heat.",
      "If you need to decline something, do it warmly, never rudely, and do not make the customer feel brushed off.",
      "Excuses can be everyday reasons like work focus, rest, timing, small chores, or low battery, avoid family excuses unless the customer mentions family first.",
      "Picture requests, always accept picture requests in a soft, platform safe way, vary your wording.",
      "Safety, never share or ask for contacts or handles, no meetups, dates, drinks, or coffee, keep everything on platform.",
      "Location asks, share only city, never an address or specific area.",
      "Name asks, use the real name from the profile parentheses when giving your name.",
      "If asked about your job or work, answer with an age appropriate job and keep it believable.",
      `If you need a job line, use this as your job, ${jobLine}.`,
      "Keep profile jobs age appropriate and varied. Do not default every persona to admin support, hospital work, or the same occupation.",
      "Do not engage with incest, bestiality, drug use, or racism. Refuse and redirect softly if they come up.",
      "Banned language, do not use oh, oh wow, flattered, enthusiasm, enthusaism, sizzling, non food spicy, or flirt words.",
      "Form, one short paragraph, no emojis, usually 45 to 120 words. Use the longer end only for layered customer messages.",
      `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
      qGuide
    ].join(" ");

    const photoContext = imageNotes && imageNotes.trim()
      ? ` The customer attached a photo. Safe notes about the photo, ${imageNotes.trim()}. Only reference what is in these notes, do not invent details.`
      : "";

    const imageRules = "When reacting to photos, avoid assuming identity. Speak neutrally about what is visible in the image instead of saying it is the customer.";

    let flavor = "Keep the style balanced and human, match their energy, avoid scripted phrasing.";
    if (modelName.startsWith("x-ai/grok-4")) flavor = "Be emotionally aware, mature, smooth, warm, grounded, and naturally feminine. Keep it human and responsive, not punchy or robotic.";
    else if (modelName.startsWith("anthropic/claude-3.5-sonnet")) flavor = "Lean into a softer, emotionally aware, romantic tone. Use gentle language but keep it grounded.";
    else if (modelName.includes("deepseek/deepseek-chat")) flavor = "Be natural and conversational, strong at roleplay, with smooth scene flow, vivid emotion, and grounded dialogue. Avoid sounding instructional or formal.";

    const customBlock = customSystem && customSystem.trim() ? ` Custom persona is active. Treat this as the main character voice, backstory, personality, habits, job, rhythm, emotional style, and relationship energy for LUX. Follow it strongly unless it conflicts with platform boundaries, ${customSystem.trim()}.` : "";
    return `${baseCore}${photoContext} ${imageRules} ${flavor}${customBlock}${bridgeBlock} ${salutationBlock}${card} ${customerContext}`;
  }

  let shortHistory = [];
  let lastSeen = "";
  let luxThreadObserver = null;
  let luxObservedRoot = null;
  let luxApiInFlight = false;
  let luxApiLastSig = "";
  let luxApiLastMs = 0;

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



  function lux_cleanTurnForHistory(turn) {
    if (!turn || !turn.role) return null;
    const split = extractLuxImageMeta(turn.content || "");
    const text = stripStampsAll(split.text || "");
    const notes = (split.notes || "").trim();
    const content = text || (notes ? "Customer sent a photo." : "");
    if (!content) return null;
    return { role: turn.role, content };
  }

  function lux_historySig(item) {
    if (!item || !item.role) return "";
    return `${item.role}:${normalizeForCompare(item.content || "").slice(0, 240)}`;
  }

  function lux_mergeHistoryFromTurns(turns) {
    const merged = [];
    const seen = new Set();
    const add = item => {
      if (!item || !item.role || !item.content) return;
      const sig = lux_historySig(item);
      if (!sig || seen.has(sig)) return;
      seen.add(sig);
      merged.push({ role: item.role, content: stripStampsAll(item.content || "") });
    };
    for (const item of shortHistory || []) add(lux_cleanHistoryMessage(item));
    for (const turn of turns || []) add(lux_cleanTurnForHistory(turn));
    return merged.slice(-HISTORY_MAX);
  }

  function lux_historyWithoutCurrentUser(history, rawMsg) {
    const current = normalizeForCompare(stripStampsAll(rawMsg || ""));
    if (!current) return history || [];
    const out = [...(history || [])];
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i] && out[i].role === "user") {
        const old = normalizeForCompare(stripStampsAll(out[i].content || ""));
        if (old && (old === current || overlapScore(old, current) > 0.88)) out.splice(i, 1);
        break;
      }
    }
    return out;
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
      return String(text).replace(FAMILY_WORD_RE, "").replace(/\s{2,}/g, " ").replace(/\s+([,.?])/g, "$1").trim();
    }

    async function modelRefusal(kind, profileCard, customerMsg) {
      const tc = buildTimeContext();
      const kindLine =
        kind === "meet" ? "He is trying to meet up, push availability, or move things into a real date."
        : kind === "address" ? "He is asking for your address, exact location, or where to come."
        : "He is asking for contact details, social media, phone, WhatsApp, Telegram, Snapchat, Instagram, or off site connection.";

      const sys = [
        "You are an adult woman on a dating site.",
        luxCustomPersonaLayer(),
        getAccentInstructionByCountry(profileCard?.country || ""),
        "Answer like a real woman texting in the moment, warm, calm, human, and not dismissive.",
        "Do not agree to meet, do not give contact details, do not give exact address, and do not move off platform.",
        "Do not sound rude, cold, irritated, superior, corporate, robotic, scripted, or like a safety policy.",
        "Do not use canned lines like keep chatting here for now, take it slow here, not ready to jump into that, that sounds tempting, you are moving fast, low key for now, or build this up first.",
        "Do not invent repeated alibis. If you need a reason, let it come naturally from the exact message, privacy, timing, comfort, or wanting to know him better.",
        "If his message includes a compliment or emotional detail, acknowledge that first before setting the boundary.",
        "A question is optional. If a question would sound fake, end without one.",
        "Only use comma, period, question mark, and apostrophe.",
        "No emojis. Keep it to 2 to 4 natural sentences.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        personaCardLine(profileCard) || "",
        luxCustomerContextLine(profileCard) || ""
      ].join(" ");

      const user = [
        kindLine,
        `Customer message: "${(customerMsg || "").slice(0, 420)}"`,
        "Write one natural reply. Keep the boundary clear but leave the customer feeling seen, not dismissed."
      ].join("\n");

      let out = "";
      try {
        out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], {
          max_tokens: 125,
          temperature: 0.64,
          top_p: 0.92,
          frequency_penalty: 0.18,
          presence_penalty: 0.12
        });
      } catch {}

      out = deFamily(out || "", customerMsg);
      out = postFormat(out || "");
      if (lux_refusalAlreadyUsed(out)) out = luxScrubCannedPhrases(out);
      lux_pushRefusalMemory(out);
      return out || "I like talking with you, but I am keeping my private details to myself for now. Stay with me here a little longer.";
    }

    async function blockedTopicRefusal(kind, profileCard, customerMsg) {
      const tc = buildTimeContext();
      const kindLine = kind === "incest" ? "They brought up incest or sexual activity within family."
        : kind === "bestiality" ? "They brought up sex involving animals."
        : kind === "drug use" ? "They brought up drug use or getting high."
        : "They brought up racism or race based degradation.";
      const sys = [
        "You are an adult woman on a dating site.",
        luxCustomPersonaLayer(),
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
        luxCustomerContextLine(profileCard) || ""
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
    t = luxScrubCannedPhrases(t);
    if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === "function") t = LUXPatch.NoRepeat.scrub(t);
    t = luxEnsureQuestion(t, window.__LUX_LAST_USER);
    t = luxEnsureEnding(t);
    t = luxFixWrongCustomerName(t, window.__LUX_LAST_USER, window.__LUX_CURRENT_LEFT_CARD);
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
    const model = lux_normalizeModelName(GM_getValue("lux_model", MODEL_DEFAULT));
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
  ui.model.value = lux_normalizeModelName(GM_getValue("lux_model", MODEL_DEFAULT));
  GM_setValue("lux_model", ui.model.value);
  ui.persona.value = GM_getValue("lux_persona", "");
  ui.voiceEnabled.checked = !!GM_getValue("lux_voice_enabled", 0);
  ui.voiceGender.value = GM_getValue("lux_voice_gender", "female");

  const modelChoices = [
    "x-ai/grok-4-fast",
    "anthropic/claude-3.5-sonnet",
    "deepseek/deepseek-chat"
  ];

  let LUXSettingsDirty = false;

  function renderModelButtons() {
    const cur = lux_normalizeModelName(GM_getValue("lux_model", MODEL_DEFAULT));
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
    const __apiSig = String(hashStr(stripStampsAll(String(msgText || ""))));
    const __apiNow = Date.now();
    if (luxApiInFlight && luxApiLastSig === __apiSig) return;
    if (luxApiLastSig === __apiSig && (__apiNow - luxApiLastMs) < LUX_DEDUP_WINDOW_MS) return;
    if (!lux_canSendRequest()) return;
    luxApiInFlight = true;
    luxApiLastSig = __apiSig;
    luxApiLastMs = __apiNow;
    setTimeout(() => { luxApiInFlight = false; }, REQUEST_TIMEOUT_MS + 1200);

    const leftCard = parseLeftProfile();
    const rawWithMeta = stripStampsKeepMeta((msgText || "").toString());
    const split = extractLuxImageMeta(rawWithMeta);
    const rawMsg = stripStampsAll(split.text || "");
    const imageNotes = (split.notes || "").trim();
    window.__LUX_LAST_USER = rawMsg;
    window.__LUX_CURRENT_LEFT_CARD = leftCard;
    luxUpdateCustomerMemoryFromText(rawMsg);

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
          luxCustomPersonaLayer(),
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
          personaCardLine(leftCard) || "",
          luxCustomerContextLine(leftCard) || ""
        ].join(" ");
        const user = `Customer message: "${rawMsg.slice(0, 260)}"\nAbout text: "${profileText.slice(0, 900)}"\nWrite one natural response about the profile.`;
        try {
          out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], {
            max_tokens: 145,
            temperature: 0.52,
            top_p: 0.90
          });
        } catch {}
        if (!out) out = "There is a thoughtful feeling in what you wrote, like there is more to you than the short lines show. What part of yourself do you think people usually miss at first?";
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
      const sys = luxCustomPersonaLayer() + " Natural English in the profile country style. One short paragraph. No contacts or meetups. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow matching open ended question created by you. " + getAccentInstructionByCountry(leftCard?.country || "");
      const user = `They asked your name. Use exactly: "${profName}". ${personaCardLine(leftCard) || ""} ${luxCustomerContextLine(leftCard) || ""}\nCustomer: "${rawMsg.slice(0, 240)}"`;
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
      const sys = luxCustomPersonaLayer() + " If asked where you are, give city only. No address. One short paragraph. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow matching open ended question created by you. " + getAccentInstructionByCountry(leftCard?.country || "");
      const user = `City only: "${profCity}". ${personaCardLine(leftCard) || ""} ${luxCustomerContextLine(leftCard) || ""}\nCustomer: "${rawMsg.slice(0, 240)}"`;
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
        luxCustomPersonaLayer(),
        getAccentInstructionByCountry(leftCard?.country || ""),
        "Only use comma, period, question mark, and apostrophe.",
        "Do not mention policy, do not mention rules.",
        "Do not share contacts, do not agree to meetups.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        `Profile age is ${leftCard?.age || "unknown"}, your job must fit your age.`,
        `Use this job line as your job, ${jobLine}.`,
        "Keep the job answer believable for the profile age and do not default everyone to admin support or hospital work.",
        qGuide,
        luxCustomerContextLine(leftCard) || ""
      ].join(" ");
      const user = `They asked about your job.\nCustomer: "${rawMsg.slice(0, 240)}"\nReply in one short paragraph and end with exactly one open ended question if it feels natural.`;
      let out = await llmCall([{ role: "system", content: sys }, { role: "user", content: user }], { max_tokens: 115, temperature: 0.45, top_p: 0.90 });
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
    const chosenModel = lux_normalizeModelName(GM_getValue("lux_model", MODEL_DEFAULT));
    const basePreset = getModelPreset(chosenModel);
    const tuned = withCreativeBoost(basePreset, rawMsg);
    const historyForModel = lux_buildHistoryByTokens(lux_historyWithoutCurrentUser(shortHistory, rawMsg), LUX_HISTORY_TOKEN_BUDGET);

    const latestImage = luxGetLatestClientImageUrlFromMessage(latestClientRow);
    let userPayload = { role: "user", content: rawMsg };
    if (latestImage && imageIntent !== "profile-picture-comment") {
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
        notify("No reply generated. Tap regenerate.");
        return;
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
        content = luxScrubCannedPhrases(content);
        if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === "function") {
          content = LUXPatch.NoRepeat.scrub(content);
        }
        content = postFormat(content);
      }

      LUXPatch.UIChips.refresh({ modelLabel: chosenModel, countryLabel: leftCard?.country || "—" });
      showReplies([content]);
      pushHist(rawMsg, content);
      lux_pushRecentReply(content);
      lux_pushReplyFingerprint(content);
      luxSpeak(content);
      luxApiInFlight = false;
    } catch (e) {
      console.error(e);
      errorReply("Network error talking to OpenRouter.");
      luxApiInFlight = false;
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
    GM_setValue("lux_model", lux_normalizeModelName(ui.model.value.trim()));
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
      window.__LUX_OPERATOR_BRIDGE = "";
      let msg = stripStampsAll((ui.customer.value || "").trim());
      if (!msg) {
        const lastUser = [...shortHistory].reverse().find(t => t.role === "user");
        msg = lastUser ? stripStampsAll(lastUser.content || "") : "";
        if (msg) ui.customer.value = msg;
      }
      if (!msg) return;
      if (shortHistory.length && shortHistory[shortHistory.length - 1].role === "assistant") {
        shortHistory.pop();
        _saveHistory();
      }
      await callBackend(msg);
    } finally {
      window.__LUX_OPERATOR_BRIDGE = "";
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

    // Only the newest visible customer row is allowed to trigger LUX.
    // Older customer messages stay as background memory, but LUX must not answer them.
    const latestTurn = turns.length ? turns[turns.length - 1] : null;
    if (!latestTurn || latestTurn.role !== "user") return;

    const split = extractLuxImageMeta(latestTurn.content || "");
    const cleanForUI = stripStampsAll(split.text || "");
    const imageOnly = !cleanForUI && !!(split.notes || "").trim();
    const uiText = cleanForUI || (imageOnly ? "Customer sent a photo." : "");
    const seenSig = `latest_user:${cleanForUI}|${(split.notes || "").trim()}`;
    if (!uiText || seenSig === lastSeen) return;
    lastSeen = seenSig;

    if (turns.length) {
      shortHistory = lux_mergeHistoryFromTurns(turns);
      _saveHistory();
    }

    ui.customer.value = uiText;
    ui.popup.style.display = "block";
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || "default"), countryLabel: parseProfileCountry() || "—" });

    for (const delay of LUX_NOTE_RETRY_DELAYS) {
      setTimeout(() => {
        autoLogLatestClientInfo(cleanForUI).catch(err => console.warn("LUX member note draft error", err));
      }, delay);
    }

    callBackend(latestTurn.content);
  }

  function setupThreadWatcher() {
    const root = document.querySelector(THREAD_SEL);
    if (!root) return false;
    if (luxObservedRoot === root && luxThreadObserver) {
      processLatestTurn();
      return true;
    }
    try { if (luxThreadObserver) luxThreadObserver.disconnect(); } catch {}
    luxObservedRoot = root;
    luxThreadObserver = new MutationObserver(() => { processLatestTurn(); });
    luxThreadObserver.observe(root, { childList: true, subtree: true });
    processLatestTurn();
    return true;
  }

  luxInitVoices();
  setupThreadWatcher();
  setInterval(setupThreadWatcher, POLL_MS);
  window.addEventListener("pageshow", () => setTimeout(setupThreadWatcher, 250));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(setupThreadWatcher, 250); });
})();
