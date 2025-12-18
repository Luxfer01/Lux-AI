// ==UserScript==
// @name         LUX-AI Framework v13 (OpenRouter • Encrypted Key • Creative Booster • All-Model Compatible • Punctuation Fixes • No-Family Excuses • ConeID Access Gate)
// @namespace    http://tampermonkey.net/
// @version      13.0.2
// @description  Refactored LUX: encrypted OpenRouter key, Apps Script fallback with grace mode, adaptive history, persistent creative booster, self-aware picture acceptance (no canned lines), topbar chips, bans preserved (“oh/oh wow”, “flattered*”, “enthusiasm* / enthusaism*”, non-food “spicy”, “flirt*”), soft-bans (“unwind / errands / favorite”), no-family excuses unless user mentions family first, no contacts/meetups, 800-char cap, one natural open-ended question.
// @match        https://myoperatorservice.com/*
// @updateURL    https://raw.githubusercontent.com/Luxfer01/Lux-AI/refs/heads/user.js/Lux-AI
// @downloadURL  https://raw.githubusercontent.com/Luxfer01/Lux-AI/refs/heads/user.js/Lux-AI
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @connect      openrouter.ai
// @connect      api.openrouter.ai
// @connect      script.google.com
// @run-at       document-end
// ==/UserScript==
// ============================
   LUX ConeID ACCESS CONTROL
   (STRICT – no grace mode)
   ============================ */

// IMPORTANT: this must match your deployed Apps Script URL
const ACCESS_API_ENDPOINT = "https://script.google.com/macros/s/AKfycbxbT4oMvS55vseWSjmsGt3DRSFqyrgMWY-30G44Ui6sjDwary2o0uVmrb0F9RBTh3gYJA/exec";

// we still keep a cache, but ONLY to remember the last ConeID used
// and the last result. Access is always checked live with the server.
const LUX_ACCESS_CACHE_KEY_V2 = "lux_access_cache_v2";
// structure: { coneId, allowed, expiresAt, checkedAt, reason }

// simple modal to request ConeID
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
      <button id="lux_cone_btn" style="margin-top:12px;padding:8px 18px;font-size:16px;border-radius:8px;border:0;background:#0b3d91;color:#fff;font-weight:600;cursor:pointer;">Submit</button>
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

// hard lock overlay
function lux_lockUI(reason) {
  const div = document.createElement("div");
  div.style.cssText = `
    position:fixed;inset:0;z-index:999999;
    background:rgba(0,0,0,0.9);
    color:#fff;font-family:system-ui,sans-serif;
    display:flex;align-items:center;justify-content:center;
    text-align:center;padding:32px;font-size:18px;
  `;
  div.textContent = `Access denied: ${reason || "not whitelisted"}. Contact admin to be added.`;
  document.body.appendChild(div);
}

// shared error overlay for API problems (NOT as chat text)
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

function lux_getAccessCache() {
  try {
    const raw = GM_getValue(LUX_ACCESS_CACHE_KEY_V2, "");
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
    GM_setValue(LUX_ACCESS_CACHE_KEY_V2, JSON.stringify(data || {}));
  } catch (e) {
    console.warn("LUX access store error", e);
  }
}

