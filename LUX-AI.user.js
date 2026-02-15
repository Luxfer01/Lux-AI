// ==UserScript==
// @name         LUX Starr Framework v13 (OpenRouter • Encrypted Key • Creative Booster • Strict Access • ConeID Gate • Vision Auto-Switch • Underage Guard • Age-Aware Jobs)
// @namespace    http://tampermonkey.net/
// @version      14.6.0
// @description  LUX: diverse AI-generated refusals and alibis (no pools), improved regen variability, fixed safety routing, vision kept, removed vision test block, expanded underage guard logic, banned phrase "family stuff"
// @match        https://myoperatorservice.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @connect      openrouter.ai
// @connect      api.openrouter.ai
// @connect      script.google.com
// @connect      static2.us35.myoperatorservice.com
// @connect      static2.us37.myoperatorservice.com
// @connect      static2.us36.myoperatorservice.com
// @connect      static2.us34.myoperatorservice.com
// @connect      static2.us33.myoperatorservice.com
// @run-at       document-end
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

  // Vision model default
  const VISION_MODEL_DEFAULT = 'google/gemini-2.0-flash-exp:free';

  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const POLL_MS = 3000;
  const HISTORY_MAX = 14;
  const REQUEST_TIMEOUT_MS = 45000;

  // ===== SELECTORS =====
  const REPLY_INPUT_SELECTOR = 'textarea#reply-textarea.form-control.border-start-0.border-end-0';
  const PERSONA_NAME_SEL = 'h5.fw-bold.mb-1';
  const PERSONA_LOC_SEL = 'h6.text-black-50';
  const THREAD_SEL = 'div#message-list.flex-grow-1.overflow-auto.p-4';
  const CLIENT_MSG_SELECTOR = 'div.d-flex.flex-row-reverse.my-2.message-box';
  const PERSONA_MSG_SELECTOR = 'div.d-flex.flex-row.my-2';
  const MEMBER_TIME_SEL = 'span#memberTime.fw-bold';

  const IMAGE_SELECTORS = [
    'img.rounded.mb-2',
    'div.d-flex.flex-row-reverse.my-2.message-box img',
    'div.message-box img',
    '.bg-white.rounded.p-2 img',
    'img[src*="static2"]',
    'img[src*="myoperatorservice"]',
    'img[alt]',
    '.message-box .rounded img',
    'div.col-7 img',
    'div.d-flex.flex-row-reverse img'
  ];

  const CLIENT_P_SELECTOR_ALL = '#message-list > div.d-flex.flex-row-reverse.my-2.message-box > div.d-flex.flex-column.col-7.bg-white.rounded.p-2 > p';
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
    temperature: 0.85,
    top_p: 0.95,
    repetition_penalty: 1.05,
    max_tokens: 200,
    presence_penalty: 0.3,
    frequency_penalty: 0.3
  };

  const MODEL_PRESETS = {
    'x-ai/grok-4-fast': {
      temperature: 0.88,
      top_p: 0.96,
      repetition_penalty: 1.04,
      max_tokens: 200,
      presence_penalty: 0.35,
      frequency_penalty: 0.3
    },
    'anthropic/claude-3.5-sonnet': {
      temperature: 0.82,
      top_p: 0.94,
      repetition_penalty: 1.03,
      max_tokens: 200,
      presence_penalty: 0.3,
      frequency_penalty: 0.25
    },
    'openai/gpt-4o-mini': {
      temperature: 0.85,
      top_p: 0.94,
      repetition_penalty: 1.04,
      max_tokens: 200,
      presence_penalty: 0.3,
      frequency_penalty: 0.3
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

  // ===== ENHANCED Creative booster =====
  const CREATIVE_BASE = 0.0;
  const CREATIVE_MAX = 0.4;
  const LUX_CREATIVE_STATE_KEY = 'lux_creative_state_v2';

  function lux_getCreativeState() {
    try {
      return JSON.parse(GM_getValue(LUX_CREATIVE_STATE_KEY, '{}')) || {};
    } catch {
      return {};
    }
  }

  function lux_setCreativeState(state) {
    GM_setValue(LUX_CREATIVE_STATE_KEY, JSON.stringify(state || {}));
  }

  function scoreCreativeIntent(text) {
    const s = (text || '').toLowerCase();
    let score = 0;

    if (/\b(cute|adorable|pretty|gorgeous|beautiful|handsome|hot|sexy|attractive)\b/.test(s)) score += 0.15;
    if (/\b(fun|play|vibe|chemistry|smile|eyes|sweet|love|like|enjoy)\b/.test(s)) score += 0.12;
    if (/\b(pic|pics|picture|selfie|photo|gallery|look|see you|show)\b/.test(s)) score += 0.10;
    if (/\b(how.*day|what.*up|tell me about|you like|you enjoy|your favorite|thinking about)\b/.test(s)) score += 0.08;
    if (/\b(you.*cute|you.*pretty|you.*beautiful|you.*gorgeous|you.*hot|nice.*pic|love.*photo)\b/.test(s)) score += 0.12;
    if (/\b(feel|feeling|miss|missing|can't stop|thinking|dream)\b/.test(s)) score += 0.10;

    if (/\b(fact|proof|specific|exact|details?|policy|rule|why|explain|clarify|how does)\b/.test(s)) score -= 0.08;
    if (/\b(meet|number|whatsapp|instagram|snap|telegram|address|call|text)\b/.test(s)) score -= 0.12;

    score += CREATIVE_BASE;
    return Math.max(-0.15, Math.min(CREATIVE_MAX, score));
  }

  function lux_getDaypart(date = new Date()) {
    const hour = date.getHours();
    if (hour < 5) return 'late-night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  }

  function withCreativeBoost(base, msg, visionNotes = '') {
    const state = lux_getCreativeState();
    const history = state.history || [];

    const score = scoreCreativeIntent(msg);
    history.push(score);
    if (history.length > 8) history.shift();

    const highCount = history.filter(s => s >= 0.10).length;
    const mediumCount = history.filter(s => s >= 0.05 && s < 0.10).length;

    let temperature = base.temperature ?? 0.85;
    let top_p = base.top_p ?? 0.95;
    let presence_penalty = base.presence_penalty ?? 0.3;
    let frequency_penalty = base.frequency_penalty ?? 0.3;

    const daypart = lux_getDaypart();
    if (daypart === 'late-night' || daypart === 'night') {
      temperature = Math.min(temperature + 0.1, 1.3);
      top_p = Math.min(top_p + 0.03, 0.98);
    } else if (daypart === 'morning') {
      temperature = Math.max(temperature - 0.05, 0.70);
    } else if (daypart === 'evening') {
      temperature = Math.min(temperature + 0.05, 1.1);
    }

    if (highCount >= 4) {
      temperature = Math.min(temperature + 0.25, 1.35);
      top_p = Math.min(top_p + 0.04, 0.98);
      presence_penalty = 0.4;
      frequency_penalty = 0.35;
    } else if (highCount >= 2 || mediumCount >= 4) {
      temperature = Math.min(temperature + 0.15, 1.2);
      top_p = Math.min(top_p + 0.03, 0.96);
      presence_penalty = 0.35;
      frequency_penalty = 0.3;
    } else if (highCount >= 1) {
      temperature = Math.min(temperature + 0.08, 1.0);
      top_p = Math.min(top_p + 0.02, 0.94);
      presence_penalty = 0.3;
    }

    if (visionNotes && visionNotes.trim()) {
      temperature = Math.min(temperature + 0.15, 1.35);
      top_p = Math.min(top_p + 0.03, 0.98);
      presence_penalty = Math.min(presence_penalty + 0.15, 0.5);
      console.log('[LUX CREATIVE] Vision boost applied');
    }

    lux_setCreativeState({ history });

    return {
      ...base,
      temperature,
      top_p,
      presence_penalty,
      frequency_penalty
    };
  }

  // ===== Regen variability =====
  const LUX_REGEN_STATE_KEY = 'lux_regen_state_v1';

  function lux_getRegenState() {
    try { return JSON.parse(GM_getValue(LUX_REGEN_STATE_KEY, '{}')) || {}; } catch { return {}; }
  }
  function lux_setRegenState(state) {
    GM_setValue(LUX_REGEN_STATE_KEY, JSON.stringify(state || {}));
  }
  function lux_turnKeyFromText(text) {
    const t = stripStampsAll(extractLuxImageMeta(String(text || '')).text || String(text || '')).slice(0, 400);
    let h = 0;
    for (let i = 0; i < t.length; i++) h = ((h << 5) - h) + t.charCodeAt(i) | 0;
    return 'k_' + String(h);
  }
  function lux_incRegenCount(turnKey) {
    const st = lux_getRegenState();
    const cur = Number.isFinite(st[turnKey]) ? st[turnKey] : 0;
    st[turnKey] = cur + 1;
    lux_setRegenState(st);
    return st[turnKey];
  }
  function lux_regenVariationInstruction(n) {
    const modes = [
      "Write a fresh reply with a different angle, keep it simple and natural.",
      "Rewrite with a slightly more playful tone, still realistic and calm.",
      "Rewrite shorter and more direct, still warm.",
      "Rewrite with more curiosity, ask a more interesting question that fits what they said.",
      "Rewrite with a softer vibe, less intense, more cozy.",
      "Rewrite with a bolder compliment or tease if it fits, keep it classy.",
      "Rewrite focusing on a specific detail they mentioned, avoid repeating any prior wording.",
    ];
    const pick = modes[(n - 1) % modes.length];
    return `${pick} Do not reuse phrases from your previous answer.`;
  }
  function lux_regenSamplingBump(base, regenCount) {
    const bump = Math.min(0.35, 0.08 + (regenCount * 0.06));
    return {
      temperature: Math.min(1.35, (base.temperature ?? 0.85) + bump),
      top_p: Math.min(0.98, (base.top_p ?? 0.95) + Math.min(0.04, regenCount * 0.01)),
      presence_penalty: Math.min(0.70, (base.presence_penalty ?? 0.3) + Math.min(0.35, regenCount * 0.08)),
      frequency_penalty: Math.min(0.70, (base.frequency_penalty ?? 0.3) + Math.min(0.25, regenCount * 0.05)),
    };
  }

  // ===== OpenRouter payload compatibility shim =====
  function sanitizePayloadForModel(payload, model) {
    const p = { ...payload };
    if ('transforms' in p) delete p.transforms;
    if ('logit_bias' in p && !p.logit_bias) delete p.logit_bias;
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

  // ===== Image extraction =====
  function getImageElements(node) {
    if (!node) return [];
    const allImages = [];

    for (const selector of IMAGE_SELECTORS) {
      try {
        const imgs = [...node.querySelectorAll(selector)];
        if (imgs.length > 0) allImages.push(...imgs);
      } catch (e) {
        console.warn('[LUX VISION] Selector failed:', selector, e);
      }
    }

    if (allImages.length === 0) {
      const directImgs = node.getElementsByTagName('img');
      if (directImgs.length > 0) allImages.push(...directImgs);
    }

    const seen = new Set();
    const unique = allImages.filter(img => {
      const src = img.getAttribute('src') || img.src || '';
      if (!src) return false;
      if (seen.has(src)) return false;
      seen.add(src);
      return true;
    });

    return unique;
  }

  function getImageNotes(node) {
    const imgs = getImageElements(node);
    const notes = [];
    imgs.forEach(img => {
      const alt = (img.getAttribute('alt') || '').trim();
      const src = (img.getAttribute('src') || img.src || '').trim();
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

  function extractClientTextFromBubble(bubble) {
    if (!bubble) return '';
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
.luxpatch-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.luxpatch-chip{background:#2b3545;border:1px solid #3c4c66;color:#cfe0ff;border-radius:999px;padding:4px 10px;font-size:12px}
.luxpatch-brand{font-weight:900;letter-spacing:.4px;color:#bcd7ff}
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
      <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-vision-enabled" checked> Enable vision</label>
      <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-vision-strict"> Strict (requires text with image)</label>
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
    visionEnabled: pop.querySelector('#lux-vision-enabled'),
    visionStrict: pop.querySelector('#lux-vision-strict'),
    save: pop.querySelector('#lux-save'),
  };

  ui.apiUrl.value = GM_getValue('lux_api_url', API_URL_DEFAULT);
  ui.apiKey.value = lux_getApiKey();
  ui.model.value = GM_getValue('lux_model', MODEL_DEFAULT);
  ui.visionModel.value = GM_getValue('lux_vision_model', VISION_MODEL_DEFAULT);
  ui.provider.value = GM_getValue('lux_provider', PROVIDER_DEFAULT);
  ui.persona.value = GM_getValue('lux_persona', '');
  ui.visionEnabled.checked = GM_getValue('lux_vision_enabled', 1) === 1;
  ui.visionStrict.checked = GM_getValue('lux_vision_strict', 0) === 1;

  const modelChoices = [
    'x-ai/grok-4-fast',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash-exp:free'
  ];

  const visionModelChoices = [
    'google/gemini-2.0-flash-exp:free',
    'openai/gpt-4o-mini',
    'openai/gpt-4o',
    'anthropic/claude-3.5-sonnet'
  ];

  let LUXSettingsDirty = false;

  const LUXPatch = (typeof window.LUXPatch !== 'undefined' ? window.LUXPatch : (window.LUXPatch = {}));

  LUXPatch.UIChips = (() => {
    const ids = { topbar: 'lux-topbar', chipModel: 'lux-chip-model', chipVision: 'lux-chip-vision', chipDaypart: 'lux-chip-daypart' };
    function timeChipLabel() {
      const tc = buildTimeContext();
      return `${tc.rawDayTime} , ${tc.daypart} , ${tc.dayName}`;
    }
    function mountTopbar(container) {
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
      "what do you do to relax on a thursday morning or evening",
      "what do you do to relax on a thursday evening",
      "let's build the connection first",
      "im not ready for that",
      "i'm not ready for that",
      "i need to focus on building a connection here",
      "i'd like to focus on getting to know each other first",
      "family stuff"
    ];
    const bannedRegexes = [
      /let['']?s\s+keep\s+building\s+(?:the\s+)?(?:heat|connection)(?:\s+or\s+(?:the\s+)?(?:heat|connection))?/gi,
      /keep\s+building\s+(?:the\s+)?(?:heat|connection)/gi,
      /\bbuild(?:ing)?\s+(?:the\s+|our\s+)?(?:heat|connection)\b/gi,
      /\bfamily\s+stuff\b/gi
    ];
    const substitutionPool = [
      "I'm happy staying right here in our chat.",
      "I like keeping things simple and cozy between us here.",
      "I like the way this feels here, just us and the conversation.",
      "I'm enjoying this space with you, right here.",
      "I'm all yours on this screen for now."
    ];
    function randomSub() {
      return substitutionPool[Math.floor(Math.random() * substitutionPool.length)] || substitutionPool[0];
    }
    function substitute(text) {
      if (!text) return text;
      let out = String(text);
      bannedPhrases.forEach(phrase => {
        if (!phrase) return;
        const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(out)) out = out.replace(regex, phrase.toLowerCase() === 'family stuff' ? 'personal stuff' : randomSub());
      });
      bannedRegexes.forEach(regex => {
        if (regex.test(out)) out = out.replace(regex, 'personal stuff');
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
     SMART UNDERAGE DETECTION
     =========================== */

  const UnderageDetector = {
    // Words that are often used as penis euphemisms. These should NOT trigger underage checks by themselves.
    euphemismTerms: [
      /\b(my\s+)?junior\b/i,
      /\b(little|lil)\s+(?:guy|man|dude|buddy|friend|fella)\b/i,
      /\b(big|little)\s+(?:boy|fella)\b/i,
      /\b(mr\.?\s+)?(?:big|little)\b/i,
      /\b(?:little\s+)?fella\b/i,
      /\b(?:my\s+)?little\s+one\b/i,
      /\b(?:my\s+)?little\s+buddy\b/i
    ],

    explicitAge: [
      /\b(i(?:'m|m| am)?|age(?:\s*is|\s*:)?|currently?)\s*(\d{1,2})\s*(?:yo|y\.?o\.?|yrs?\.?|years?\s*old|years?\s*of\s*age)\b/i,
      /\b(\d{1,2})\s*(?:yo|y\.?o\.?|yrs?\.?)?\s*(?:fe?male|boy|girl|m|f)\b/i,
      /\bturning\s*(\d{1,2})\b/i,
      /\b(\d{1,2})\s*(?:next\s*)?(?:birthday|bday)\b/i,
      /\bjust\s*turned\s*(\d{1,2})\b/i,
      /\bI(?:'m| am)\s*only\s*(\d{1,2})\b/i,
      /\bborn\s+in\s+(20\d{2})\b/i,
    ],

    schoolContext: [
      /\b(middle\s*school|junior\s*high)(?!\s*(?:diploma|degree|graduate))\b/i,
      /\b(freshman|sophom[o]re)(?!\s*(?:in\s+college|at\s+university))\b/i,
      /\b(high\s*school)(?!\s*(?:diploma|degree|graduate|reunion))\b/i,
      /\b(9th|10th|11th|grade\s*(?:9|10|11))(?!\s*(?:teacher|level))\b/i,
      /\b(year\s*(?:9|10|11))(?!\s*(?:anniversary|plan))\b/i,
    ],

    relativeAge: [
      /\b(under|less\s*than|not\s*(?:yet|even))\s*18\b/i,
      /\b(?<!not\s+a\s+)minor\b/i,
      /\bnot\s*(?:legal|old\s*enough)\b/i,
      /\bstill\s*in\s*(?:school|high\s*school)\b/i,
      /\btoo\s*young\b/i,
      /\bnot\s*(?:18|of\s*age)\s*yet\b/i,
    ],

    pastTenseIndicators: [
      /\b(when\s+i\s+was|back\s+when|at\s+(?:the\s+)?age\s+of|years\s+ago|as\s+a\s+kid|as\s+a\s+child|growing\s+up)\s*$/i,
    ],

    hasEuphemism(text) {
      for (const pattern of this.euphemismTerms) {
        if (pattern.test(text)) return true;
      }
      return false;
    },

    extract(text) {
      const normalized = text.toLowerCase().trim();
      const euphemismPresent = this.hasEuphemism(normalized);

      // 1) Explicit ages always win, even if euphemism words are present
      for (const pattern of this.explicitAge) {
        const match = normalized.match(pattern);
        if (match) {
          let age = null;

          if (pattern.source.includes('born')) {
            const year = parseInt(match[1], 10);
            if (year >= 2000 && year <= new Date().getFullYear()) {
              age = new Date().getFullYear() - year;
            }
          } else {
            age = parseInt(match[2] || match[1], 10);
          }

          if (age >= 1 && age <= 120) {
            const contextBefore = normalized.slice(Math.max(0, (match.index || 0) - 50), (match.index || 0));
            let isPast = false;
            for (const pastPattern of this.pastTenseIndicators) {
              if (pastPattern.test(contextBefore)) { isPast = true; break; }
            }
            if (!isPast) return age;
          }
        }
      }

      // 2) If euphemism terms are present, do NOT infer underage from vague "minor"/school-like phrases
      // This prevents false rejects when they mean their dick, not their age.
      if (euphemismPresent) return null;

      // 3) School context inference
      if (!/\b(college|university|grad\s*school|adult\s*education)\b/i.test(normalized)) {
        for (const pattern of this.schoolContext) {
          if (pattern.test(normalized)) return 16;
        }
      }

      // 4) Relative age inference
      for (const pattern of this.relativeAge) {
        if (pattern.test(normalized)) return 17;
      }

      return null;
    }
  };

  function normalizeClientText(t) {
    return stripStampsAll(String(t || '')).toLowerCase();
  }

  function scanAllClientMessagesForUnderage() {
    const els = [...document.querySelectorAll(CLIENT_P_SELECTOR_ALL)];
    const allText = els.map(el => (el?.innerText || '').trim()).join(' ');
    const combinedAge = UnderageDetector.extract(normalizeClientText(allText));

    if (combinedAge !== null && combinedAge < 18) {
      return { underage: true, age: combinedAge, source: 'combined' };
    }

    for (const el of els) {
      const raw = (el?.innerText || '').trim();
      const age = UnderageDetector.extract(normalizeClientText(raw));
      if (age !== null && age < 18) {
        return { underage: true, age, source: 'individual' };
      }
    }

    return { underage: false, age: null };
  }

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

  /* ===========================
     SAFETY (AI-GENERATED, NO POOLS)
     =========================== */

  const Safety = (() => {
    const CONTACT_REQUEST_RE = /\b(?:what(?:'| i)?s\s+(?:your\s+)?(?:number|no\.?|email)|give\s+me\s+(?:your\s+)?(?:number|email)|add\s+me\s+on\s+(?:whatsapp|ig|instagram|snap(?:chat)?|telegram|discord)|dm\s+me\s+on\s+(?:ig|instagram|x|twitter)|hit\s+me\s+up\s+on\s+(?:whatsapp|ig|instagram|snap|telegram|discord)|call\s+me|text\s+me|send\s+me\s+(?:your\s+)?contact|share\s+(?:your\s+)?(?:number|email)|give\s+me\s+your\s+contact|reach\s+me\s+at)\b/i;

    const MEET_RE = /\b(?:let['']?s\s+(?:meet|hang(?:\s*out)?|link\s*up|grab\s+(?:a\s+)?(?:drink|coffee)|go\s+for\s+(?:drinks?|coffee))|coffee\s+soon|plan\s+for\s+a\s+coffee|see\s+you\s+(?:tonight|tomorrow|later)|(?:bar|club|restaurant|dinner|lunch|brunch|date|coffee|café|cafe|drinks?|hookup))\b/i;

    const ADDRESS_RE = /\b(address|house|apartment|home|street|avenue|road|rd\.?|st\.?)\b/i;
    const NAME_RE = /\b(what(?:'| i)?s\s+your\s+name|ur\s*name|name\s*please|name\s*pls|who\s+are\s+you)\b/i;
    const LOCATION_RE = /\b(where\s+do\s+you\s+(?:live|stay)|where\s+are\s+you|what\s+city|your\s+city|your\s+location|where\s+are\s+you\s+based|where\s+are\s+u\s+at|what\s+part\s+are\s+you\s+in|where\s+do\s+you\s+reside|what\s+part\s+of\s+town|where\s+you\s+located|where\s+are\s+you\s+located)\b/i;

    const USER_MENTIONS_FAMILY_RE = /\b(family|my\s+(?:sister|brother|mom|mother|dad|father|parents?|cousin|aunt|uncle|kids?|child|niece|nephew)|babysit(?:ting)?|family\s+issues?)\b/i;
    const FAMILY_WORD_RE = /\b(family|mom|mother|dad|father|parents?|sister|brother|cousin|aunt|uncle|kids?|child|children|babysit(?:ting)?|relatives?)\b/gi;

    const BAN_FAMILY_STUFF_RE = /\bfamily\s+stuff\b/gi;

    const wantsContact = s => CONTACT_REQUEST_RE.test((s || '').toLowerCase());
    const wantsMeet = s => MEET_RE.test((s || '').toLowerCase());
    const mentionsAddress = s => ADDRESS_RE.test((s || '').toLowerCase());
    const askName = s => NAME_RE.test((s || '').toLowerCase());
    const wantsLocation = s => LOCATION_RE.test((s || '').toLowerCase());

    function normalizeRefusalOutput(text) {
      let t = String(text || '').trim();
      if (!t) return t;
      t = t.replace(BAN_FAMILY_STUFF_RE, 'personal stuff');
      return t;
    }

    // AI-GENERATED ALIBIS - no pools
    async function generateCreativeAlibi(context = '') {
      const key = lux_getApiKey().trim();
      if (!key) return "I'm keeping things here for now";

      const timeContext = buildTimeContext();

      const systemPrompt = [
        "You're a woman making a believable excuse for why you cannot share contact info or meet up right now.",
        "Create ONE unique, specific, realistic reason.",
        "Do not mention family unless the user mentioned family first.",
        "Never use the phrase family stuff.",
        "Keep it brief, 5 to 12 words.",
        "Make it sound like a real person texting.",
        `Current time: ${timeContext.daypart}, ${timeContext.dayName}.`,
        "Only output the excuse, nothing else."
      ].join(' ');

      const userPrompt = context
        ? `Context: They said "${context.slice(0, 120)}". Give one unique excuse.`
        : "Give one unique excuse.";

      const payload = {
        model: GM_getValue('lux_model', MODEL_DEFAULT),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1.15,
        top_p: 0.95,
        max_tokens: 45,
        presence_penalty: 0.7,
        frequency_penalty: 0.7
      };

      try {
        const response = await new Promise((resolve) => {
          GM_xmlhttpRequest({
            method: 'POST',
            url: OPENROUTER_API_URL,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
              'HTTP-Referer': location.origin,
              'X-Title': 'LUX Alibi Generator'
            },
            data: JSON.stringify(payload),
            timeout: 20000,
            onload: (res) => {
              if (res.status >= 200 && res.status < 300) {
                try {
                  const data = JSON.parse(res.responseText);
                  const content = data?.choices?.[0]?.message?.content?.trim();
                  resolve(content || '');
                } catch { resolve(''); }
              } else resolve('');
            },
            onerror: () => resolve(''),
            ontimeout: () => resolve('')
          });
        });

        const cleaned = normalizeRefusalOutput(response);
        if (cleaned) return cleaned;
      } catch (e) {
        console.error('[LUX ALIBI] failed', e);
      }

      return "I'm keeping it here for now";
    }

    // AI-GENERATED REFUSALS - no pools
    async function generateCreativeRefusal(requestType, customerMsg, leftCard) {
      const key = lux_getApiKey().trim();
      const timeContext = buildTimeContext();

      // If no key, still avoid repetition: generate a mini-alibi and a question
      if (!key) {
        const excuse = await generateCreativeAlibi(customerMsg);
        return normalizeRefusalOutput(`${excuse}. What are you in the mood to talk about right now?`);
      }

      const systemPrompt = [
        "You're a woman on a dating site declining a request naturally.",
        `Request type: ${requestType}.`,
        "Decline politely but firmly, give a realistic excuse, then change the subject.",
        "Make it unique and human, no repetitive templates.",
        "Never use the phrase family stuff.",
        "No meetups, no contact info, no social handles.",
        "Use only comma, period, question mark, apostrophe.",
        "No emojis.",
        `Current: ${timeContext.daypart}, ${timeContext.dayName}.`,
        personaCardLine(leftCard) || '',
        "Output 1 to 2 sentences."
      ].join(' ');

      const userPrompt = `They said: "${String(customerMsg || '').slice(0, 180)}". Decline and ask an engaging question that fits what they said.`;

      const payload = {
        model: GM_getValue('lux_model', MODEL_DEFAULT),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1.02,
        top_p: 0.95,
        max_tokens: 95,
        presence_penalty: 0.6,
        frequency_penalty: 0.6
      };

      try {
        const response = await new Promise((resolve) => {
          GM_xmlhttpRequest({
            method: 'POST',
            url: OPENROUTER_API_URL,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
              'HTTP-Referer': location.origin,
              'X-Title': 'LUX Refusal Generator'
            },
            data: JSON.stringify(payload),
            timeout: 25000,
            onload: (res) => {
              if (res.status >= 200 && res.status < 300) {
                try {
                  const data = JSON.parse(res.responseText);
                  const content = data?.choices?.[0]?.message?.content?.trim();
                  resolve(content || '');
                } catch { resolve(''); }
              } else resolve('');
            },
            onerror: () => resolve(''),
            ontimeout: () => resolve('')
          });
        });

        return normalizeRefusalOutput(response || '');
      } catch (e) {
        console.error('[LUX REFUSAL] failed', e);
      }

      const excuse = await generateCreativeAlibi(customerMsg);
      return normalizeRefusalOutput(`${excuse}. What are you into when you are not busy?`);
    }

    // Underage reply: AI-generated, no pool
    async function generateUnderageReply(customerMsg) {
      const key = lux_getApiKey().trim();
      if (!key) return "I can't continue if you're under 18, take care.";

      const systemPrompt = [
        "Write one short safety message.",
        "The user may be under 18.",
        "Say you cannot continue and keep it calm and respectful.",
        "No extra advice, no judgement.",
        "Use only comma, period, question mark, apostrophe.",
        "No emojis.",
        "Output one sentence only."
      ].join(' ');

      const userPrompt = `They said: "${String(customerMsg || '').slice(0, 160)}". Write the one sentence message.`;

      const payload = {
        model: GM_getValue('lux_model', MODEL_DEFAULT),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.95,
        top_p: 0.95,
        max_tokens: 45,
        presence_penalty: 0.7,
        frequency_penalty: 0.7
      };

      try {
        const response = await new Promise((resolve) => {
          GM_xmlhttpRequest({
            method: 'POST',
            url: OPENROUTER_API_URL,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
              'HTTP-Referer': location.origin,
              'X-Title': 'LUX Underage Reply'
            },
            data: JSON.stringify(payload),
            timeout: 20000,
            onload: (res) => {
              if (res.status >= 200 && res.status < 300) {
                try {
                  const data = JSON.parse(res.responseText);
                  const content = data?.choices?.[0]?.message?.content?.trim();
                  resolve(content || '');
                } catch { resolve(''); }
              } else resolve('');
            },
            onerror: () => resolve(''),
            ontimeout: () => resolve('')
          });
        });

        return String(response || '').trim();
      } catch {
        return "I can't continue if you're under 18, take care.";
      }
    }

    function deFamily(text, customerMsg) {
      if (!text) return text;
      const userMentionedFamily = USER_MENTIONS_FAMILY_RE.test(customerMsg || '');
      if (userMentionedFamily) return text;

      let t = String(text);
      if (FAMILY_WORD_RE.test(t)) {
        t = t.replace(FAMILY_WORD_RE, '').replace(/\s{2,}/g, ' ').trim();
        if (!t || t.length < 15) return '';
      }
      return t;
    }

    return {
      wantsContact,
      wantsMeet,
      mentionsAddress,
      askName,
      wantsLocation,
      deFamily,
      generateCreativeAlibi,
      generateCreativeRefusal,
      generateUnderageReply,
      normalizeRefusalOutput
    };
  })();

  // ===== Post-formatting =====
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
    t = t.replace(/\bfamily\s+stuff\b/gi, 'personal stuff');
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

  // ===== Vision =====
  function fetchImageAsBase64(url) {
    return new Promise((resolve, reject) => {
      if (!url) return resolve(null);

      GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        timeout: 35000,
        headers: { 'Accept': 'image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8' },
        onload: (res) => {
          try {
            if (res.status < 200 || res.status >= 300) return reject(new Error('Image HTTP ' + res.status));
            if (!res.response || res.response.byteLength === 0) return reject(new Error('Empty image response'));

            const bytes = new Uint8Array(res.response);
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, chunk);
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

    const strict = GM_getValue('lux_vision_strict', 0) === 1;
    const imgs = getImageElements(lastBubble);
    if (!imgs.length) return '';
    if (strict && (!rawMsg || !rawMsg.trim())) return '';

    const src = (imgs[0].getAttribute('src') || imgs[0].src || '').trim();
    if (!src) return '';

    const visionModel = (GM_getValue('lux_vision_model', VISION_MODEL_DEFAULT) || VISION_MODEL_DEFAULT).trim();
    const key = lux_getApiKey().trim();
    if (!key) return '';

    let b64 = null;
    try {
      b64 = await fetchImageAsBase64(src);
      if (!b64) return '';
    } catch {
      return '';
    }

    let mediaType = 'image/jpeg';
    if (src.toLowerCase().includes('.png')) mediaType = 'image/png';
    else if (src.toLowerCase().includes('.webp')) mediaType = 'image/webp';
    else if (src.toLowerCase().includes('.gif')) mediaType = 'image/gif';

    const visionPrompt = [
      "You're a warm woman chatting on a dating site.",
      "Describe what you see in the photo clearly and naturally.",
      "Be specific about what you notice, clothing, setting, expression, pose.",
      "Keep it 2 to 3 sentences.",
      "No emojis.",
      "No explicit content.",
      "Only comma, period, question mark, apostrophe."
    ].join(' ');

    const userPrompt = rawMsg
      ? `They sent a photo and said: "${String(rawMsg).slice(0, 180)}". What do you see?`
      : "What do you see in this photo?";

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: `${visionPrompt}\n\n${userPrompt}` },
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${b64}` } }
        ]
      }
    ];

    const payload = {
      model: visionModel,
      messages,
      temperature: 0.8,
      top_p: 0.92,
      max_tokens: 150
    };

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
        timeout: 50000,
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
    const tc = buildTimeContext();

    const baseCore = [
      "You're a real woman chatting on a dating site.",
      "Be natural, warm, relaxed. Write like you text a friend.",
      "Keep it simple and genuine, avoid robotic patterns.",
      "Reply to what they just said.",
      "Only use: comma, period, question mark, apostrophe.",
      "No emojis.",
      "Never use the phrase family stuff.",
      "No meetups, no sharing contacts, no social media handles.",
      "If they ask for contact or to meet, decline politely and change the subject.",
      `Right now it's ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
      "End with one engaging question that fits what they just said."
    ].join(' ');

    let photoContext = "";
    if (visionNotes && visionNotes.trim()) {
      photoContext = ` They sent a photo. What you noticed: ${visionNotes.trim()}. React naturally to what you saw.`;
    } else if (imageNotes && imageNotes.trim()) {
      photoContext = ` They sent a photo. Acknowledge it warmly.`;
    }

    if (customSystem && customSystem.trim()) {
      return customSystem + " " + photoContext + " " + card;
    }

    return baseCore + " " + photoContext + " " + card;
  }

  // ===== LLM call helper =====
  async function llmCall(messages, overrides = {}, modelOverride = null) {
    if (!lux_canSendRequest()) throw new Error('Rate-limited');
    const key = lux_getApiKey().trim();
    const model = (modelOverride || GM_getValue('lux_model', MODEL_DEFAULT)).trim();
    if (!key) throw new Error('Missing OpenRouter API key');

    const base = getModelPreset(model);
    const lastMsg = messages[messages.length - 1];
    const visionNotes = (lastMsg && lastMsg.visionContext) ? lastMsg.visionContext : '';
    const tuned = withCreativeBoost(base, (lastMsg?.content) || '', visionNotes);

    let body = sanitizePayloadForModel({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: tuned.temperature,
      top_p: tuned.top_p,
      max_tokens: tuned.max_tokens,
      repetition_penalty: tuned.repetition_penalty,
      presence_penalty: tuned.presence_penalty,
      frequency_penalty: tuned.frequency_penalty,
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

  const asksJob = (q) => /\b(what\s+do\s+you\s+do|what\s+do\s+you\s+do\s+for\s+work|what\s+is\s+your\s+job|what\s+work\s+do\s+you\s+do|what\s+do\s+you\s+do\s+for\s+a\s+living|your\s+occupation)\b/i.test((q || '').toLowerCase());

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

  async function callBackend(msgText, lastBubble = null, opts = {}) {
    if (!lux_canSendRequest()) return;

    const leftCard = parseLeftProfile();

    const rawWithMeta = stripStampsKeepMeta((msgText || '').toString());
    const split = extractLuxImageMeta(rawWithMeta);
    const rawMsg = stripStampsAll(split.text || '');
    const imageNotes = (split.notes || '').trim();

    const turnKey = lux_turnKeyFromText(msgText);
    const isRegen = !!opts.regen;
    const regenCount = isRegen ? lux_incRegenCount(turnKey) : 0;

    // Underage check
    const under = scanAllClientMessagesForUnderage();
    if (under.underage) {
      const u = await Safety.generateUnderageReply(rawMsg);
      const out = postFormat(u);
      showReplies([out]);
      return;
    }

    // Hard safety routing - AI-generated refusals
    if (Safety.wantsMeet(rawMsg) || Safety.wantsContact(rawMsg) || Safety.mentionsAddress(rawMsg)) {
      let requestType = 'general';
      if (Safety.wantsMeet(rawMsg)) requestType = 'meetup';
      else if (Safety.wantsContact(rawMsg)) requestType = 'contact';
      else if (Safety.mentionsAddress(rawMsg)) requestType = 'address';

      let out = await Safety.generateCreativeRefusal(requestType, rawMsg, leftCard);
      out = Safety.deFamily(out, rawMsg);
      if (!out || out.length < 12) out = await Safety.generateCreativeRefusal('general', rawMsg, leftCard);
      out = postFormat(out);

      // If model accidentally includes meet/contact, force a second pass
      if (Safety.wantsMeet(out) || Safety.wantsContact(out) || Safety.mentionsAddress(out)) {
        let safer = await Safety.generateCreativeRefusal('general', rawMsg, leftCard);
        safer = postFormat(safer);
        out = safer || out;
      }

      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }

    // Name shortcut
    if (Safety.askName(rawMsg)) {
      const profName = (leftCard && leftCard.realName) ? leftCard.realName : 'Luna';
      const sys = "You're chatting naturally. One short response. No emojis. Only comma, period, question mark, apostrophe. Never use the phrase family stuff. End with a natural question.";
      const user = `They asked your name. Tell them it's "${profName}" and ask something that fits what they said.`;
      let out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], { max_tokens: 100, temperature: 0.85 });
      out = postFormat(out);
      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }

    // Location shortcut
    if (Safety.wantsLocation(rawMsg)) {
      const profCity = (leftCard && leftCard.location) ? leftCard.location : 'nearby';
      const sys = "Share your city casually. One short response. No emojis. Only comma, period, question mark, apostrophe. Never use the phrase family stuff. Ask something back that fits the conversation.";
      const user = `Tell them you're in "${profCity}" and ask an engaging question that matches what they just said.`;
      let out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], { max_tokens: 110, temperature: 0.85 });
      out = postFormat(out);
      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }

    // Job question
    if (asksJob(rawMsg)) {
      const age = getProfileAge();
      const job = pickJobForAge(age || 35);
      const tc = buildTimeContext();
      const sys = [
        "You're chatting naturally about your job.",
        "Answer casually and confidently.",
        "Only comma, period, question mark, apostrophe. No emojis.",
        "Never use the phrase family stuff.",
        `It's ${tc.daypart}.`
      ].join(' ');
      const user = `They asked what you do. Say you're a ${job}. Mention it naturally and ask something back that fits what they said.`;
      let out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], { max_tokens: 150, temperature: 0.9 });
      out = postFormat(out);
      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }

    // Vision analysis
    let visionNotes = '';
    try {
      if (lastBubble) visionNotes = await runVisionAnalysisIfNeeded(lastBubble, rawMsg);
    } catch {
      visionNotes = '';
    }

    // Normal path
    let system = buildSystemPrompt(
      leftCard,
      (GM_getValue('lux_persona', '') || '').trim(),
      imageNotes,
      visionNotes
    );

    if (isRegen) {
      system += " " + lux_regenVariationInstruction(regenCount);
    }

    const chosenModel = (GM_getValue('lux_model', MODEL_DEFAULT) || MODEL_DEFAULT).trim();
    const historyForModel = lux_buildHistoryByTokens(shortHistory, 3000);

    const userMessage = {
      role: 'user',
      content: rawMsg || (imageNotes ? "They sent a photo." : "Hey."),
      visionContext: visionNotes
    };

    const messages = [
      { role: 'system', content: system },
      ...historyForModel,
      userMessage
    ];

    const key = lux_getApiKey().trim();
    if (!key) {
      errorReply('Missing OpenRouter API key. Open LUX, go to Settings and add your key.');
      return;
    }

    const basePreset = withCreativeBoost(getModelPreset(chosenModel), rawMsg, visionNotes);
    const regenBump = isRegen ? lux_regenSamplingBump(basePreset, regenCount) : {};
    const finalSampling = { ...basePreset, ...regenBump };

    GM_xmlhttpRequest({
      method: 'POST',
      url: GM_getValue('lux_api_url', API_URL_DEFAULT).trim(),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'HTTP-Referer': location.origin,
        'X-Title': 'LUX'
      },
      data: JSON.stringify({
        model: chosenModel,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: finalSampling.temperature,
        top_p: finalSampling.top_p,
        max_tokens: finalSampling.max_tokens,
        repetition_penalty: finalSampling.repetition_penalty,
        presence_penalty: finalSampling.presence_penalty,
        frequency_penalty: finalSampling.frequency_penalty
      }),
      timeout: REQUEST_TIMEOUT_MS,
      onload: async (res) => {
        try {
          if (res.status < 200 || res.status >= 300) {
            let msg;
            if (res.status === 401) msg = 'OpenRouter API key is invalid.';
            else if (res.status === 402) msg = 'OpenRouter billing issue (HTTP 402).';
            else if (res.status === 404) msg = 'Model not found (HTTP 404).';
            else if (res.status === 429) msg = 'Rate limit reached (HTTP 429).';
            else msg = `HTTP ${res.status}`;
            errorReply(msg);
            return;
          }
          const data = JSON.parse(res.responseText || '{}');
          const raw = (data?.choices?.[0]?.message?.content || '');
          if (!raw) {
            errorReply('Empty response from API.');
            return;
          }

          let content = raw;

          // If model output tries to do meetups/contacts, replace with AI refusal (unique)
          if (Safety.wantsMeet(content) || Safety.wantsContact(content) || Safety.mentionsAddress(content)) {
            const requestType = Safety.wantsMeet(content) ? 'meetup' : Safety.wantsContact(content) ? 'contact' : 'address';
            content = await Safety.generateCreativeRefusal(requestType, rawMsg, leftCard);
          }

          content = Safety.normalizeRefusalOutput(content);
          content = postFormat(content);

          LUXPatch.UIChips.refresh({ modelLabel: chosenModel, visionLabel: ui.visionModel.value || 'default' });
          showReplies([content]);
          pushHist(rawMsg, content);
        } catch (e) {
          errorReply('Parse error: ' + String(e));
        }
      },
      onerror: () => errorReply('Network error.'),
      ontimeout: () => errorReply('Request timed out.')
    });
  }

  // ===== Paste to site =====
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
    if (!el) {
      notify('Reply box not found.');
      return false;
    }
    el.scrollIntoView({ block: 'nearest' });
    el.click();
    el.focus();
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
      if (confirm('Save settings before closing?')) ui.save.click();
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
    GM_setValue('lux_vision_enabled', ui.visionEnabled && ui.visionEnabled.checked ? 1 : 0);
    GM_setValue('lux_vision_strict', ui.visionStrict && ui.visionStrict.checked ? 1 : 0);
    LUXPatch.UIChips.refresh({ modelLabel: ui.model.value || 'default', visionLabel: ui.visionModel.value || 'default' });
    LUXSettingsDirty = false;
    alert('Saved');
  });

  ['apiUrl', 'apiKey', 'model', 'visionModel', 'provider', 'persona'].forEach(k => {
    ui[k].addEventListener('input', () => { LUXSettingsDirty = true; });
  });
  ui.visionEnabled.addEventListener('change', () => { LUXSettingsDirty = true; });
  ui.visionStrict.addEventListener('change', () => { LUXSettingsDirty = true; });

  ui.send.addEventListener('click', async () => {
    const msg = stripStampsAll((ui.customer.value || '').trim());
    if (!msg) {
      notify('Type a message first.');
      return;
    }
    await callBackend(msg, null, { regen: false });
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
      await callBackend(msg, null, { regen: true });
    } finally {
      ui.regen.disabled = false;
    }
  };

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
    const src = imgs.length ? (imgs[0].getAttribute('src') || imgs[0].src || '').trim() : '';
    return (text + '||' + src).slice(0, 900);
  }

  function refreshClientHistoryFromDOM() {
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

    const lastContent = extractMessageContentFromBubble(lastBubble);

    // reset regen counter for this new turn
    const tk = lux_turnKeyFromText(lastContent);
    const st = lux_getRegenState();
    st[tk] = 0;
    lux_setRegenState(st);

    const split = extractLuxImageMeta(lastContent || '');
    const cleanForUI = stripStampsAll(split.text || '');

    ui.customer.value = cleanForUI;
    ui.popup.style.display = 'block';
    ui.customer.focus();

    refreshClientHistoryFromDOM();

    await callBackend(lastContent, lastBubble, { regen: false });
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
