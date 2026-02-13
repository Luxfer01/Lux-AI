// ==UserScript==
// @name LUX Starr Framework v13 (OpenRouter • Encrypted Key • Creative Booster • Strict Access • ConeID Gate • Vision Auto-Switch • Underage Guard • Age-Aware Jobs)
// @namespace http://tampermonkey.net/
// @version 14.2.0
// @description LUX: encrypted OpenRouter key, strict Apps Script access (no offline grace), adaptive history, persistent creative booster, self-aware picture handling with optional true vision, topbar chips, bans preserved, stronger non-contact/non-meet enforcement, underage guard (client messages only), age-aware job answers.
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
// @connect static2.us35.myoperatorservice.com
// @connect static2.us37.myoperatorservice.com
// @connect static2.us36.myoperatorservice.com
// @connect static2.us34.myoperatorservice.com
// @connect static2.us33.myoperatorservice.com
// @run-at document-end
// ==/UserScript==

/* ============================
   LUX ConeID ACCESS CONTROL
   (STRICT: NO OFFLINE GRACE)
   ============================ */

// IMPORTANT: your deployed Apps Script URL
const ACCESS_API_ENDPOINT = "https://script.google.com/macros/s/AKfycbxBCywRTXBGE1AgLmOPON-xmcoMg09I7ETeUc6ih-U8vpqjWXOWfsVRkwRctZdh4nQ/exec";

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
      max-width:520px;background:#111;border-radius:12px;
      border:1px solid #0b3d91;padding:20px;
    `;
    const title = document.createElement("div");
    title.style.cssText = "font-size:18px;font-weight:700;margin-bottom:8px;";
    title.textContent = "LUX connection issue";
    const body = document.createElement("div");
    body.id = "lux-error-body";
    body.style.cssText = "font-size:14px;line-height:1.4;margin-bottom:16px;white-space:pre-wrap;";
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

// Apps Script call
async function lux_checkOnlineAccess(coneId) {
  if (!ACCESS_API_ENDPOINT) {
    return { allowed: false, reason: "no-endpoint-configured" };
  }
  try {
    const url = `${ACCESS_API_ENDPOINT}?coneid=${encodeURIComponent(coneId)}`;
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

  // 2) Always ask the Apps Script on every page load
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
  const API_URL_DEFAULT = 'https://openrouter.ai/api/v1/chat/completions';
  const OPENROUTER_KEY_DEFAULT = '';

  // Text model default
  const MODEL_DEFAULT = 'x-ai/grok-4-fast';
  const PROVIDER_DEFAULT = 'openrouter';

  // Vision model default (used only when image is present and strict-gate passes)
  const VISION_MODEL_DEFAULT = 'openai/gpt-4o-mini';

  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const POLL_MS = 3000;
  const HISTORY_MAX = 14;
  const REQUEST_TIMEOUT_MS = 35000;

  // ===== SELECTORS =====
  const REPLY_INPUT_SELECTOR = 'textarea#reply-textarea.form-control.border-start-0.border-end-0';
  const PERSONA_NAME_SEL = 'h5.fw-bold.mb-1';
  const PERSONA_LOC_SEL = 'h6.text-black-50';
  const THREAD_SEL = 'div#message-list.flex-grow-1.overflow-auto.p-4';
  const CLIENT_MSG_SELECTOR = 'div.d-flex.flex-row-reverse.my-2.message-box';
  const PERSONA_MSG_SELECTOR = 'div.d-flex.flex-row.my-2';
  const MEMBER_TIME_SEL = 'span#memberTime.fw-bold';

  // Image selector you provided
  const CLIENT_IMG_SEL = 'img.rounded.mb-2';

  // Client text selector you provided (used for underage scan, and safer text extraction)
  const CLIENT_P_SELECTOR_ALL = '#message-list > div.d-flex.flex-row-reverse.my-2.message-box > div.d-flex.flex-column.col-7.bg-white.rounded.p-2 > p';

  // Profile age selector you provided
  const PROFILE_AGE_SEL = 'td.p-1.ps-3.bg-light-subtle';

  // ===== XOR ENCRYPTION FOR API KEY =====
  const LUX_SECRET = 'lux_starr_secret_salt_v1';
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
    try { decoded = atob(cipherText); } catch { return ''; }
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

  // ===== Presets =====
  const MODEL_FALLBACK_PRESET = {
    temperature: 0.58,
    top_p: 0.92,
    repetition_penalty: 1.02,
    max_tokens: 240,
    stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
    seed: 11
  };

  const MODEL_PRESETS = {
    'x-ai/grok-4-fast': {
      temperature: 0.72,
      top_p: 0.96,
      repetition_penalty: 1.02,
      max_tokens: 240,
      stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
      seed: 13
    },
    'anthropic/claude-3.5-sonnet': {
      temperature: 0.62,
      top_p: 0.92,
      repetition_penalty: 1.02,
      max_tokens: 240,
      stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
      seed: 21
    },
    'openai/gpt-4.1-mini': {
      temperature: 0.55,
      top_p: 0.92,
      repetition_penalty: 1.03,
      max_tokens: 240,
      stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
      seed: 7
    },
    'meta-llama/llama-3.3-8b-instruct:free': {
      temperature: 0.65,
      top_p: 0.95,
      repetition_penalty: 1.04,
      max_tokens: 220,
      stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
      seed: 17
    },
    'meta-llama/llama-3.3-70b-instruct:free': {
      temperature: 0.66,
      top_p: 0.95,
      repetition_penalty: 1.03,
      max_tokens: 230,
      stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
      seed: 19
    }
  };

  function getModelPreset(modelName) {
    const name = (modelName || GM_getValue('lux_model', MODEL_DEFAULT) || '').trim();
    return MODEL_PRESETS[name] || MODEL_FALLBACK_PRESET;
  }

  // ===== Rate limiting =====
  const LUX_RATE_WINDOW_MS = 10_000;
  const LUX_RATE_MAX_REQ = 5;
  const LUX_RATE_LOG_KEY = 'lux_req_log_v1';

  function lux_getReqLog() {
    try { return JSON.parse(GM_getValue(LUX_RATE_LOG_KEY, '[]')) || []; } catch { return []; }
  }
  function lux_setReqLog(log) {
    GM_setValue(LUX_RATE_LOG_KEY, JSON.stringify(log || []));
  }
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

  function lux_estimateTokens(str) {
    if (!str) return 0;
    return Math.ceil(String(str).length / 4);
  }

  // ===== Creative booster =====
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

  // ===== Utilities =====
  function _qs(r, s) { try { return s ? r.querySelector(s) : null; } catch { return null; } }
  function _qst(r, s) { const el = _qs(r, s); return el ? el.innerText.trim() : ''; }

  function extractBracketName(s) {
    if (!s) return '';
    let m = s.match(/\(([^()]*)\)\s*$/);
    if (!m) m = s.match(/\(([^)]+)\)/);
    return (m && m[1]) ? m[1].trim() : '';
  }
  function cleanOutsideName(s) {
    if (!s) return '';
    return s.replace(/\s*\([^)]*\)\s*/g, '').trim();
  }
  function parseLeftProfile() {
    const rawName = _qst(document, PERSONA_NAME_SEL);
    return {
      rawName,
      realName: extractBracketName(rawName) || '',
      displayName: cleanOutsideName(rawName) || rawName,
      location: _qst(document, PERSONA_LOC_SEL) || 'nearby'
    };
  }

  function notify(text) {
    try { GM_notification({ text, title: 'LUX', timeout: 3500 }); }
    catch { console.log('[LUX]', text); }
  }
  function trimText(s, max) {
    s = (s || '').toString();
    return s.length > max ? s.slice(0, max) + '...' : s;
  }

  // ===== Stamp stripping =====
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

  const LUX_IMG_START = 'LUX_IMG_NOTES_START';
  const LUX_IMG_END = 'LUX_IMG_NOTES_END';

  function stripLuxImageMeta(s) {
    if (!s) return '';
    const rx = new RegExp(`${LUX_IMG_START}[\\s\\S]*?${LUX_IMG_END}`, 'gi');
    return String(s).replace(rx, '').replace(/\s{2,}/g, ' ').trim();
  }

  function extractLuxImageMeta(s) {
    const str = String(s || '');
    const rx = new RegExp(`${LUX_IMG_START}\\s*([\\s\\S]*?)\\s*${LUX_IMG_END}`, 'i');
    const m = str.match(rx);
    const notes = m && m[1] ? String(m[1]).trim() : '';
    const clean = str.replace(new RegExp(`${LUX_IMG_START}[\\s\\S]*?${LUX_IMG_END}`, 'gi'), '');
    return { text: clean.replace(/\s{2,}/g, ' ').trim(), notes };
  }

  function stripTrailingStampLines(s) {
    if (!s) return '';
    const isTimeOnly = l => /^(\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?)$/i.test(l);
    const isDateOnly = l => /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|20\d{2}[\/\-]\d{1,2}[\/\-]\d{1,2})$/i.test(l);

    const isStampLine = (l) => {
      if (!l) return false;
      const line = String(l).trim();
      if (!line) return false;
      if (line.length > 80) return false;
      if (/^(sent|delivered|seen|read|edited|today|yesterday)\b/i.test(line)) return true;
      if (/^(message|image|photo|picture)\b.*\b(sent|delivered|seen|read)\b/i.test(line)) return true;
      if (/\b(sent|delivered|seen|read)\b\s*(?:at\s*)?\d{1,2}:\d{2}/i.test(line)) return true;
      if (isTimeOnly(line) || isDateOnly(line)) return true;
      return false;
    };

    let lines = String(s).split(/\r?\n/).map(x => x.trim());
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    while (lines.length && isStampLine(lines[lines.length - 1])) lines.pop();

    return lines.join(' ').replace(/\s{2,}/g, ' ').trim();
  }

  function stripStampsAll(s) {
    let t = String(s || '');
    t = stripLuxImageMeta(t);
    t = stripTimestamps(t);
    t = stripTrailingStampLines(t);
    return t.trim();
  }
  function stripStampsKeepMeta(s) {
    let t = String(s || '');
    t = stripTimestamps(t);
    t = stripTrailingStampLines(t);
    return t.trim();
  }

  // ===== Image extraction from last client bubble =====
  function getImageElements(node) {
    if (!node) return [];
    try { return [...node.querySelectorAll(CLIENT_IMG_SEL)]; } catch { return []; }
  }
  function getImageNotes(node) {
    const imgs = getImageElements(node);
    const notes = [];
    imgs.forEach(img => {
      const alt = (img.getAttribute('alt') || '').trim();
      const src = (img.getAttribute('src') || '').trim();
      let name = '';
      if (src) {
        const clean = src.split('?')[0];
        name = clean.split('/').pop() || '';
      }
      const parts = [];
      if (alt) parts.push(`alt text ${alt}`);
      if (name) parts.push(`file ${name}`);
      if (parts.length) notes.push(parts.join(', '));
      else notes.push('image attached');
    });
    return notes;
  }

  // ===== Last client message extraction (STRICT) =====
  function extractClientTextFromBubble(bubble) {
    if (!bubble) return '';
    // Prefer the exact p text inside bubble
    const p = bubble.querySelector('div.d-flex.flex-column.col-7.bg-white.rounded.p-2 > p') || bubble.querySelector('p');
    const raw = (p?.innerText || bubble.innerText || '').trim();
    return stripStampsAll(raw);
  }

  function extractMessageContentFromBubble(bubble) {
    const text = extractClientTextFromBubble(bubble);
    const imageNotes = getImageNotes(bubble);
    if (!imageNotes.length) return text;
    const meta = `${LUX_IMG_START} ${imageNotes.join(' | ')} ${LUX_IMG_END}`;
    return text ? `${text}\n${meta}` : meta;
  }

  // ===== Limits =====
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

  // ===== Time context =====
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

  function personaCardLine(card) {
    if (!card) return '';
    const bits = [];
    if (card.realName) bits.push(`RealName: ${card.realName}`);
    if (card.displayName) bits.push(`Username: ${card.displayName}`);
    if (card.location) bits.push(`Location: ${card.location}`);
    return bits.length ? ` Persona card, ${bits.join(', ')}.` : '';
  }

  // ===== UI =====
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
#lux-models,#lux-vision-models{background:#2b3545;color:#bcd7ff;border:0;border-radius:8px;padding:8px 10px;font-weight:700}
#lux-models-panel,#lux-vision-models-panel{display:none;margin-top:8px;border:1px dashed #3c4c66;border-radius:8px;padding:8px}
#lux-models-panel .lux-model,#lux-vision-models-panel .lux-model{margin:4px;padding:6px 10px;border:1px solid #3c4c66;border-radius:8px;background:#1f2937;color:#cfe0ff;cursor:pointer}
#lux-models-panel .lux-tag,#lux-vision-models-panel .lux-tag{display:inline-block;background:#0b3d91;color:#fff;border-radius:999px;padding:2px 8px;font-size:12px;margin-left:8px}
  `;
  document.head.appendChild(css);

  const btn = document.createElement('button');
  btn.id = 'lux-btn';
  btn.textContent = 'LUX';
  document.body.appendChild(btn);

  const pop = document.createElement('div');
  pop.id = 'lux-popup';
  pop.innerHTML = `
  <div id="lux-topbar" style="margin-bottom:8px"></div>
  <textarea id="lux-customer" placeholder="Latest customer message" style="width:100%;min-height:96px;border:1px solid #3a4155;background:#2a2a2a;color:#fff;border-radius:8px;padding:8px;margin:8px 0"></textarea>
  <div id="lux-responses"></div>
  <div id="lux-actions">
    <button id="lux-send" style="background:#0b3d91;color:#fff;border:0;border-radius:8px;padding:8px 10px;font-weight:700">Send</button>
    <button id="lux-regen" style="background:#113a6b;color:#fff;border:0;border-radius:8px;padding:8px 10px;font-weight:700">Regenerate</button>
    <button id="lux-models">Text Models</button>
    <button id="lux-vision-models">Vision Models</button>
    <button id="lux-settings" style="background:#303741;color:#eaeaea;border:0;border-radius:8px;padding:8px 10px;font-weight:700">Settings</button>
    <button id="lux-close" style="background:#303741;color:#eaeaea;border:0;border-radius:8px;padding:8px 10px;font-weight:700">Close</button>
  </div>
  <div id="lux-models-panel"></div>
  <div id="lux-vision-models-panel"></div>
  <div id="lux-settings-panel">
    <div><strong>OpenRouter URL</strong></div><input type="text" id="lux-api-url">
    <div><strong>OpenRouter API Key</strong></div><input type="text" id="lux-api-key">
    <div><strong>Text Model</strong></div><input type="text" id="lux-model">
    <div><strong>Vision Model</strong></div><input type="text" id="lux-vision-model">
    <div><strong>Provider</strong></div><input type="text" id="lux-provider">
    <div><strong>Custom Persona (optional)</strong></div><textarea id="lux-persona"></textarea>
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:4px">
      <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-excuse-via-model" checked> Use model for creative refusals</label>
      <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-vision-enabled" checked> Enable vision auto-switch</label>
      <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-vision-strict" checked> Vision strict gate (image in last client bubble AND bubble has text)</label>
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
    visionModels: pop.querySelector('#lux-vision-models'),
    modelsPanel: pop.querySelector('#lux-models-panel'),
    visionModelsPanel: pop.querySelector('#lux-vision-models-panel'),
    settings: pop.querySelector('#lux-settings'),
    close: pop.querySelector('#lux-close'),
    panel: pop.querySelector('#lux-settings-panel'),
    apiUrl: pop.querySelector('#lux-api-url'),
    apiKey: pop.querySelector('#lux-api-key'),
    model: pop.querySelector('#lux-model'),
    visionModel: pop.querySelector('#lux-vision-model'),
    provider: pop.querySelector('#lux-provider'),
    persona: pop.querySelector('#lux-persona'),
    excuseViaModel: pop.querySelector('#lux-excuse-via-model'),
    visionEnabled: pop.querySelector('#lux-vision-enabled'),
    visionStrict: pop.querySelector('#lux-vision-strict'),
    save: pop.querySelector('#lux-save'),
  };

  // Load settings
  ui.apiUrl.value = GM_getValue('lux_api_url', API_URL_DEFAULT);
  ui.apiKey.value = lux_getApiKey();
  ui.model.value = GM_getValue('lux_model', MODEL_DEFAULT);
  ui.visionModel.value = GM_getValue('lux_vision_model', VISION_MODEL_DEFAULT);
  ui.provider.value = GM_getValue('lux_provider', PROVIDER_DEFAULT);
  ui.persona.value = GM_getValue('lux_persona', '');
  ui.excuseViaModel.checked = GM_getValue('lux_excuse_via_model', 1) === 1;
  ui.visionEnabled.checked = GM_getValue('lux_vision_enabled', 1) === 1;
  ui.visionStrict.checked = GM_getValue('lux_vision_strict', 1) === 1;

  // ===== Model pickers =====
  const modelChoices = [
    'x-ai/grok-4-fast',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4.1-mini',
    'meta-llama/llama-3.3-8b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
  ];

  // Best 3–4 vision models (editable). If one isn’t supported by your OpenRouter plan, pick another.
  const visionModelChoices = [
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'google/gemini-1.5-flash',
    'anthropic/claude-3.5-sonnet',
  ];

  let LUXSettingsDirty = false;

  // ===== LUXPatch namespace =====
  const LUXPatch = (typeof window.LUXPatch !== 'undefined' ? window.LUXPatch : (window.LUXPatch = {}));

  /* ===========================
     PATCH: UI Topbar Chips
     =========================== */
  LUXPatch.UIChips = (() => {
    const ids = { topbar: 'lux-topbar', chipModel: 'lux-chip-model', chipVision: 'lux-chip-vision', chipDaypart: 'lux-chip-daypart' };
    function ensureStyles() {
      if (document.getElementById('luxpatch-chips-style')) return;
      const c = document.createElement('style');
      c.id = 'luxpatch-chips-style';
      c.textContent = `
        .luxpatch-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
        .luxpatch-chip{background:#2b3545;border:1px solid #3c4c66;color:#cfe0ff;border-radius:999px;padding:4px 10px;font-size:12px}
        .luxpatch-brand{font-weight:900;letter-spacing:.4px;color:#bcd7ff}
      `;
      document.head.appendChild(c);
    }
    function timeChipLabel() {
      const tc = buildTimeContext();
      return `${tc.rawDayTime} , ${tc.daypart} , ${tc.dayName}`;
    }
    function mountTopbar(container) {
      ensureStyles();
      if (!container) return null;
      const top = document.createElement('div');
      top.id = ids.topbar;
      top.className = 'luxpatch-topbar';
      top.innerHTML = `
        <div class="luxpatch-brand">LUX</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="luxpatch-chip" id="${ids.chipModel}">text , —</span>
          <span class="luxpatch-chip" id="${ids.chipVision}">vision , —</span>
          <span class="luxpatch-chip" id="${ids.chipDaypart}">—</span>
        </div>`;
      container.appendChild(top);
      refresh({ modelLabel: 'default', visionLabel: 'default' });
      return top;
    }
    function refresh({ modelLabel, visionLabel }) {
      const m = document.getElementById(ids.chipModel);
      const v = document.getElementById(ids.chipVision);
      const d = document.getElementById(ids.chipDaypart);
      if (m && modelLabel) m.textContent = `text , ${modelLabel}`;
      if (v && visionLabel) v.textContent = `vision , ${visionLabel}`;
      if (d) d.textContent = timeChipLabel();
    }
    function unmount() {
      const n = document.getElementById(ids.topbar);
      if (n) n.remove();
    }
    return { mountTopbar, refresh, unmount, ids };
  })();

  LUXPatch.UIChips.mountTopbar(ui.topbar);
  LUXPatch.UIChips.refresh({ modelLabel: ui.model.value || 'default', visionLabel: ui.visionModel.value || 'default' });

  function renderModelButtons() {
    const cur = (GM_getValue('lux_model', MODEL_DEFAULT) || '').trim();
    const p = ui.modelsPanel;
    p.innerHTML = '';
    const head = document.createElement('div');
    head.style.marginBottom = '6px';
    head.innerHTML = `<strong>Pick a text model</strong> <span class="lux-tag">current: ${cur || 'default'}</span>`;
    p.appendChild(head);

    modelChoices.forEach(m => {
      const b = document.createElement('button');
      b.className = 'lux-model';
      b.textContent = m;
      b.addEventListener('click', () => {
        ui.model.value = m;
        GM_setValue('lux_model', m);
        ui.provider.value = 'openrouter';
        GM_setValue('lux_provider', 'openrouter');
        LUXSettingsDirty = true;
        notify('Text model set to ' + m);
        LUXPatch.UIChips.refresh({ modelLabel: m, visionLabel: ui.visionModel.value || 'default' });
        renderModelButtons();
      });
      p.appendChild(b);
    });
  }

  function renderVisionModelButtons() {
    const cur = (GM_getValue('lux_vision_model', VISION_MODEL_DEFAULT) || '').trim();
    const p = ui.visionModelsPanel;
    p.innerHTML = '';
    const head = document.createElement('div');
    head.style.marginBottom = '6px';
    head.innerHTML = `<strong>Pick a vision model</strong> <span class="lux-tag">current: ${cur || 'default'}</span>`;
    p.appendChild(head);

    visionModelChoices.forEach(m => {
      const b = document.createElement('button');
      b.className = 'lux-model';
      b.textContent = m;
      b.addEventListener('click', () => {
        ui.visionModel.value = m;
        GM_setValue('lux_vision_model', m);
        LUXSettingsDirty = true;
        notify('Vision model set to ' + m);
        LUXPatch.UIChips.refresh({ modelLabel: ui.model.value || 'default', visionLabel: m });
        renderVisionModelButtons();
      });
      p.appendChild(b);
    });
  }

  function togglePanel(panel, renderFn) {
    const open = getComputedStyle(panel).display !== 'none' && getComputedStyle(panel).visibility !== 'hidden';
    if (open) { panel.style.display = 'none'; panel.style.visibility = 'hidden'; }
    else { renderFn(); panel.style.display = 'block'; panel.style.visibility = 'visible'; }
  }

  ui.models.addEventListener('click', () => togglePanel(ui.modelsPanel, renderModelButtons));
  ui.visionModels.addEventListener('click', () => togglePanel(ui.visionModelsPanel, renderVisionModelButtons));

  /* ===========================
     No-Repeat Guard
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
      "keep building the heat",
      "keep building the connection",
      "build the heat",
      "build the connection",
      "build our connection",
      "build our heat",
      "I'm a bit shy to share my contact",
      "I’m a bit shy to share my contact",
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
    return { scrub };
  })();

  /* ===========================
     Underage Guard (CLIENT ONLY)
     - Scans ALL client messages (p selector you provided)
     - Avoids false flags from "when I was 8" or "back when I was 13"
     =========================== */
  function normalizeClientText(t) {
    return stripStampsAll(String(t || '')).toLowerCase();
  }

  function isPastAgeMention(s) {
    // phrases that strongly suggest a past context
    return /\b(when i was|back when i was|at age|at the age of|years ago|as a kid|as a child|growing up|in primary school|in middle school|in high school)\b/i.test(s);
  }

  function extractCurrentAgeIfAny(s) {
    const text = normalizeClientText(s);
    if (!text) return null;

    // Must not be a past story
    if (isPastAgeMention(text)) return null;

    // explicit underage phrases
    if (/\bunder\s*18\b/i.test(text)) return 17;
    if (/\bminor\b/i.test(text)) return 17;
    if (/\bnot\s*(?:up\s*to|upto)\s*18\b/i.test(text)) return 17;

    // "i'm 16", "i am 17 years old", "im 15yo"
    const m = text.match(/\b(i(?:'m| am)|im)\s*(?:only\s*)?(\d{1,2})\s*(?:yo|y\/o|yrs?|years?\s*old|years\s*of\s*age)?\b/i);
    if (m) {
      const n = parseInt(m[2], 10);
      if (Number.isFinite(n) && n >= 1 && n <= 120) return n;
    }

    // "my age is 16"
    const m2 = text.match(/\b(my\s*age\s*(?:is|=)\s*)(\d{1,2})\b/i);
    if (m2) {
      const n = parseInt(m2[2], 10);
      if (Number.isFinite(n) && n >= 1 && n <= 120) return n;
    }

    return null;
  }

  function scanAllClientMessagesForUnderage() {
    const els = [...document.querySelectorAll(CLIENT_P_SELECTOR_ALL)];
    for (const el of els) {
      const raw = (el?.innerText || '').trim();
      const age = extractCurrentAgeIfAny(raw);
      if (age !== null && age < 18) return { underage: true, age };
    }
    return { underage: false, age: null };
  }

  /* ===========================
     Profile Age Parser (Age: 40)
     =========================== */
  function getProfileAge() {
    const nodes = [...document.querySelectorAll(PROFILE_AGE_SEL)];
    for (const n of nodes) {
      const t = (n?.innerText || n?.textContent || '').trim();
      if (!t) continue;
      const m = t.match(/\bage\s*:\s*(\d{1,3})\b/i);
      if (m) {
        const age = parseInt(m[1], 10);
        if (Number.isFinite(age) && age >= 18 && age <= 100) return age;
      }
    }
    return null;
  }

  /* ===========================
     Age-aware job pools
     =========================== */
  const JOB_POOLS = {
    '18_25': [
      "student and part time assistant",
      "junior customer support rep",
      "social media assistant",
      "entry level marketer",
      "junior designer",
      "barista part time"
    ],
    '26_39': [
      "marketing manager",
      "HR consultant",
      "nurse",
      "real estate agent",
      "business owner",
      "project coordinator",
      "account officer"
    ],
    '40_55': [
      "operations manager",
      "senior accountant",
      "school administrator",
      "business consultant",
      "clinic supervisor",
      "property manager",
      "procurement lead"
    ],
    '56_100': [
      "retired educator who consults sometimes",
      "small business owner",
      "board advisor",
      "community coordinator",
      "private consultant",
      "semi retired manager"
    ]
  };

  function bucketForAge(age) {
    if (!age) return null;
    if (age <= 25) return '18_25';
    if (age <= 39) return '26_39';
    if (age <= 55) return '40_55';
    return '56_100';
  }

  const JOB_HISTORY_KEY = 'lux_job_history_v1';
  function getJobHistory() {
    try { return JSON.parse(GM_getValue(JOB_HISTORY_KEY, '[]')) || []; } catch { return []; }
  }
  function setJobHistory(arr) {
    GM_setValue(JOB_HISTORY_KEY, JSON.stringify(arr || []));
  }

  function pickJobForAge(age) {
    const bucket = bucketForAge(age);
    const pool = bucket ? (JOB_POOLS[bucket] || []) : [...JOB_POOLS['26_39'], ...JOB_POOLS['40_55']];
    const hist = getJobHistory().slice(-8);
    const candidates = pool.filter(j => !hist.includes(j));
    const choice = (candidates.length ? candidates : pool)[Math.floor(Math.random() * (candidates.length ? candidates.length : pool.length))];
    hist.push(choice);
    setJobHistory(hist.slice(-8));
    return choice;
  }

  // ===== Safety / Refusals =====
  const Safety = (() => {
    const CONTACT_REQUEST_RE = /\b(?:what(?:'| i)?s\s+(?:your\s+)?(?:number|no\.?|email)|give\s+me\s+(?:your\s+)?(?:number|email)|add\s+me\s+on\s+(?:whatsapp|ig|instagram|snap(?:chat)?|telegram|discord)|dm\s+me\s+on\s+(?:ig|instagram|x|twitter)|hit\s+me\s+up\s+on\s+(?:whatsapp|ig|instagram|snap|telegram|discord)|call\s+me|text\s+me|send\s+me\s+(?:your\s+)?contact|share\s+(?:your\s+)?(?:number|email)|give\s+me\s+your\s+contact|reach\s+me\s+at)\b/i;

    const MEET_RE = /\b(?:let['’]?s\s+(?:meet|hang(?:\s*out)?|link\s*up|grab\s+(?:a\s+)?(?:drink|coffee)|go\s+for\s+(?:drinks?|coffee))|coffee\s+soon|plan\s+for\s+a\s+coffee|see\s+you\s+(?:tonight|tomorrow|later)|(?:bar|club|restaurant|dinner|lunch|brunch|date|coffee|café|cafe|drinks?|hookup))\b/i;

    const ADDRESS_RE = /\b(address|house|apartment|home|street|avenue|road|rd\.?|st\.?)\b/i;
    const NAME_RE = /\b(what(?:'| i)?s\s+your\s+name|ur\s*name|name\s*please|name\s*pls|who\s+are\s+you)\b/i;
    const LOCATION_RE = /\b(where\s+do\s+you\s+(?:live|stay)|where\s+are\s+you|what\s+city|your\s+city|your\s+location|where\s+are\s+you\s+based|where\s+are\s+u\s+at|what\s+part\s+are\s+you\s+in|where\s+do\s+you\s+reside|what\s+part\s+of\s+town|where\s+you\s+located|where\s+are\s+you\s+located)\b/i;

    const USER_MENTIONS_FAMILY_RE = /\b(family|my\s+(?:sister|brother|mom|mother|dad|father|parents?|cousin|aunt|uncle|kids?|child|niece|nephew)|babysit(?:ting)?|family\s+issues?)\b/i;
    const FAMILY_WORD_RE = /\b(family|mom|mother|dad|father|parents?|sister|brother|cousin|aunt|uncle|kids?|child|children|babysit(?:ting)?|relatives?)\b/gi;

    const wantsContact = s => CONTACT_REQUEST_RE.test((s || '').toLowerCase());
    const wantsMeet = s => MEET_RE.test((s || '').toLowerCase());
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
          "I've got an early start and need to rest",
          "I'm in the middle of small chores and bits",
          "I'm cooking and keeping it low key",
          "My battery and data are low so I'm keeping it light",
          "I'm catching up on work and staying focused",
          "I'm staying in and keeping it simple",
          "I just got back and I'm worn out",
          "I'm heading to the gym and then I need to reset",
          "My connection is acting up so I'm being careful",
          "I'm taking care of a pet situation and it has my attention"
        ];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        t = t.replace(FAMILY_WORD_RE, '').replace(/\s{2,}/g, ' ').trim();
        if (!t || t.length < 8) t = pick + '.';
        else if (!/[.]\s*$/.test(t)) t += '.';
      }
      return t;
    }

    const UNDERAGE_POOL = [
      "I can't continue if you're under 18, I need you to be an adult to chat here, take care.",
      "If you're not 18 yet I have to stop right here, please come back when you're an adult.",
      "I have to keep this adult only, if you're under 18 I can't chat with you, be safe.",
      "I can't keep talking if you're a minor, this space is for adults only, please take care.",
      "If you're under 18 then I need to end the conversation, I hope you understand.",
      "I can't engage with minors here, if you're under 18 we have to stop, stay safe."
    ];

    function underageReply() {
      const pick = UNDERAGE_POOL[Math.floor(Math.random() * UNDERAGE_POOL.length)];
      return pick;
    }

    return { wantsContact, wantsMeet, mentionsAddress, askName, wantsLocation, deFamily, underageReply };
  })();

  // ===== Post-formatting and hard safety scrub =====
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
      [/\bcant\b/gi, "can't"], [/\bdont\b/gi, "don't"], [/\bwont\b/gi, "won't"],
      [/\bdoesnt\b/gi, "doesn't"], [/\bisnt\b/gi, "isn't"], [/\baren't\b/gi, "aren't"],
      [/\bdidnt\b/gi, "didn't"], [/\bhavent\b/gi, "haven't"], [/\bhasnt\b/gi, "hasn't"],
    ];
    for (const [re, to] of rules) t = t.replace(re, to);
    return t;
  }

  function applyLexiconPrefs(s) {
    const prefs = [
      { from: /\binterested\b/gi, to: 'curious' },
      { from: /\bvery\b/gi, to: '' },
      { from: /\bsexy\b/gi, to: 'bold' },
      { from: /\bunwind\b/gi, to: 'relax' },
      { from: /\berrand(s)?\b/gi, to: 'small chores' },
      { from: /\bfavo(u?)rite(s)?\b/gi, to: 'best thing' }
    ];
    let t = s;
    for (const r of prefs) t = t.replace(r.from, r.to);
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
  function fixPronounI(s) { return s.replace(/\b(i)\b/g, 'I').replace(/\bi'm\b/gi, "I'm").replace(/\bi've\b/gi, "I've").replace(/\bi'd\b/gi, "I'd").replace(/\bi'll\b/gi, "I'll"); }
  function ensureTerminalPunct(s) { s = s.trim(); return s ? (/[\.?]$/.test(s) ? s : (s + '.')) : s; }

  function stripPhoneLikeNumbers(s) {
    // Remove sequences that look like phone numbers (7+ digits, may contain separators)
    let t = String(s || '');
    t = t.replace(/\b\+?\d[\d\s\-\(\)\.]{6,}\d\b/g, '');
    t = t.replace(/\s{2,}/g, ' ').trim();
    return t;
  }

  function postFormat(text) {
    if (!text) return text;

    let t = stripStampsAll(text);
    t = toAscii(t);
    t = stripDisallowedPunct(t);
    t = smartPunct(t);
    t = purgeBannedWords(t);
    t = applyLexiconPrefs(t);
    t = fixMissingApostrophes(t);
    t = normalizeSpaces(t);
    t = capBoundaries(t);
    t = fixPronounI(t);

    if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === 'function') {
      t = LUXPatch.NoRepeat.scrub(t);
    }

    t = stripPhoneLikeNumbers(t);
    t = ensureTerminalPunct(t);
    return clampToLimit(t);
  }

  // ===== History =====
  let shortHistory = [];
  let lastSeenSig = '';

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

  function lux_buildHistoryByTokens(history, maxTokensForHistory) {
    const cleaned = (history || []).map(m => ({ ...m, content: stripStampsAll(extractLuxImageMeta(m.content || '').text || '') }));
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

  function pushHist(user, assistant) {
    shortHistory.push(
      { role: 'user', content: stripStampsAll(extractLuxImageMeta(user).text || user) },
      { role: 'assistant', content: postFormat(assistant) }
    );
    if (shortHistory.length > HISTORY_MAX) shortHistory.shift();
    _saveHistory();
  }

  // ===== LLM call (OpenRouter) =====
  async function llmCall(messages, overrides = {}, modelOverride = null) {
    if (!lux_canSendRequest()) throw new Error('Rate-limited');
    const key = lux_getApiKey().trim();
    const model = (modelOverride || GM_getValue('lux_model', MODEL_DEFAULT)).trim();
    if (!key) throw new Error('Missing OpenRouter API key');

    const base = getModelPreset(model);
    const tuned = withCreativeBoost(base, (messages?.[messages.length - 1]?.content) || '');

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
            if (res.status < 200 || res.status >= 300) {
              return reject(new Error(`OpenRouter HTTP ${res.status}: ${trimText(res.responseText, 280)}`));
            }
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

  // ===== TRUE VISION PIPELINE (base64) =====
  function fetchImageAsBase64(url) {
    return new Promise((resolve, reject) => {
      if (!url) return resolve(null);
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        responseType: 'arraybuffer',
        timeout: 20000,
        onload: (res) => {
          try {
            if (res.status < 200 || res.status >= 300) return reject(new Error('Image HTTP ' + res.status));
            const bytes = new Uint8Array(res.response);
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            const b64 = btoa(binary);
            resolve(b64);
          } catch (e) { reject(e); }
        },
        onerror: () => reject(new Error('Image network error')),
        ontimeout: () => reject(new Error('Image timeout'))
      });
    });
  }

  async function runVisionAnalysisIfNeeded(lastBubble, rawMsg) {
    const enabled = GM_getValue('lux_vision_enabled', 1) === 1;
    if (!enabled) return '';

    const strict = GM_getValue('lux_vision_strict', 1) === 1;
    const imgs = getImageElements(lastBubble);
    if (!imgs.length) return '';

    if (strict) {
      // hard gate you requested
      if (!rawMsg || !rawMsg.trim()) return '';
    }

    const src = (imgs[0].getAttribute('src') || '').trim();
    if (!src) return '';

    const visionModel = (GM_getValue('lux_vision_model', VISION_MODEL_DEFAULT) || VISION_MODEL_DEFAULT).trim();
    const key = lux_getApiKey().trim();
    if (!key) return '';

    let b64 = null;
    try { b64 = await fetchImageAsBase64(src); } catch { return ''; }
    if (!b64) return '';

    // Ask vision model for a safe, minimal description ONLY (no identity claims, no guessing)
    const sys = [
      "You are a careful vision assistant.",
      "Describe only what you can directly see in the image.",
      "Do not guess age, identity, location, or private attributes.",
      "Return 1 to 3 short sentences, plain text, no emojis, no bullet points."
    ].join(' ');

    const messages = [
      { role: 'system', content: sys },
      {
        role: 'user',
        content: [
          { type: 'text', text: "Describe this photo in a safe and simple way. Mention visible clothing, expression, and setting if obvious." },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }
        ]
      }
    ];

    // Vision models often need a different payload shape. OpenRouter supports "content" array for multimodal on many providers.
    const payload = sanitizePayloadForModel({
      model: visionModel,
      messages,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 160
    }, visionModel);

    const visionText = await new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: OPENROUTER_API_URL,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': location.origin,
          'X-Title': 'LUX Vision'
        },
        data: JSON.stringify(payload),
        timeout: REQUEST_TIMEOUT_MS,
        onload: (res) => {
          try {
            if (res.status < 200 || res.status >= 300) return resolve('');
            const data = JSON.parse(res.responseText || '{}');
            const content = data?.choices?.[0]?.message?.content?.trim();
            resolve(content || '');
          } catch { resolve(''); }
        },
        onerror: () => resolve(''),
        ontimeout: () => resolve('')
      });
    });

    return stripStampsAll(visionText || '');
  }

  // ===== System prompt =====
  function buildSystemPrompt(leftCard, customSystem, imageNotes, visionNotes) {
    const card = (personaCardLine(leftCard) || '');
    const modelName = (GM_getValue('lux_model', MODEL_DEFAULT) || '').trim().toLowerCase();
    const tc = buildTimeContext();

    const baseCore = [
      "You are an adult woman on a dating site.",
      "Your tone is natural, warm, feminine and relaxed, never robotic.",
      "Reply only to the latest client message. Past messages are context only and should not hijack the reply.",
      "Write like a real person, logical, grounded, humane, not repetitive.",
      "Avoid boring or recycled endings. Do not ask generic questions like what turns you on.",
      "Punctuation rule, only comma, period, question mark, and apostrophe.",
      "No emojis.",
      "No meetups, no coffee, no drinks, no dates, no hangouts, no linking up, no addresses, no contact info, no social handles.",
      "If asked for contacts or meetups, decline briefly and pivot into a fresh topic.",
      "Avoid family excuses unless the client mentioned family first.",
      "Banned language, do not use oh, oh wow, any form of flattered, any form of enthusiasm or enthusaism, sizzling, non food spicy, or flirt words.",
      `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
      "End with exactly one natural open ended question that fits the flow and is not templated."
    ].join(' ');

    const photoContextA = (imageNotes && imageNotes.trim())
      ? ` The client attached a photo. Safe notes from the page, ${imageNotes.trim()}. Do not invent details beyond these notes.`
      : "";

    const photoContextB = (visionNotes && visionNotes.trim())
      ? ` Vision notes, ${visionNotes.trim()}. Use these to react to the photo naturally, and do not add unverified details.`
      : "";

    let flavor = "";
    if (modelName.startsWith("x-ai/grok-4")) {
      flavor = "Be witty and quick, slightly teasing but never rude, keep it punchy.";
    } else if (modelName.startsWith("anthropic/claude-3.5-sonnet")) {
      flavor = "Be soft and emotionally aware, warm and attentive, grounded and not overly poetic.";
    } else if (modelName.startsWith("openai/gpt-4.1-mini")) {
      flavor = "Be clear and coherent, answer the exact wording, then pivot smoothly.";
    } else if (modelName.includes("llama-3.3-8b")) {
      flavor = "Use simple direct language, light playful tone, short sentences.";
    } else if (modelName.includes("llama-3.3-70b")) {
      flavor = "Be slightly more expressive but still concise and natural.";
    } else {
      flavor = "Match their energy and avoid sounding scripted.";
    }

    if (customSystem && customSystem.trim()) return customSystem + " " + card;
    return baseCore + photoContextA + photoContextB + " " + flavor + " " + card;
  }

  // ===== Intent helpers =====
  const wantsPics = (q) => /\b(pics?|pictures?|photos?|selfie|images?|gallery|more\s+pictures?)\b/i.test((q || '').toLowerCase());
  const asksJob = (q) => /\b(what\s+do\s+you\s+do|what\s+do\s+you\s+do\s+for\s+work|what\s+is\s+your\s+job|what\s+work\s+do\s+you\s+do|what\s+do\s+you\s+do\s+for\s+a\s+living|your\s+occupation)\b/i.test((q || '').toLowerCase());

  // ===== Render replies =====
  function showReplies(items) {
    ui.list.innerHTML = '';
    items.forEach(txt => {
      const finalTxt = clampToLimit(stripStampsAll(txt));
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

  // ===== Call backend (main) =====
  async function callBackend(msgText, lastBubble = null) {
    if (!lux_canSendRequest()) return;

    const leftCard = parseLeftProfile();

    const rawWithMeta = stripStampsKeepMeta((msgText || '').toString());
    const split = extractLuxImageMeta(rawWithMeta);
    const rawMsg = stripStampsAll(split.text || '');
    const imageNotes = (split.notes || '').trim();

    // 1) Underage scan (client messages only)
    const under = scanAllClientMessagesForUnderage();
    if (under.underage) {
      const out = postFormat(Safety.underageReply());
      showReplies([out]);
      return;
    }

    // 2) Hard safety routing
    if (Safety.wantsMeet(rawMsg) || Safety.wantsContact(rawMsg) || Safety.mentionsAddress(rawMsg)) {
      const tc = buildTimeContext();
      const sys = [
        "You are an adult woman on a dating site.",
        "No meetups, no dates, no coffee, no drinks, no hangouts, no addresses, no contacts, no social handles.",
        "Decline briefly in a human way and pivot into a fresh topic.",
        "Only use comma, period, question mark, and apostrophe.",
        "No emojis.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        personaCardLine(leftCard) || ''
      ].join(' ');
      const user = `Customer said, "${rawMsg.slice(0, 240)}". Write 1 to 2 sentences, creative and unique, then one natural question.`;
      let out = '';
      try { out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], { max_tokens: 120, temperature: 0.75, top_p: 0.95 }); }
      catch { out = "I can't do that, but I'm happy talking with you right here, what's been on your mind today?"; }
      out = Safety.deFamily(out, rawMsg);
      out = postFormat(out);
      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }

    // 3) Name / location shortcuts
    if (Safety.askName(rawMsg)) {
      const profName = (leftCard && leftCard.realName) ? leftCard.realName : 'Luna';
      const sys = 'Natural US English. One short paragraph. No contacts or meetups. No emojis. Only comma, period, question mark, apostrophe. End with one natural question.';
      const user = `They asked your name. Use exactly, "${profName}". Customer, "${rawMsg.slice(0, 220)}".`;
      let out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], { max_tokens: 110, temperature: 0.55, top_p: 0.92 });
      out = postFormat(out);
      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }
    if (Safety.wantsLocation(rawMsg)) {
      const profCity = (leftCard && leftCard.location) ? leftCard.location : 'nearby';
      const sys = 'If asked where you are, give city only. No address. One short paragraph. No emojis. Only comma, period, question mark, apostrophe. End with one natural question.';
      const user = `City only, "${profCity}". Customer, "${rawMsg.slice(0, 220)}".`;
      let out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], { max_tokens: 110, temperature: 0.55, top_p: 0.92 });
      out = postFormat(out);
      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }

    // 4) Age-aware job answering
    if (asksJob(rawMsg)) {
      const age = getProfileAge();
      const job = pickJobForAge(age || 35);
      const tc = buildTimeContext();
      const sys = [
        "You are an adult woman on a dating site.",
        "Answer naturally and confidently, one short paragraph.",
        "Only comma, period, question mark, apostrophe, no emojis.",
        "No meetups or contacts.",
        "Be unique and not boring.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`
      ].join(' ');
      const user = `They asked what you do for work. Your job is, ${job}. Mention it naturally without sounding rehearsed. Then ask one fresh question that fits. Customer, "${rawMsg.slice(0, 220)}".`;
      let out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], { max_tokens: 160, temperature: 0.72, top_p: 0.95 });
      out = postFormat(out);
      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }

    // 5) Vision analysis (strict-gated by your instruction)
    let visionNotes = '';
    try {
      if (lastBubble) {
        visionNotes = await runVisionAnalysisIfNeeded(lastBubble, rawMsg);
      }
    } catch { visionNotes = ''; }

    // 6) Normal path
    const system = buildSystemPrompt(leftCard, (GM_getValue('lux_persona', '') || '').trim(), imageNotes, visionNotes);
    const chosenModel = (GM_getValue('lux_model', MODEL_DEFAULT) || MODEL_DEFAULT).trim();
    const basePreset = getModelPreset(chosenModel);
    const tuned = withCreativeBoost(basePreset, rawMsg);

    const historyForModel = lux_buildHistoryByTokens(shortHistory, 3000);
    const messages = [{ role: 'system', content: system }, ...historyForModel, { role: 'user', content: rawMsg || "The client sent a photo." }];

    const key = lux_getApiKey().trim();
    if (!key) { errorReply('Missing OpenRouter API key. Open LUX , Settings and paste your key.'); return; }

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
      method: 'POST',
      url: GM_getValue('lux_api_url', API_URL_DEFAULT).trim(),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'HTTP-Referer': location.origin,
        'X-Title': document.title || 'LUX Userscript'
      },
      data: JSON.stringify(payload),
      timeout: REQUEST_TIMEOUT_MS,
      onload: async (res) => {
        try {
          if (res.status < 200 || res.status >= 300) {
            let msg;
            if (res.status === 401) msg = 'OpenRouter API key is invalid or unauthorized.';
            else if (res.status === 402) msg = 'OpenRouter billing or quota exceeded, HTTP 402.';
            else if (res.status === 404) msg = 'OpenRouter endpoint or model not found, HTTP 404.';
            else if (res.status === 429) msg = 'OpenRouter rate limit reached, HTTP 429.';
            else msg = `HTTP ${res.status} ${res.statusText || ''}`.trim();
            errorReply(msg);
            return;
          }
          const data = JSON.parse(res.responseText || '{}');
          const raw = (data?.choices?.[0]?.message?.content || '');
          if (!raw) { errorReply('The server replied but no content was found.'); return; }

          let content = raw;

          // Final hard safety sweep
          if (Safety.wantsMeet(content) || Safety.wantsContact(content) || Safety.mentionsAddress(content)) {
            content = "I can't do that, but I'm happy talking with you right here, what's been on your mind today?";
          }

          content = postFormat(content);

          LUXPatch.UIChips.refresh({ modelLabel: chosenModel, visionLabel: ui.visionModel.value || 'default' });
          showReplies([content]);
          pushHist(rawMsg, content);
        } catch (e) { errorReply('Parse error, ' + String(e)); }
      },
      onerror: () => errorReply('Network error talking to OpenRouter.'),
      ontimeout: () => errorReply('OpenRouter request timed out.')
    });
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
    const final = clampToLimit(stripStampsAll(text));
    setNativeValue(el, final);
    try { el.selectionStart = el.selectionEnd = el.value.length; } catch { }
    fireTypingEvents(el);
    if (typeof queueMicrotask === 'function') queueMicrotask(() => fireTypingEvents(el));
    else setTimeout(() => fireTypingEvents(el), 0);
    return true;
  }

  // ===== Events =====
  btn.addEventListener('click', () => {
    ui.popup.style.display = 'block';
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: ui.model.value || 'default', visionLabel: ui.visionModel.value || 'default' });
  });

  ui.close.addEventListener('click', () => {
    if (LUXSettingsDirty) {
      if (confirm('You changed LUX settings. Save before closing?')) {
        ui.save.click();
      }
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
    GM_setValue('lux_model', ui.model.value.trim());
    GM_setValue('lux_vision_model', ui.visionModel.value.trim());
    GM_setValue('lux_provider', ui.provider.value.trim());
    GM_setValue('lux_persona', ui.persona.value.trim());
    GM_setValue('lux_excuse_via_model', ui.excuseViaModel && ui.excuseViaModel.checked ? 1 : 0);
    GM_setValue('lux_vision_enabled', ui.visionEnabled && ui.visionEnabled.checked ? 1 : 0);
    GM_setValue('lux_vision_strict', ui.visionStrict && ui.visionStrict.checked ? 1 : 0);
    LUXPatch.UIChips.refresh({ modelLabel: ui.model.value || 'default', visionLabel: ui.visionModel.value || 'default' });
    LUXSettingsDirty = false;
    alert('Saved');
  });

  ['apiUrl', 'apiKey', 'model', 'visionModel', 'provider', 'persona'].forEach(k => {
    ui[k].addEventListener('input', () => { LUXSettingsDirty = true; });
  });
  ui.excuseViaModel.addEventListener('change', () => { LUXSettingsDirty = true; });
  ui.visionEnabled.addEventListener('change', () => { LUXSettingsDirty = true; });
  ui.visionStrict.addEventListener('change', () => { LUXSettingsDirty = true; });

  ui.send.addEventListener('click', async () => {
    const msg = stripStampsAll((ui.customer.value || '').trim());
    if (!msg) { notify('Type a message first.'); return; }
    await callBackend(msg, null);
  });

  ui.regen.onclick = async () => {
    try {
      ui.regen.disabled = true;
      let msg = stripStampsAll((ui.customer.value || '').trim());
      if (!msg) {
        const lastUser = [...shortHistory].reverse().find(t => t.role === 'user');
        if (!lastUser) return;
        msg = stripStampsAll(lastUser.content);
        ui.customer.value = msg;
      }
      if (shortHistory.length && shortHistory[shortHistory.length - 1].role === 'assistant') {
        shortHistory.pop();
        _saveHistory();
      }
      await callBackend(msg, null);
    } finally {
      ui.regen.disabled = false;
    }
  };

  /* ===========================
     Last-message lock watcher
     - Only targets the last client bubble
     - Uses a signature of text + last image src, so it never re-triggers on old content
     =========================== */
  function getLastClientBubble() {
    const root = document.querySelector(THREAD_SEL);
    if (!root) return null;
    const nodes = [...root.querySelectorAll(CLIENT_MSG_SELECTOR)];
    if (!nodes.length) return null;
    return nodes[nodes.length - 1];
  }

  function makeLastSig(bubble) {
    if (!bubble) return '';
    const text = extractClientTextFromBubble(bubble);
    const imgs = getImageElements(bubble);
    const src = imgs.length ? (imgs[0].getAttribute('src') || '').trim() : '';
    return (text + '||' + src).slice(0, 900);
  }

  function refreshClientHistoryFromDOM() {
    // Context only: collect recent turns, but the reply always targets the last bubble.
    const root = document.querySelector(THREAD_SEL);
    if (!root) return;
    const nodes = [...root.querySelectorAll(`${CLIENT_MSG_SELECTOR}, ${PERSONA_MSG_SELECTOR}`)];
    const turns = [];
    for (const row of nodes) {
      const fromClient = row.matches(CLIENT_MSG_SELECTOR);
      let content = '';
      if (fromClient) content = extractMessageContentFromBubble(row);
      else content = stripStampsAll((row?.innerText || '').trim());
      if (content) turns.push({ role: fromClient ? 'user' : 'assistant', content: stripStampsAll(extractLuxImageMeta(content).text || content) });
    }
    if (turns.length) {
      shortHistory = turns.slice(-HISTORY_MAX);
      _saveHistory();
    }
  }

  async function processLatestTurn() {
    const lastBubble = getLastClientBubble();
    if (!lastBubble) return;

    const sig = makeLastSig(lastBubble);
    if (!sig || sig === lastSeenSig) return;

    lastSeenSig = sig;

    // Update UI with clean last text
    const lastContent = extractMessageContentFromBubble(lastBubble);
    const split = extractLuxImageMeta(lastContent || '');
    const cleanForUI = stripStampsAll(split.text || '');

    ui.customer.value = cleanForUI;
    ui.popup.style.display = 'block';
    ui.customer.focus();

    // Refresh context history (but do not change reply target)
    refreshClientHistoryFromDOM();

    // Call backend with last bubble content (includes meta internally)
    await callBackend(lastContent, lastBubble);
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