// STRICT gate: always check live, no grace, cache only stores ConeID + last result
async function lux_ensureAccess() {
  const now = Date.now();
  let cache = lux_getAccessCache();

  // always have a ConeID, but NEVER trust old "allowed" blindly
  const coneId = (cache && cache.coneId) || (await lux_promptConeId());
  if (!coneId) {
    lux_lockUI("no ConeID provided");
    return false;
  }

  const result = await lux_checkOnlineAccess(coneId);

  // if the license server itself is unreachable → hard fail
  if (!result || result.reason === "network-error") {
    lux_setAccessCache({
      coneId,
      allowed: false,
      checkedAt: now,
      reason: result && result.reason ? result.reason : "license-server-unreachable"
    });
    lux_showErrorOverlay("LUX cannot reach the license server right now. Access is blocked until it responds.");
    lux_lockUI("license server unreachable");
    return false;
  }

  // any explicit "not allowed" or expired → instant lock
  let expiresAt = null;
  if (result.expires) {
    const ts = new Date(result.expires + "T23:59:59").getTime();
    if (!isNaN(ts)) {
      expiresAt = ts;
    }
  }

  if (!result.allowed || (expiresAt && now > expiresAt)) {
    lux_setAccessCache({
      coneId,
      allowed: false,
      checkedAt: now,
      expiresAt: expiresAt || null,
      reason: result.reason || (expiresAt && now > expiresAt ? "expired" : "not-allowed")
    });
    lux_lockUI(result.reason || (expiresAt && now > expiresAt ? "access-expired" : "not-allowed"));
    return false;
  }

  // if we’re here: live check says ALLOWED right now
  lux_setAccessCache({
    coneId,
    allowed: true,
    checkedAt: now,
    expiresAt: expiresAt || null,
    reason: "ok"
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

  // MAIN DEFAULT: Grok 4 (fast)
  const MODEL_DEFAULT = 'x-ai/grok-4-fast';
  const PROVIDER_DEFAULT = 'openrouter';

  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const POLL_MS = 3000;
  const HISTORY_MAX = 14; // still used as a soft top, but we prune by tokens too
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
    // migrate from old plain storage if present
    const enc = GM_getValue(LUX_API_KEY_ENC, '');
    if (enc) {
      return lux_xorDecrypt(enc);
    }
    const legacy = GM_getValue(LUX_API_KEY_PLAIN_OLD, '').trim();
    if (legacy) {
      const newEnc = lux_xorEncrypt(legacy);
      GM_setValue(LUX_API_KEY_ENC, newEnc);
      // GM_setValue(LUX_API_KEY_PLAIN_OLD, '');
      return legacy;
    }
    return OPENROUTER_KEY_DEFAULT;
  }

  function lux_setApiKey(plainKey) {
    const enc = lux_xorEncrypt(plainKey || '');
    GM_setValue(LUX_API_KEY_ENC, enc);
    // GM_setValue(LUX_API_KEY_PLAIN_OLD, '');
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

  // ===== Creative-leaning per-model presets (only the models we keep) =====
  const MODEL_PRESETS = {
    // 1) Default – Grok 4 (fast), playful/clever vibe
    'x-ai/grok-4-fast': {
      temperature: 0.72,
      top_p: 0.96,
      repetition_penalty: 1.02,
      max_tokens: 240,
      stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
      seed: 13
    },

    // 2) Anthropic Sonnet – softer, emotional RP
    'anthropic/claude-3.5-sonnet': {
      temperature: 0.62,
      top_p: 0.92,
      repetition_penalty: 1.02,
      max_tokens: 240,
      stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
      seed: 21
    },

    // 3) GPT-4.1 mini – precise, obedient, still warm
    'openai/gpt-4.1-mini': {
      temperature: 0.55,
      top_p: 0.92,
      repetition_penalty: 1.03,
      max_tokens: 240,
      stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
      seed: 7
    },

    // 4) Free Meta Llama – 3.3 8B
    'meta-llama/llama-3.3-8b-instruct:free': {
      temperature: 0.65,
      top_p: 0.95,
      repetition_penalty: 1.04,
      max_tokens: 220,
      stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
      seed: 17
    },

    // 5) Free Meta Llama – 3.3 70B
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

  // ===== Rate limiting & token estimate =====
  const LUX_RATE_WINDOW_MS = 10_000;
  const LUX_RATE_MAX_REQ = 5;
  const LUX_RATE_LOG_KEY = 'lux_req_log_v1';

  function lux_getReqLog() {
    try {
      return JSON.parse(GM_getValue(LUX_RATE_LOG_KEY, '[]')) || [];
    } catch {
      return [];
    }
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
    return Math.ceil(String(str).length / 4); // rough
  }

  // ===== Adaptive creativity booster (persistent + daypart) =====
  const CREATIVE_BASE = 0.0;
  const CREATIVE_MAX = 0.25;
  const LUX_CREATIVE_STATE_KEY = 'lux_creative_state_v1';

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

  function scoreCreativeIntent(text){
    const s = (text||'').toLowerCase();
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

  function withCreativeBoost(base, msg){
    const state = lux_getCreativeState();
    const history = state.history || [];
    const score = scoreCreativeIntent(msg);
    history.push(score);
    if (history.length > 5) history.shift();
    const highCount = history.filter(s => s >= 0.10).length;

    let temperature = base.temperature ?? 0.7;
    let top_p = base.top_p ?? 0.9;

    const daypart = lux_getDaypart();
    // subtle daypart shifts
    if (daypart === 'late-night' || daypart === 'night') {
      temperature = Math.min(temperature + 0.05, 1.1);
    } else if (daypart === 'morning') {
      temperature = Math.max(temperature - 0.05, 0.45);
    }

    if (highCount >= 3) {
      temperature = Math.min(temperature + 0.15, 1.2);
      top_p = Math.min(top_p + 0.05, 1.0);
    } else if (highCount >= 1) {
      temperature = Math.min(temperature + 0.05, 1.0);
    } else {
      // decay gently back toward base
      temperature = temperature * 0.9 + base.temperature * 0.1;
      top_p = top_p * 0.9 + base.top_p * 0.1;
    }

    lux_setCreativeState({ history });

    return { ...base, temperature, top_p };
  }

  // ===== OpenRouter payload compatibility shim =====
  function sanitizePayloadForModel(payload, model){
    const m = (model||'').toLowerCase();
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
  function _qs(r,s){try{return s?r.querySelector(s):null;}catch{return null;}}
  function _qst(r,s){const el=_qs(r,s);return el?el.innerText.trim():'';}
  function extractBracketName(s){if(!s)return'';let m=s.match(/\(([^()]*)\)\s*$/);if(!m)m=s.match(/\(([^)]+)\)/);return(m&&m[1])?m[1].trim():'';}
  function cleanOutsideName(s){if(!s)return'';return s.replace(/\s*\([^)]*\)\s*/g,'').trim();}
  function parseLeftProfile(){
    const rawName=_qst(document,PERSONA_NAME_SEL);
    return {
      rawName,
      realName: extractBracketName(rawName)||'',
      displayName: cleanOutsideName(rawName)||rawName,
      location: _qst(document,PERSONA_LOC_SEL)||'nearby'
    };
  }
  function personaCardLine(card){
    if(!card) return '';
    const bits=[]; if(card.realName) bits.push(`RealName: ${card.realName}`);
    if(card.displayName)bits.push(`Username: ${card.displayName}`);
    if(card.location) bits.push(`Location: ${card.location}`);
    return bits.length ? ` Persona card, ${bits.join(', ')}.` : '';
  }
  function notify(text){try{GM_notification({text,title:'LUX',timeout:3500});}catch{console.log('[LUX]',text);} }
  function trimText(s,max){ s = (s||'').toString(); return s.length>max ? s.slice(0,max)+'...' : s; }

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
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const el = document.querySelector(MEMBER_TIME_SEL);
    const raw = el?.textContent?.trim() || '';
    const parseHour24 = (txt) => {
      const m = txt.match(/(\d{1,2})[:.](\d{2})(?:\s*([AP]\.?M\.?))?/i);
      if (!m) return NaN;
      let h = parseInt(m[1],10);
      const ap = (m[3]||'').replace(/\./g,'').toUpperCase();
      if (!ap) return Math.min(23, Math.max(0, h));
      if (ap === 'AM') { if (h === 12) h = 0; }
      else if (ap === 'PM') { if (h !== 12) h += 12; }
      return h;
    };
    const parseDayIndex = (txt) => {
      const s = (txt||'').toLowerCase();
      const map = {sun:0, mon:1, tue:2, tues:2, wed:3, thu:4, thur:4, fri:5, sat:6};
      const long = s.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
      if (long) return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(long[0]);
      const short = s.match(/\b(sun|mon|tue|tues|wed|thu|thur|fri|sat)\b/);
      if (short) return map[short[0]];
      return NaN;
    };
    const now = new Date();
    const hour24 = Number.isFinite(parseHour24(raw)) ? parseHour24(raw) : now.getHours();
    const dayIndex = Number.isFinite(parseDayIndex(raw)) ? parseDayIndex(raw) : now.getDay();
    const dayName = dayNames[dayIndex] || now.toLocaleDateString(undefined,{weekday:'long'});
    const daypart = (h)=> (h>=5 && h<12)?'morning':(h<17)?'afternoon':(h<22)?'evening':'night';
    const fallbackTime = now.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
    const fallbackDayShort = dayShort[now.getDay()];
    const rawDayTime = raw && /\d/.test(raw) ? raw : `${fallbackDayShort} ${fallbackTime}`;
    return { hour24, dayIndex, dayName, daypart: daypart(hour24), rawDayTime, raw };
  }

  // ===== Base Styles =====
  const css=document.createElement('style');
  css.textContent=`
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
  const btn=document.createElement('button');btn.id='lux-btn';btn.textContent='LUX';document.body.appendChild(btn);
  const pop=document.createElement('div');pop.id='lux-popup';
  pop.innerHTML=`
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
    <div><strong>Provider</strong></div><input type="text" id="lux-provider">
    <div><strong>Custom Persona (optional)</strong></div><textarea id="lux-persona"></textarea>
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:4px">
      <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-excuse-via-model" checked> Use model for creative refusals</label>
      <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="lux-filter-enabled"> Enable explicit filter</label>
    </div>
    <button id="lux-save" style="margin-top:6px;background:#0b3d91;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-weight:700">Save</button>
  </div>`;
  document.body.appendChild(pop);

  const ui={
    popup:pop,
    topbar:pop.querySelector('#lux-topbar'),
    customer:pop.querySelector('#lux-customer'),
    list:pop.querySelector('#lux-responses'),
    send:pop.querySelector('#lux-send'),
    regen:pop.querySelector('#lux-regen'),
    models:pop.querySelector('#lux-models'),
    modelsPanel:pop.querySelector('#lux-models-panel'),
    settings:pop.querySelector('#lux-settings'),
    close:pop.querySelector('#lux-close'),
    panel:pop.querySelector('#lux-settings-panel'),
    apiUrl:pop.querySelector('#lux-api-url'),
    apiKey:pop.querySelector('#lux-api-key'),
    model:pop.querySelector('#lux-model'),
    provider:pop.querySelector('#lux-provider'),
    persona:pop.querySelector('#lux-persona'),
    excuseViaModel:pop.querySelector('#lux-excuse-via-model'),
    filterEnabled:pop.querySelector('#lux-filter-enabled'),
    save:pop.querySelector('#lux-save'),
  };

  // Load settings (with encrypted key)
  ui.apiUrl.value = GM_getValue('lux_api_url', API_URL_DEFAULT);
  ui.apiKey.value = lux_getApiKey();
  ui.model.value = GM_getValue('lux_model', MODEL_DEFAULT);
  ui.provider.value = GM_getValue('lux_provider', PROVIDER_DEFAULT);
  ui.persona.value = GM_getValue('lux_persona','');
  ui.excuseViaModel.checked = GM_getValue('lux_excuse_via_model',1)===1;
  ui.filterEnabled.checked = !!GM_getValue('lux_filter_enabled',0);

  // ===== Models picker =====
  const modelChoices = [
    'x-ai/grok-4-fast',                         // default
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4.1-mini',
    'meta-llama/llama-3.3-8b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
  ];
  let LUXSettingsDirty = false;

  function renderModelButtons(){
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
        // auto link provider
        const providerField = ui.provider;
        if (providerField) {
          if (/gpt-|o3-|o1-/.test(m)) providerField.value = 'openai';
          else providerField.value = 'openrouter';
          GM_setValue('lux_provider', providerField.value.trim());
        }
        LUXSettingsDirty = true;
        notify('Model set to ' + m);
        LUXPatch.UIChips.refresh({ modelLabel: m });
        renderModelButtons();
      });
      p.appendChild(b);
    });
  }
  function toggleModelsPanel(){
    const p = ui.modelsPanel;
    const open = getComputedStyle(p).display !== 'none' && getComputedStyle(p).visibility !== 'hidden';
    if (open){ p.style.display = 'none'; p.style.visibility = 'hidden'; }
    else { renderModelButtons(); p.style.display = 'block'; p.style.visibility = 'visible'; }
  }
  ui.models.addEventListener('click', toggleModelsPanel);

  // ===== Timestamp stripper =====
  const TS_PATTERNS=[
    /\[\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*\]/gi,
    /\(\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\s*\)/gi,
    /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/gi,
    /\b20\d{2}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    /\b20\d{2}[01]\d[0-3]\d(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?\b/g,
    /\b\d{6,}\b/g,
    /\breport\b\.?$/gi
  ];
  function stripTimestamps(s){let t=(s||'').trim();TS_PATTERNS.forEach(rx=>{t=t.replace(rx,'').trim();});t=t.replace(/[-–—|•]+\s*$/g,'').replace(/^\s*[-–—|•]+\s*/g,'').trim();return t;}

  // ===== LUXPatch namespaces =====
  const LUXPatch = (typeof window.LUXPatch!=='undefined' ? window.LUXPatch : (window.LUXPatch = {}));

  /* ===========================
     PATCH: UI Topbar Chips
     =========================== */
  LUXPatch.UIChips = (()=>{
    const ids = { topbar:'lux-topbar', chipModel:'lux-chip-model', chipDaypart:'lux-chip-daypart' };
    function ensureStyles(){
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
    function timeChipLabel(){
      const tc = buildTimeContext();
      return `${tc.rawDayTime} • ${tc.daypart} • ${tc.dayName}`;
    }
    function mountTopbar(container){
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
      refresh({modelLabel:'default'});
      return top;
    }
    function refresh({modelLabel}){
      const m=document.getElementById(ids.chipModel);
      const d=document.getElementById(ids.chipDaypart);
      if(m && modelLabel) m.textContent=`model: ${modelLabel}`;
      if(d) d.textContent=timeChipLabel();
    }
    function unmount(){const n=document.getElementById(ids.topbar); if(n) n.remove();}
    return { mountTopbar, refresh, unmount, ids };
  })();

  // Mount topbar chips now:
  LUXPatch.UIChips.mountTopbar(ui.topbar);
  LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value||'default') });

  /* ===========================
     PATCH: No-Repeat Guard
     (substitution-based, with extra template killers)
     =========================== */
  LUXPatch.NoRepeat = (()=>{

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
      "I’m a bit shy to share my contact",
      "I'm a bit shy to share my contact",

      // extra template killers:
      "what do you do to relax on a thursday morning or evening",
      "what do you do to relax on a thursday evening",
      "let's build the connection first",
      "im not ready for that",
      "i'm not ready for that",
      "i need to focus on building a connection here",
      "i'd like to focus on getting to know each other first"
    ];

    const substitutionPool = [
      "I'm keeping things light and comfortable here with you.",
      "I'm happy staying right here in our chat.",
      "I'm enjoying keeping this between us on the platform.",
      "I like the way things feel here, just the two of us.",
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
        if (regex.test(out)) {
          const repl = randomSub();
          out = out.replace(regex, repl);
        }
      });
      return out;
    }
    function patterns(){ return []; }
    function excuseFrags(){ return []; }
    function scrub(text){ return substitute(text); }
    return { patterns, excuseFrags, scrub, substitute };
  })();

  /* =========================================
     Safety & Refusals (concise, no-family)
     ========================================= */
  const Safety = (() => {
    // ==== DETECTORS ====
    const CONTACT_REQUEST_RE = /\b(?:what(?:'| i)?s\s+(?:your\s+)?(?:number|no\.?|email)|give\s+me\s+(?:your\s+)?(?:number|email)|add\s+me\s+on\s+(?:whatsapp|ig|instagram|snap(?:chat)?|telegram|discord)|dm\s+me\s+on\s+(?:ig|instagram|x|twitter)|hit\s+me\s+up\s+on\s+(?:whatsapp|ig|instagram|snap|telegram|discord)|call\s+me|text\s+me|send\s+me\s+(?:your\s+)?contact|share\s+(?:your\s+)?(?:number|email)|give\s+me\s+your\s+contact|reach\s+me\s+at)\b/i;
    const MEET_EXPLICIT_RE = /\b(?:let['’]?s\s+(?:meet|hang(?:\s*out)?|link\s*up|grab\s+(?:a\s+)?(?:drink|coffee)|go\s+for\s+(?:drinks?|coffee))|see\s+you\s+(?:tonight|tomorrow|later)|(?:bar|club|restaurant|dinner|lunch|brunch|date|coffee|café|cafe|drinks?|hookup))\b/i;
    const MEET_INDIRECT_RE = /\b(?:are\s+you\s+(?:available|free|around)\b|you\s+(?:free|available)\b|when\s+(?:are\s+you\s+)?free\b|what\s+time\s+works\b|would\s+you\s+like\s+to\s+meet\b|can\s+we\s+(?:meet|link|hang)\b|can\s+i\s+see\s+you\b|see\s+you\s+(?:later|tonight)\b|pull\s+up\b|come\s+through\b)\b/i;
    const ADDRESS_RE = /\b(address|house|apartment|home|street|avenue|road|rd\.?|st\.?)\b/i;
    const NAME_RE = /\b(what(?:'| i)?s\s+your\s+name|ur\s*name|name\s*please|name\s*pls|who\s+are\s+you)\b/i;
    const LOCATION_RE = /\b(where\s+do\s+you\s+(?:live|stay)|where\s+are\s+you|what\s+city|your\s+city|your\s+location|where\s+are\s+you\s+based|where\s+are\s+u\s+at|what\s+part\s+are\s+you\s+in|where\s+do\s+you\s+reside|what\s+part\s+of\s+town|where\s+you\s+located|where\s+are\s+you\s+located)\b/i;

    // If user mentions family first, we may mirror it; otherwise we avoid it.
    const USER_MENTIONS_FAMILY_RE = /\b(family|my\s+(?:sister|brother|mom|mother|dad|father|parents?|cousin|aunt|uncle|kids?|child|niece|nephew)|babysit(?:ting)?|family\s+issues?)\b/i;
    const FAMILY_WORD_RE = /\b(family|mom|mother|dad|father|parents?|sister|brother|cousin|aunt|uncle|kids?|child|children|babysit(?:ting)?|relatives?)\b/gi;

    const wantsContact = s => CONTACT_REQUEST_RE.test((s||'').toLowerCase());
    const wantsMeet = s => MEET_EXPLICIT_RE.test((s||'').toLowerCase());
    const wantsMeetSoft = s => MEET_INDIRECT_RE.test((s||'').toLowerCase());
    const mentionsAddress= s => ADDRESS_RE.test((s||'').toLowerCase());
    const askName = s => NAME_RE.test((s||'').toLowerCase());
    const wantsLocation = s => LOCATION_RE.test((s||'').toLowerCase());

    function deFamily(text, customerMsg){
      if (!text) return text;
      const userMentionedFamily = USER_MENTIONS_FAMILY_RE.test(customerMsg||'');
      if (userMentionedFamily) return text;

      let t = String(text);
      if (FAMILY_WORD_RE.test(t)) {
        const pool = [
          "I've got a few things to handle tonight",
          "I promised myself a quiet evening",
          "I've got an early start and need to relax",
          "I'm in the middle of small chores and bits",
          "I'm cooking and keeping it low-key",
          "My battery/data's tight so I’m keeping it light",
          "I'm catching up on work and want to stay focused",
          "I’m staying in and keeping it simple"
        ];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        t = t.replace(FAMILY_WORD_RE, '').replace(/\s{2,}/g, ' ').trim();
        if (!t || t.length < 8) t = pick + '.';
        else if (!/[.?!]\s*$/.test(t)) t += '.';
      }
      return t;
    }

    async function modelRefusal(kind, profileCard, customerMsg){
      const tc = buildTimeContext();
      const sys = [
        "You are an adult woman on a dating site. Natural, warm, concise.",
        "No meetups/contacts/addresses; keep everything on-platform.",
        "Be evasive and polite; avoid policy-ish wording.",
        "Avoid family-related excuses (family, parents, kids, babysitting, relatives) unless the customer explicitly mentioned family first.",
        "Prefer neutral reasons: timing/early start, staying in, chores, cooking, work focus, battery/data low, bad connection, gym, pet care, travel fatigue, personal boundary.",
        "Avoid: 'oh', 'oh wow', 'flattered*', 'enthusiasm*/enthusaism*', 'sizzling', non-food 'spicy', and 'flirt*'.",
        "End with one natural, flow-matching open-ended question created by you. No templates.",
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        (personaCardLine(profileCard)||'')
      ].join(' ');
      const reason = kind==='meet' ? 'They suggested meeting or asked about availability.'
                  : kind==='address' ? 'They asked for an address.'
                  : 'They asked for contacts/handle.';
      const user = `Context: ${reason}\nCustomer: "${(customerMsg||'').slice(0,240)}"\nReturn only the text, 1–2 sentences. Keep it human and light.`;

      const concise = { max_tokens: 100, temperature: 0.30, top_p: 0.88 };
      let out = '';
      try { out = await llmCall([{role:'system',content:sys},{role:'user',content:user}], concise); } catch {}
      out = deFamily(out||'', customerMsg);
      out = postFormat(out||'');
      return out || "I'm keeping it here and low-key, thanks for understanding.";
    }

    async function enforceNoMeetAccept(userMsg, text, profileCard){
      const BAD = /\b(?:i(?:'| )?m\s+(?:free|available)\b|we\s+can\s+(?:meet|link|hang)\b|let'?s\s+(?:meet|link|hang)\b|what\s+time\s+works\b|where\s+should\s+we\s+meet\b|i\s+can\s+pull\s+up\b|come\s+through\b)\b/i;
      if (!text) return text;
      if (BAD.test(String(text).toLowerCase())){
        return await modelRefusal('meet', profileCard, userMsg);
      }
      return deFamily(text, userMsg);
    }

    return { wantsContact, wantsMeet, wantsMeetSoft, mentionsAddress, askName, wantsLocation, modelRefusal, enforceNoMeetAccept };
  })();

  /* =============================
     Light formatting (non-CNTF)
     ============================= */
  const ALLOWED_RE = /[^0-9A-Za-z\s\.,\?']/g;

  function isFoodContext(full){
    const s = (full||'').toLowerCase();
    return /\b(food|meal|dish|pepper|soup|stew|rice|jollof|noodles?|cuisine|restaurant|flavor|taste|cook|cooking|eat|snack|breakfast|lunch|dinner)\b/.test(s);
  }

  function purgeBannedWords(s){
    if(!s) return s;
    let t = s;
    t = t.replace(/(^|[.!?]\s+)(?:[Oo]h(?:\s+(?:wow|my))?|[Ww]ow)\b[,\-!.]?\s*/g, (_m, pre) => pre || '');
    t = t.replace(/\bflatter(?:ed|ing|s)?\b/gi, 'appreciate');
    t = t
      .replace(/\benthus(?:iasm|iasms|iastic(?:ally)?|e|ed|es|ing)\b/gi, 'interest')
      .replace(/\benthusiasm(s)?\b/gi, 'interest')
      .replace(/\benthusaism(s)?\b/gi, 'interest')
      .replace(/\bwith\s+(?:great\s+)?enthusiasm\b/gi, 'with interest')
      .replace(/\bwith\s+(?:eager|high)\s+(?:enthusiasm|excitement)\b/gi, 'with interest');
    t = t.replace(/\bsizzling\b/gi, 'lively');
    if (!isFoodContext(t)) t = t.replace(/\bspicy\b/gi, 'bold');
    t = t.replace(/\bflirty\b/gi, 'playful');
    t = t.replace(/\bflirt(?:s|ed|ing)?\b/gi, 'chat');
    t = t.replace(/let['’]?s\s+keep\s+(?:the\s+)?(?:conversation|chat)\s+(?:sizzling|fun\s+and\s+hot|spicy|going)\s+here\b/gi, "let's stay here and talk more");
    t = t.replace(/keep\s+(?:it\s+)?(?:fun|hot|sizzling)\b/gi, 'let’s keep talking');
    t = t.replace(/\s{2,}/g,' ').trim();
    return t;
  }

  function toAscii(s){
    return (s||'')
      .replace(/\u2018|\u2019/g,"'")
      .replace(/\u201C|\u201D/g,'"')
      .replace(/\u2032|\u02BC|`|\u00B4/g,"'")
      .replace(/[–—\-]/g,' ')
      .replace(/\u2026/g,'...')
      .replace(/\r?\n+/g,' ');
  }

  function smartPunct(s){
    let t=(s||'');
    t=t.replace(/!/g,'');
    t=t.replace(/[:;()]/g,' ');
    t=t.replace(/\s*([,\.?])\s*/g,'$1 ');
    t=t.replace(/\.{3,}/g,'...');
    t=t.replace(/\s{2,}/g,' ');
    return t.trim();
  }
  function stripDisallowedPunct(s){return (s||'').replace(ALLOWED_RE,'');}

  function fixMissingApostrophes(s){
    let t = s;
    const rules = [
      [/\bim\b/g, "i'm"],
      [/\bive\b/g, "i've"],
      [/\bill\b/g, "i'll"],
      [/\bid\b/g, "i'd"],
      [/\byoure\b/g, "you're"],
      [/\byouve\b/g, "you've"],
      [/\byoull\b/g, "you'll"],
      [/\btheyre\b/g, "they're"],
      [/\btheyve\b/g, "they've"],
      [/\btheyll\b/g, "they'll"],
      [/\bhes\b/g, "he's"],
      [/\bshes\b/g, "she's"],
      [/\bitll\b/g, "it'll"],
      [/\bitd\b/g, "it'd"],
      [/\bcant\b/g, "can't"],
      [/\bdont\b/g, "don't"],
      [/\bwont\b/g, "won't"],
      [/\bshouldnt\b/g, "shouldn't"],
      [/\bcouldnt\b/g, "couldn't"],
      [/\bwouldnt\b/g, "wouldn't"],
      [/\bdidnt\b/g, "didn't"],
      [/\bdoesnt\b/g, "doesn't"],
      [/\barent\b/g, "aren't"],
      [/\bisnt\b/g, "isn't"],
      [/\bwasnt\b/g, "wasn't"],
      [/\bwerent\b/g, "weren't"],
      [/\bhavent\b/g, "haven't"],
      [/\bhasnt\b/g, "hasn't"],
      [/\bhadnt\b/g, "hadn't"],
      [/\bmustnt\b/g, "mustn't"],
      [/\bneednt\b/g, "needn't"],
    ];
    for (const [re, to] of rules) t = t.replace(re, to);
    return t;
  }

  function applyLexiconPrefs(s){
    const LEXICON_PREFS = [
      { from:/\binterested\b/gi, to:'curious' },
      { from:/\bvery\b/gi, to:'' },
      { from:/\bsexy\b/gi, to:'bold' },
      { from:/\bunwind\b/gi, to:'relax' },
      { from:/\berrand(s)?\b/gi, to:'small chores' },
      { from:/\bfavo(u?)rite(s)?\b/gi, to:'best thing' }
    ];
    let t = s;
    for (const r of LEXICON_PREFS) t = t.replace(r.from, r.to);
    return t;
  }
  function normalizeSpaces(s){
    let t=(s||'').replace(/\s+/g,' ');
    t=t.replace(/\s+([,\.?])/g,'$1');
    t=t.replace(/([,\.?])(?!\s|$)/g,'$1 ');
    t=t.replace(/\s{2,}/g,' ');
    return t.trim();
  }
  function capBoundaries(s){return s.replace(/(^|[\.?\s]\s+)([a-z])/g,(m,p1,p2)=>p1+p2.toUpperCase());}
  function fixPronounI(s){
    return s
      .replace(/\b(i)\b/g,'I')
      .replace(/\bi'm\b/gi,"I'm")
      .replace(/\bi've\b/gi,"I've")
      .replace(/\bi'd\b/gi,"I'd")
      .replace(/\bi'll\b/gi,"I'll");
  }
  function ensureTerminalPunct(s){s=s.trim();return s?(/[\.?]$/.test(s)?s:(s+'.')):s;}
  function enforceFeminineTone(s){
    let t=s||'';
    t=t.replace(/\bI'm\s+(?:a\s+)?(?:guy|man|male)\b/gi,"I'm a woman");
    t=t.replace(/\bI\s+identify\s+as\s+(?:a\s+)?(?:man|male)\b/gi,"I identify as a woman");
    t=t.replace(/\bI'm\s*(?:he\/him|he\/him\/his)\b/gi,"I'm she/her");
    t=t.replace(/\bmy\s+pronouns\s*(?:are|:)\s*(?:he\/him|he\/him\/his)\b/gi,"my pronouns are she/her");
    return t;
  }

  function postFormat(text){
    if(!text) return text;
    let t=stripTimestamps(text);
    t=toAscii(t);
    t=enforceFeminineTone(t);
    t=stripDisallowedPunct(t);
    t=smartPunct(t);
    t=purgeBannedWords(t);
    t=applyLexiconPrefs(t);
    t=fixMissingApostrophes(t);
    t=normalizeSpaces(t);
    t=capBoundaries(t);
    t=fixPronounI(t);
    if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === 'function') {
      t = LUXPatch.NoRepeat.scrub(t);
    }
    t=ensureTerminalPunct(t);
    return clampToLimit(t);
  }

  // ===== Intent helpers =====
  const wantsPics=(q)=>/\b(pics?|pictures?|photos?|selfie|images?|gallery|more\s+pictures?)\b/i.test((q||'').toLowerCase());

  // ===== LLM call (OpenRouter) with presets + booster + shim =====
  async function llmCall(messages, overrides = {}) {
    if (!lux_canSendRequest()) throw new Error('Rate-limited');
    const key = lux_getApiKey().trim();
    const model = GM_getValue('lux_model', MODEL_DEFAULT).trim();
    if (!key) throw new Error('Missing OpenRouter API key');

    const base = getModelPreset(model);
    const tuned = withCreativeBoost(base, (messages?.[messages.length-1]?.content)||'');
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
          try{
            if(res.status<200||res.status>=300) {
              return reject(new Error(`OpenRouter HTTP ${res.status}: ${trimText(res.responseText,280)}`));
            }
            const data=JSON.parse(res.responseText||'{}');
            const content=data?.choices?.[0]?.message?.content?.trim();
            if(!content) return reject(new Error('Empty content from OpenRouter'));
            resolve(content);
          }catch(e){reject(e);}
        },
        onerror:()=>reject(new Error('OpenRouter network error')),
        ontimeout:()=>reject(new Error('OpenRouter timeout'))
      });
    });
  }

  // ===== System prompt (model-aware, still with bans & safety) =====
  function buildSystemPrompt(leftCard, customSystem){
    const card = (personaCardLine(leftCard) || '');
    const modelName = (GM_getValue('lux_model', MODEL_DEFAULT) || '').trim().toLowerCase();

    // Shared core rules for ALL models
    const baseCore = [
      "You are an adult woman (she/her) on a dating site.",
      "Your tone is natural, warm, feminine and relaxed, never robotic.",
      "Your primary goal is to build deep, engaging rapport through short, unique messages.",
      "Refusals: never use phrases that sound like stock boundaries such as \"let's build the connection first\", \"I'm not ready for that\", or any version of \"keep it online for now\".",
      "If you need to decline something, do it briefly and then pivot into a new, interesting topic instead of explaining your boundary.",
      "Picture requests: always accept picture requests in a soft, platform-safe way. Do not refuse or deflect them. Vary your wording so it does not sound templated or repeated between chats.",
      "Safety: never share or ask for contacts/handles; no meetups, dates, drinks, or coffee; keep everything on-platform.",
      "Location asks: share only city, never an address or specific area.",
      "Name asks: use the real name from the profile parentheses when giving your name.",
      "Avoid family-related excuses unless the customer mentions family first.",
      "Banned language: do not use 'oh', 'oh wow', any form of 'flattered', any form of 'enthusiasm/enthusaism', 'sizzling', non-food 'spicy', or any 'flirt*' word.",
      "Form: one short paragraph, no emojis, about 70–150 words (the client enforces an 800-character cap).",
      "End with exactly one natural open-ended question that fits the flow of what you just said. It must not sound like a recycled template."
    ].join(" ");

    // Model-specific flavour layers
    let flavor = "";

    if (modelName.startsWith("x-ai/grok-4")) {
      // Grok 4 – witty, fast, slightly chaotic
      flavor = [
        "Lean into a witty, quick, slightly teasing vibe without being rude.",
        "You can be playfully sarcastic, but never mean or dismissive.",
        "Keep replies punchy and high-energy, like you're quick on your feet in conversation."
      ].join(" ");
    } else if (modelName.startsWith("anthropic/claude-3.5-sonnet")) {
      // Sonnet – soft, emotional, romantic
      flavor = [
        "Lean into a softer, emotionally aware, romantic tone.",
        "Use sensory detail and gentle language, but keep it grounded and not overly poetic.",
        "Let your replies feel intimate and attentive, like you're genuinely tuned into the other person."
      ].join(" ");
    } else if (modelName.startsWith("openai/gpt-4.1-mini")) {
      // GPT-4.1 mini – precise, obedient, but warm
      flavor = [
        "Focus on being clear, coherent and highly responsive to the exact wording of their message.",
        "You should feel composed and thoughtful, with a subtle warmth rather than dramatic emotions.",
        "Reflect their questions directly and give specific, concrete responses before you pivot to a question."
      ].join(" ");
    } else if (modelName.includes("llama-3.3-8b")) {
      // Llama 3.3 8B free – playful, simple, light
      flavor = [
        "Use simple, direct language and avoid complex or overly long sentences.",
        "Keep the tone light, playful and easy-going, like small talk that slowly builds chemistry.",
        "If you're unsure, ask a small follow-up question to keep the chat moving naturally."
      ].join(" ");
    } else if (modelName.includes("llama-3.3-70b")) {
      // Llama 3.3 70B free – expressive, slightly richer
      flavor = [
        "You can be a bit more descriptive and expressive than the 8B model, but still stay concise.",
        "Let your replies feel colourful and human without drifting into copy-paste romance lines.",
        "Gently mirror the customer's style and energy level so the conversation feels personalised."
      ].join(" ");
    } else {
      // Any other future model – fall back to neutral flavour
      flavor = [
        "Keep the style balanced: warm, human, slightly playful, but never over the top.",
        "Match their energy level and avoid sounding generic or scripted."
      ].join(" ");
    }

    const core = baseCore + " " + flavor;

    // If user provided a custom persona/system block, respect it but still attach card
    if (customSystem && customSystem.trim()) {
      return customSystem + " " + card;
    }

    return core + card;
  }

  // ===== History =====
  let shortHistory=[];let lastSeen='';
  function _threadKey(){try{const name=(parseLeftProfile().realName||'Lux');const path=(location.pathname||'/').slice(0,128);return`lux_thread_${name}__${path}`;}catch{return'lux_thread_Lux__/';}}
  function _loadHistory(){try{const raw=GM_getValue(_threadKey(),'[]');const arr=JSON.parse(raw);if(Array.isArray(arr))shortHistory=arr.slice(-HISTORY_MAX);}catch{}}
  function _saveHistory(){try{GM_setValue(_threadKey(),JSON.stringify(shortHistory.slice(-HISTORY_MAX)));}catch{}}
  _loadHistory();

  function lux_cleanHistoryMessage(msg) {
    const content = stripTimestamps(msg.content || '');
    let out = content;
    if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === 'function') {
      out = LUXPatch.NoRepeat.scrub(out);
    }
    return { ...msg, content: out };
  }
  function lux_cleanHistoryArray(history) {
    return history.map(lux_cleanHistoryMessage);
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
  function showReplies(items){
    ui.list.innerHTML='';
    items.forEach(txt=>{
      const finalTxt = clampToLimit(stripTimestamps(txt));
      const d=document.createElement('div');
      d.className='lux-reply';
      d.textContent=finalTxt;
      d.addEventListener('click',async()=>{
        const ok=await pasteToSite(finalTxt);
        if(ok) ui.popup.style.display='none';
      });
      ui.list.appendChild(d);
    });
  }

  // NEW: errors now go to overlay, not as chat replies
  function errorReply(text){
    console.error('[LUX] error', text);
    lux_showErrorOverlay(String(text || 'Unknown error contacting OpenRouter.'));
  }

  // ===== Backend call (OpenRouter endpoint prefilled) =====
  async function callBackend(msgText){
    if (!lux_canSendRequest()) return;

    const leftCard=parseLeftProfile();
    const rawMsg=stripTimestamps((msgText||'').toString());
    window.__LUX_LAST_USER = rawMsg;

    const picAsk = wantsPics(rawMsg); // currently just detection; acceptance is handled in system prompt

    // Routed intents (Safety)
    if(Safety.askName(rawMsg)) {
      const profName=(leftCard&&leftCard.realName)?leftCard.realName:'Luna';
      const sys='Natural US English. One short paragraph. No contacts or meetups. No emojis. Avoid family excuses unless user mentioned family first. Avoid "oh/oh wow", "flattered*", "enthusiasm*", "sizzling", non-food "spicy", and "flirt*". End with one natural, flow-matching open-ended question created by you.';
      const user=`They asked your name. Use exactly: "${profName}". ${personaCardLine(leftCard)||''}\nCustomer: "${rawMsg.slice(0,240)}"`;
      const concise = { max_tokens: 100, temperature: 0.30, top_p: 0.88 };
      let line=await llmCall([{role:'system',content:sys},{role:'user',content:user}], concise);
      line = Safety.enforceNoMeetAccept ? await Safety.enforceNoMeetAccept(rawMsg, line, leftCard) : line;
      line = postFormat(line);
      showReplies([line]); pushHist(rawMsg,line); return;
    }
    if(Safety.wantsLocation(rawMsg)) {
      const profCity=(leftCard&&leftCard.location)?leftCard.location:'nearby';
      const sys='If asked where you are, give city only. No address. One short paragraph. No emojis. Avoid family excuses unless user mentioned family first. Avoid "oh/oh wow", "flattered*", "enthusiasm*", "sizzling", non-food "spicy", and "flirt*". End with one natural, flow-matching open-ended question created by you.';
      const user=`City only: "${profCity}". ${personaCardLine(leftCard)||''}\nCustomer: "${rawMsg.slice(0,240)}"`;
      const concise = { max_tokens: 100, temperature: 0.30, top_p: 0.88 };
      let line=await llmCall([{role:'system',content:sys},{role:'user',content:user}], concise);
      line = Safety.enforceNoMeetAccept ? await Safety.enforceNoMeetAccept(rawMsg, line, leftCard) : line;
      line = postFormat(line);
      showReplies([line]); pushHist(rawMsg,line); return;
    }
    if(Safety.wantsMeet(rawMsg) || Safety.wantsMeetSoft(rawMsg)) {
      let out = await Safety.modelRefusal('meet', leftCard, rawMsg);
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      out = postFormat(out);
      showReplies([out]); pushHist(rawMsg,out); return;
    }
    if(Safety.wantsContact(rawMsg) || Safety.mentionsAddress(rawMsg)) {
      let kind = Safety.mentionsAddress(rawMsg)?'address':'contact';
      let out = await Safety.modelRefusal(kind, leftCard, rawMsg);
      out = postFormat(out);
      showReplies([out]); pushHist(rawMsg,out); return;
    }

    // Normal path — OpenRouter direct
    const system=buildSystemPrompt(leftCard,(GM_getValue('lux_persona','')||'').trim());
    const chosenModel = GM_getValue('lux_model', MODEL_DEFAULT);
    const basePreset = getModelPreset(chosenModel);
    const tuned = withCreativeBoost(basePreset, rawMsg);

    const historyForModel = lux_buildHistoryByTokens(shortHistory, 3000);
    const messages=[{role:'system',content:system},...historyForModel,{role:'user',content:rawMsg}];

    const api=GM_getValue('lux_api_url',API_URL_DEFAULT).trim();
    const headers={'Content-Type':'application/json'};
    const key=lux_getApiKey().trim();
    if(!key){ errorReply('Missing OpenRouter API key. Open LUX → Settings and paste your key.'); return; }
    headers['Authorization']='Bearer '+key;
    headers['HTTP-Referer']=location.origin;
    headers['X-Title']=document.title||'LUX Userscript';

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
      method:'POST', url:api, headers, data:JSON.stringify(payload), timeout:REQUEST_TIMEOUT_MS,
      onload: async (res)=>{
        try{
          if(res.status<200||res.status>=300){
            let msg;
            if (res.status === 401) msg = 'OpenRouter API key is invalid or unauthorized.';
            else if (res.status === 402) msg = 'OpenRouter billing/quota exceeded (HTTP 402).';
            else if (res.status === 404) msg = 'OpenRouter endpoint or model not found (HTTP 404).';
            else if (res.status === 429) msg = 'OpenRouter rate limit reached (HTTP 429).';
            else msg = `HTTP ${res.status} ${res.statusText || ''}`.trim();
            errorReply(msg);
            return;
          }
          const data=JSON.parse(res.responseText||'{}');
          const raw=(data?.choices?.[0]?.message?.content||'');
          if(!raw){ errorReply('The server replied but no content was found.'); return; }
          let content = raw;

          content = await Safety.enforceNoMeetAccept(rawMsg, content, leftCard);
          content = postFormat(content);

          LUXPatch.UIChips.refresh({ modelLabel: chosenModel });
          showReplies([content]);
          pushHist(rawMsg,content);
        }catch(e){ errorReply('Parse error: '+String(e)); }
      },
      onerror:()=> errorReply('Network error talking to OpenRouter.'),
      ontimeout:()=> errorReply('OpenRouter request timed out.')
    });
  }

  function pushHist(user,assistant){
    shortHistory.push({role:'user',content:user},{role:'assistant',content:assistant});
    if(shortHistory.length>HISTORY_MAX) shortHistory.shift();
    _saveHistory();
  }

  // ===== Paste plumbing =====
  function siteInput(){
    const el=document.querySelector(REPLY_INPUT_SELECTOR);
    if(!el) return null;
    const s=getComputedStyle(el);
    const visible = s.display!=='none' && s.visibility!=='hidden' && el.offsetParent!==null;
    const ro = el.hasAttribute('readonly') ? !el.ReadOnly : true;
    const dis= el.hasAttribute('disabled') ? !el.disabled : true;
    return (visible && ro && dis) ? el : null;
  }
  function setNativeValue(el,value){
    const desc=Object.getOwnPropertyDescriptor(el,'value');
    const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:el instanceof HTMLInputElement?HTMLInputElement.prototype:null;
    if(desc&&desc.set){desc.set.call(el,value);}
    else if(proto){const protoDesc=Object.getOwnPropertyDescriptor(proto,'value');protoDesc&&protoDesc.set&&protoDesc.set.call(el,value);}
  }
  function fireTypingEvents(el){
    const opts = { bubbles: true, cancelable: true };
    try { el.dispatchEvent(new InputEvent('beforeinput', {bubbles:true,cancelable:true,inputType:'insertFromPaste',data:el.value})); } catch {}
    try { el.dispatchEvent(new FocusEvent('focus', opts)); } catch { el.dispatchEvent(new Event('focus', opts)); }
    try { el.dispatchEvent(new InputEvent('input', {bubbles:true,cancelable:true,inputType:'insertFromPaste',data:el.value})); } catch { el.dispatchEvent(new Event('input', opts)); }
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keypress', { key: ' ', code: 'Space', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true }));
    el.dispatchEvent(new Event('change', opts));
  }
  async function pasteToSite(text){
    const el=siteInput();
    if(!el){ notify('Reply box not found. Update selector.'); return false; }
    el.scrollIntoView({ block: 'nearest' }); el.click(); el.focus();
    const final = clampToLimit(text);
    setNativeValue(el, final);
    try { el.selectionStart = el.selectionEnd = el.value.length; } catch {}
    fireTypingEvents(el);
    if (typeof queueMicrotask === 'function') queueMicrotask(()=> fireTypingEvents(el)); else setTimeout(()=> fireTypingEvents(el), 0);
    return true;
  }

  // ===== Events =====
  btn.addEventListener('click',()=>{
    ui.popup.style.display='block';
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value||'default') });
  });
  ui.close.addEventListener('click',()=>{
    if (LUXSettingsDirty) {
      if (confirm('You changed LUX settings. Save before closing?')) {
        ui.save.click();
      }
      LUXSettingsDirty = false;
    }
    ui.popup.style.display='none';
  });
  ui.settings.addEventListener('click',()=>{
    ui.panel.style.display = ui.panel.style.display==='none'?'block':'none';
  });
  ui.save.addEventListener('click',()=>{
    GM_setValue('lux_api_url', ui.apiUrl.value.trim());
    lux_setApiKey(ui.apiKey.value.trim());
    GM_setValue('lux_model', ui.model.value.trim());
    GM_setValue('lux_provider', ui.provider.value.trim());
    GM_setValue('lux_persona', ui.persona.value.trim());
    GM_setValue('lux_excuse_via_model', ui.excuseViaModel && ui.excuseViaModel.checked ? 1 : 0);
    GM_setValue('lux_filter_enabled', ui.filterEnabled && ui.filterEnabled.checked ? 1 : 0);
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value||'default') });
    LUXSettingsDirty = false;
    alert('Saved');
  });

  ui.apiUrl.addEventListener('input', ()=>{ LUXSettingsDirty = true; });
  ui.apiKey.addEventListener('input', ()=>{ LUXSettingsDirty = true; });
  ui.model.addEventListener('input', ()=>{ LUXSettingsDirty = true; });
  ui.provider.addEventListener('input', ()=>{ LUXSettingsDirty = true; });
  ui.persona.addEventListener('input', ()=>{ LUXSettingsDirty = true; });
  ui.excuseViaModel.addEventListener('change', ()=>{ LUXSettingsDirty = true; });
  ui.filterEnabled.addEventListener('change', ()=>{ LUXSettingsDirty = true; });

  // Manual Send
  ui.send.addEventListener('click', async ()=>{
    const msg = stripTimestamps((ui.customer.value||'').trim());
    if(!msg){ notify('Type a message first.'); return; }
    await callBackend(msg);
  });

  // Regenerate reply
  ui.regen.onclick = async () => {
    try {
      ui.regen.disabled = true;
      let msg = stripTimestamps((ui.customer.value || '').trim());
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
      await callBackend(msg);
    } finally {
      ui.regen.disabled = false;
    }
  };

  /* ===========================
     MutationObserver-based watcher
     (with polling fallback)
     =========================== */
  function processLatestTurn(){
    const root=document.querySelector(THREAD_SEL);
    if(!root) return;
    const nodes=[...root.querySelectorAll(`${CLIENT_MSG_SELECTOR}, ${PERSONA_MSG_SELECTOR}`)];
    const turns=[];
    for(const row of nodes){
      const fromClient=row.matches(CLIENT_MSG_SELECTOR);
      const text=(row.innerText||'').trim();
      if(text) turns.push({role: fromClient?'user':'assistant', content: stripTimestamps(text)});
    }
    const lastUser = turns.slice().reverse().find(t=>t.role==='user');
    if(!lastUser) return;
    const content=stripTimestamps(lastUser.content||'');
    if(!content || content===lastSeen) return;
    lastSeen=content;
    if(turns.length){shortHistory=turns.slice(-HISTORY_MAX);_saveHistory();}
    ui.customer.value=content;ui.popup.style.display='block';ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value||'default') });
    callBackend(content);
  }

  function setupThreadWatcher(){
    const root=document.querySelector(THREAD_SEL);
    if(!root) return false;
    const obs = new MutationObserver(()=>{ processLatestTurn(); });
    obs.observe(root,{childList:true,subtree:true});
    // run once to catch the current last message
    processLatestTurn();
    return true;
  }

  // Try to attach observer; fall back to polling until thread exists
  if(!setupThreadWatcher()){
    const fallbackId = setInterval(()=>{
      if(setupThreadWatcher()){
        clearInterval(fallbackId);
      }
    }, POLL_MS);
  }

})();
