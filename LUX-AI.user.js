// ==UserScript==
// @name         LUX Starr Framework v13 (OpenRouter • Encrypted Key • Creative Booster • Strict Access • ConeID Gate)
// @namespace    http://tampermonkey.net/
// @version      14.3.1
// @description  Refactored LUX: encrypted OpenRouter key, strict Apps Script access (no offline grace), adaptive history, persistent creative booster, stronger emotional refusals, blocked taboo content, topbar chips, no contacts/meetups, 800-char cap, one natural open-ended question, plus smarter greeting handling, resilient empty-content retry, and clickable member-note fact chips.
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
// @run-at       document-end
// ==/UserScript==

/* ============================
   LUX ConeID ACCESS CONTROL
   (STRICT: NO OFFLINE GRACE)
   ============================ */

const ACCESS_API_ENDPOINT = "https://script.google.com/macros/s/AKfycbxBCywRTXBGE1AgLmOPON-xmcoMg09I7ETeUc6ih-U8vpqjWXOWfsVRkwRctZdh4nQ/exec";

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
  try { GM_setValue(LUX_ACCESS_CACHE_KEY_V3, JSON.stringify(data || {})); }
  catch (e) { console.warn("LUX access store error", e); }
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
  let expTs = null;
  if (result.expires) {
    const ts = new Date(result.expires + "T23:59:59").getTime();
    if (!isNaN(ts)) expTs = ts;
  }
  lux_setAccessCache({ coneId, lastStatus: "allowed", lastCheckMs: Date.now(), expiresAt: expTs });
  return true;
}

(async function () {
  'use strict';

  const accessOk = await lux_ensureAccess();
  if (!accessOk) return;

  const API_URL_DEFAULT = 'https://openrouter.ai/api/v1/chat/completions';
  const OPENROUTER_KEY_DEFAULT = '';
  const MODEL_DEFAULT = 'x-ai/grok-4-fast';
  const PROVIDER_DEFAULT = 'openrouter';
  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const POLL_MS = 3000;
  const HISTORY_MAX = 14;
  const REQUEST_TIMEOUT_MS = 35000;

  const LUX_DEBUG_LOGGING = true;
  const LUX_NOTE_RETRY_DELAYS = [0, 500, 1200, 2200];
  const LUX_NOTE_AUTOSAVE = false;

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
    try { decoded = atob(cipherText); }
    catch (e) { console.warn('LUX decrypt: invalid base64', e); return ''; }
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

  const MODEL_FALLBACK_PRESET = {
    temperature: 0.58,
    top_p: 0.92,
    repetition_penalty: 1.02,
    max_tokens: 240,
    stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"],
    seed: 11
  };

  const MODEL_PRESETS = {
    'x-ai/grok-4-fast': { temperature: 0.75, top_p: 0.97, repetition_penalty: 1.02, max_tokens: 260, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 37 },
    'anthropic/claude-3.5-sonnet': { temperature: 0.68, top_p: 0.95, repetition_penalty: 1.01, max_tokens: 260, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 53 },
    'openai/gpt-4.1-mini': { temperature: 0.62, top_p: 0.94, repetition_penalty: 1.02, max_tokens: 240, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 29 },
    'meta-llama/llama-3.3-8b-instruct:free': { temperature: 0.74, top_p: 0.97, repetition_penalty: 1.04, max_tokens: 230, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 71 },
    'meta-llama/llama-3.3-70b-instruct:free': { temperature: 0.72, top_p: 0.96, repetition_penalty: 1.02, max_tokens: 250, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 83 },
    'deepseek/deepseek-chat': { temperature: 0.72, top_p: 0.96, repetition_penalty: 1.02, max_tokens: 260, stop: ["\n\nSystem:", "\nUser:", "\nAssistant:"], seed: 41 }
  };

  function getModelPreset(modelName) {
    const name = (modelName || GM_getValue('lux_model', MODEL_DEFAULT) || '').trim();
    return MODEL_PRESETS[name] || MODEL_FALLBACK_PRESET;
  }

  const LUX_RATE_WINDOW_MS = 10000;
  const LUX_RATE_MAX_REQ = 5;
  const LUX_RATE_LOG_KEY = 'lux_req_log_v1';

  function lux_getReqLog() {
    try { return JSON.parse(GM_getValue(LUX_RATE_LOG_KEY, '[]')) || []; }
    catch { return []; }
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
  function lux_estimateTokens(str) { return !str ? 0 : Math.ceil(String(str).length / 4); }

  const CREATIVE_BASE = 0.0;
  const CREATIVE_MAX = 0.25;
  const LUX_CREATIVE_STATE_KEY = 'lux_creative_state_v1';

  function lux_getCreativeState() {
    try { return JSON.parse(GM_getValue(LUX_CREATIVE_STATE_KEY, '{}')) || {}; }
    catch { return {}; }
  }
  function lux_setCreativeState(state) { GM_setValue(LUX_CREATIVE_STATE_KEY, JSON.stringify(state || {})); }

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

  function lux_detectTone(text) {
    const s = (text || '').toLowerCase();
    const angry = /\b(stupid|idiot|wtf|annoying|trash|nonsense|you never|you always|mad|angry|pissed)\b/.test(s);
    const cold = /\b(k|ok|kay|fine|whatever|hm|hmm|sure)\b/.test(s) && s.replace(/\s+/g, ' ').trim().length <= 20;
    const playful = /\b(lol|lmao|haha|hehe)\b/.test(s);
    const sweet = /\b(baby|babe|darling|sweetheart|dear|love|miss you|thinking of you)\b/.test(s);
    const flirty = /\b(hot|cute|pretty|sexy|kiss|touch|naughty|turn on|bed|naked)\b/.test(s);
    const serious = /\b(why|explain|honest|truth|seriously|real question|be straight)\b/.test(s);
    const interviewy = /\b(what do you do|job|work|occupation|career|where are you from|how old|age)\b/.test(s);
    const shortMsg = (s.replace(/\s+/g, ' ').trim().length <= 12);
    const questionHeavy = (s.match(/\?/g) || []).length >= 2;
    let tone = 'neutral';
    if (angry) tone = 'angry';
    else if (flirty) tone = 'flirty';
    else if (sweet) tone = 'sweet';
    else if (serious || interviewy) tone = 'serious';
    else if (playful) tone = 'playful';
    else if (cold) tone = 'cold';
    const engagement = (cold || shortMsg) ? 'low' : (questionHeavy ? 'high' : 'mid');
    return { tone, engagement };
  }

  function lux_questionGuide(tone, engagement) {
    const base = [
      'End with exactly one open ended question that fits the flow and does not sound templated.',
      'The question must feel interesting, engaging, and easy to reply to.',
      'Avoid dull questions like how was your day, what are you up to, tell me about yourself, or what do you like to do.',
      'Prefer curiosity, imagination, chemistry, contrast, opinions, little confessions, preferences, memories, or playful what if questions.',
      'The question should make the person want to answer, not feel interviewed.'
    ].join(' ');

    if (tone === 'angry') return base + ' Their tone is tense, be calm and de escalating, ask a soft question that helps them explain what really bothered them.';
    if (tone === 'cold') return base + ' Their tone is dry, use a light hook and ask something easy but still interesting, like a preference, mood, or little choice question that feels personal.';
    if (tone === 'serious') return base + ' Their tone is serious, ask something thoughtful that invites specifics, perspective, or a real opinion, not a flat generic question.';
    if (tone === 'sweet') return base + ' Their tone is affectionate, ask a warm feeling based question that deepens closeness, like what they miss, what softens them, or what kind of affection gets to them.';
    if (tone === 'flirty') return base + ' Their tone is teasing, ask a playful chemistry question that builds tension on platform, like what about a woman catches their attention first, what kind of teasing they enjoy, or what kind of kiss would ruin their focus.';
    if (tone === 'playful') return base + ' Their tone is playful, ask something imaginative, cheeky, or unexpected that sparks banter and makes replying fun.';
    if (engagement === 'low') return base + ' Keep the question easy to answer, but still interesting, like a choice between two tempting options or a small revealing preference.';
    return base + ' Make the question vivid, specific, and a little magnetic.';
  }

  function lux_toneKey() { try { return _threadKey() + '__tone_v1'; } catch { return 'lux_tone_global_v1'; } }
  function lux_getToneMemory() {
    try {
      const raw = GM_getValue(lux_toneKey(), '[]');
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-3) : [];
    } catch { return []; }
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
    if (daypart === 'late-night' || daypart === 'night') temperature = Math.min(temperature + 0.05, 1.2);
    else if (daypart === 'morning') temperature = Math.max(temperature - 0.05, 0.45);

    const toneNow = lux_detectTone(msg);
    const mem = lux_getToneMemory();
    const lastTone = mem.length ? mem[mem.length - 1].tone : 'neutral';
    const coldStreak = mem.filter(x => x && x.tone === 'cold').length >= 2;
    const tone = toneNow.tone;
    const engagement = toneNow.engagement;

    if (tone === 'flirty') {
      temperature = Math.min(temperature + 0.08, 1.15);
      top_p = Math.min(top_p + 0.03, 1.0);
      repetition_penalty = Math.max(1.00, repetition_penalty - 0.01);
      max_tokens = Math.min(280, max_tokens + 20);
    } else if (tone === 'sweet') {
      temperature = Math.min(temperature + 0.05, 1.08);
      top_p = Math.min(top_p + 0.02, 1.0);
      repetition_penalty = Math.max(1.00, repetition_penalty - 0.01);
      max_tokens = Math.min(280, max_tokens + 15);
    } else if (tone === 'serious') {
      temperature = Math.max(0.48, temperature - 0.08);
      top_p = Math.max(0.86, top_p - 0.05);
      repetition_penalty = Math.min(1.06, repetition_penalty + 0.02);
      max_tokens = Math.max(200, max_tokens - 10);
    } else if (tone === 'angry') {
      temperature = Math.max(0.46, temperature - 0.10);
      top_p = Math.max(0.84, top_p - 0.06);
      repetition_penalty = Math.min(1.06, repetition_penalty + 0.02);
      max_tokens = Math.max(190, max_tokens - 20);
    } else if (tone === 'cold') {
      temperature = Math.min(temperature + 0.03, 0.95);
      top_p = Math.min(top_p + 0.02, 0.98);
      max_tokens = Math.max(180, Math.min(230, max_tokens - 20));
    }

    if (coldStreak && tone !== 'serious' && tone !== 'angry') {
      temperature = Math.min(temperature + 0.03, 1.05);
      top_p = Math.min(top_p + 0.02, 1.0);
      max_tokens = Math.min(280, max_tokens + 10);
    }

    if (highCount >= 3) {
      temperature = Math.min(temperature + 0.12, 1.2);
      top_p = Math.min(top_p + 0.05, 1.0);
    } else if (highCount >= 1) {
      temperature = Math.min(temperature + 0.05, 1.1);
    } else {
      temperature = temperature * 0.9 + (base.temperature ?? 0.7) * 0.1;
      top_p = top_p * 0.9 + (base.top_p ?? 0.9) * 0.1;
    }

    lux_setCreativeState({ history, lastTone: tone, lastEngagement: engagement, prevTone: lastTone });
    lux_pushToneMemory({ tone, engagement, ts: Date.now() });
    return { ...base, temperature, top_p, repetition_penalty, max_tokens };
  }

  function sanitizePayloadForModel(payload, model) {
    const m = (model || '').toLowerCase();
    const p = { ...payload };
    if ('transforms' in p) delete p.transforms;
    if ('logit_bias' in p && !p.logit_bias) delete p.logit_bias;
    if (m.includes('llama-3.2-3b') && p.max_tokens > 260) p.max_tokens = 220;
    return p;
  }

  const REPLY_INPUT_SELECTOR = 'textarea#reply-textarea.form-control.border-start-0.border-end-0';
  const PERSONA_NAME_SEL = 'h5.fw-bold.mb-1';
  const PERSONA_LOC_SEL = 'h6.text-black-50';
  const PERSONA_COUNTRY_SEL = 'div.col-auto.navbar-text.fw-bold.d-inline';
  const THREAD_SEL = 'div#message-list.flex-grow-1.overflow-auto.p-4';
  const CLIENT_MSG_SELECTOR = 'div.d-flex.flex-row-reverse.my-2.message-box';
  const PERSONA_MSG_SELECTOR = 'div.d-flex.flex-row.my-2';
  const MEMBER_TIME_SEL = 'span#memberTime.fw-bold';
  const AGE_SELECTOR = 'td.p-1.ps-3.bg-light-subtle';
  const MEMBER_NOTE_SELECTOR = 'textarea#log.form-control.mb-2.text-bg-light';
  const MEMBER_NOTE_SAVE_SELECTOR = 'button.btn.btn-secondary';
  const LUX_NOTE_LAST_HASH_KEY = 'lux_member_note_last_hash_v1';

  function _qs(r, s) { try { return s ? r.querySelector(s) : null; } catch { return null; } }
  function _qst(r, s) { const el = _qs(r, s); return el ? el.innerText.trim() : ''; }

  function extractBracketName(s) {
    if (!s) return '';
    let m = s.match(/\(([^()]*)\)\s*$/);
    if (!m) m = s.match(/\(([^)]+)\)/);
    return (m && m[1]) ? m[1].trim() : '';
  }
  function cleanOutsideName(s) { if (!s) return ''; return s.replace(/\s*\([^)]*\)\s*/g, '').trim(); }

  function parseAgeFromProfile() {
    try {
      const el = document.querySelector(AGE_SELECTOR);
      const t = (el?.textContent || '').trim();
      const m = t.match(/\bAge\s*:\s*(\d{1,3})\b/i);
      if (!m) return null;
      const n = parseInt(m[1], 10);
      if (!Number.isFinite(n) || n < 18 || n > 100) return null;
      return n;
    } catch { return null; }
  }

  function parseProfileCountry() {
    const raw = _qst(document, PERSONA_COUNTRY_SEL) || '';
    const s = raw.toLowerCase();
    if (/great\s*britain|united\s*kingdom|uk\b|britain\b/.test(s)) return 'Great Britain';
    if (/australia|australian/.test(s)) return 'Australia';
    if (/canada|canadian/.test(s)) return 'Canada';
    if (/usa\b|united\s*states|america\b|american/.test(s)) return 'USA';
    return raw || '';
  }

  function getAccentInstructionByCountry(country) {
    const c = String(country || '').trim().toLowerCase();
    if (!c) return 'Write in natural, warm, feminine English.';
    if (c === 'usa') return 'Write in warm, casual American English. Keep it natural, feminine, and easy flowing.';
    if (c === 'canada') return 'Write in soft, natural Canadian English. Keep it warm, feminine, polite, and conversational.';
    if (c === 'australia') return 'Write in relaxed, natural Australian English. Keep it feminine, playful, easygoing, and clear without overusing slang.';
    if (c === 'great britain') return 'Write in soft, natural British English. Keep it polished, feminine, and conversational without sounding stiff.';
    return 'Write in natural, warm, feminine English.';
  }

  function hashStr(s) {
    const str = String(s || '');
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }
  function pickByHash(options, seedStr) {
    if (!options || !options.length) return '';
    const h = hashStr(seedStr);
    return options[h % options.length];
  }

  function jobOptionsForAge(age) {
    if (!age) return ['I work in customer support and admin', 'I do office admin and scheduling', 'I work in hospitality and service'];
    if (age >= 18 && age <= 22) return ["I'm a student and I do part time retail work", "I'm studying and I do customer support part time", "I'm a junior admin assistant and I study on the side"];
    if (age >= 23 && age <= 29) return ['I work in customer support and operations', "I'm in marketing and social media", 'I do admin and project coordination'];
    if (age >= 30 && age <= 39) return ['I work in operations and team coordination', "I'm in HR and office management", 'I do client services and account support'];
    if (age >= 40 && age <= 49) return ['I work in office management and operations', "I'm in customer relations and admin leadership", 'I do business support and coordination'];
    if (age >= 50 && age <= 59) return ['I work in administration and supervision', "I'm in client relations and team support", 'I do office coordination and scheduling'];
    if (age >= 60) return ["I'm semi retired and I do light consulting work", "I'm semi retired and I help with community projects", "I'm semi retired and I do part time admin support"];
    return ['I work in admin and coordination', 'I do customer support and operations'];
  }

  function suggestJobLine(leftCard, age) {
    const base = jobOptionsForAge(age);
    const seed = (leftCard?.realName || leftCard?.displayName || '') + ':' + String(age || '');
    return pickByHash(base, seed) || base[0];
  }

  function parseLeftProfile() {
    const rawName = _qst(document, PERSONA_NAME_SEL);
    const age = parseAgeFromProfile();
    return {
      rawName,
      realName: extractBracketName(rawName) || '',
      displayName: cleanOutsideName(rawName) || rawName,
      location: _qst(document, PERSONA_LOC_SEL) || 'nearby',
      country: parseProfileCountry(),
      age
    };
  }

  function getImageNotes(node) {
    if (!node) return [];
    const imgs = [...node.querySelectorAll('img')];
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

  function stripInlineImageNotes(text) {
    if (!text) return '';
    let t = String(text);
    t = t.replace(/\bmessage\b\s*image\s+attached\.?/gi, '');
    t = t.replace(/\bimage\s+attached\.?/gi, '');
    t = t.replace(/\bimage\s+note\b[^.]*\.?/gi, '');
    return t.replace(/\s{2,}/g, ' ').trim();
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

  function extractMessageContent(node) {
    const rawText = (node?.innerText || '').trim();
    const text = stripStampsAll(stripInlineImageNotes(rawText));
    const imageNotes = getImageNotes(node);
    if (!imageNotes.length) return text;
    const meta = `${LUX_IMG_START} ${imageNotes.join(' | ')} ${LUX_IMG_END}`;
    return text ? `${text}\n${meta}` : meta;
  }

  function personaCardLine(card) {
    if (!card) return '';
    const bits = [];
    if (card.realName) bits.push(`RealName: ${card.realName}`);
    if (card.displayName) bits.push(`Username: ${card.displayName}`);
    if (card.location) bits.push(`Location: ${card.location}`);
    if (card.country) bits.push(`Country: ${card.country}`);
    if (card.age) bits.push(`Age: ${card.age}`);
    return bits.length ? ` Persona card, ${bits.join(', ')}.` : '';
  }

  function notify(text) {
    try { GM_notification({ text, title: 'LUX', timeout: 3500 }); }
    catch { console.log('[LUX]', text); }
  }
  function trimText(s, max) { s = (s || '').toString(); return s.length > max ? s.slice(0, max) + '...' : s; }
  function luxDebug(...args) { if (LUX_DEBUG_LOGGING) console.log('[LUX DEBUG]', ...args); }

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

  function lux_noteThreadKey() {
    try { return `${_threadKey()}__member_note_last_hash`; }
    catch { return LUX_NOTE_LAST_HASH_KEY; }
  }

  function normalizeLooseText(s) {
    return String(s || '').replace(/\s+/g, ' ').replace(/^[,;:\-\s]+|[,;:\-\s]+$/g, '').trim();
  }

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
    return String(value || '')
      .split(/,|\band\b|\&|\//i)
      .map(x => normalizeLooseText(x))
      .filter(Boolean);
  }

  function cleanupNoteValue(v) {
    let t = normalizeLooseText(v);
    t = t.replace(/^that\s+/i, '');
    t = t.replace(/^is\s+/i, '');
    t = t.replace(/^i\s+(?:am|m)\s+/i, '');
    t = t.replace(/^i\s+work\s+as\s+/i, '');
    t = t.replace(/^i\s+work\s+in\s+/i, '');
    t = t.replace(/^i\s+work\s+for\s+/i, '');
    t = t.replace(/^i\s+live\s+in\s+/i, '');
    t = t.replace(/^i\s+live\s+at\s+/i, '');
    t = t.replace(/^my\s+name\s+is\s+/i, '');
    return normalizeLooseText(t);
  }

  function extractFirst(text, regexes, cleaner) {
    for (const re of regexes) {
      const m = text.match(re);
      if (m && m[1]) {
        const v = cleaner ? cleaner(m[1]) : normalizeLooseText(m[1]);
        if (v) return v;
      }
    }
    return '';
  }

  function extractMany(text, regexes) {
    const out = [];
    for (const re of regexes) {
      let m;
      const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
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

  function parseClientFactsFromLatestMessage(messageText) {
    const raw = normalizeLooseText(stripStampsAll(messageText || ''));
    if (!raw) return null;
    const text = raw;
    const lower = text.toLowerCase();
    const facts = {};

    const name = extractFirst(text, [
      /\bmy\s+name\s+is\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\bi(?:'m|\s+am)\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\bthis\s+is\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\bcall\s+me\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\byou\s+can\s+call\s+me\s+([A-Z][a-z'\-]{1,30}(?:\s+[A-Z][a-z'\-]{1,30})?)\b/i,
      /\b([A-Z][a-z'\-]{1,30})\s+here\b/i
    ], cleanupNoteValue);
    if (name && looksLikeNameCandidate(name)) facts.Name = name;

    const age = extractFirst(text, [
      /\bi(?:'m|\s+am)\s+(\d{1,3})\b/i,
      /\bmy\s+age\s+is\s+(\d{1,3})\b/i,
      /\bi\s+am\s+(\d{1,3})\s+years?\s+old\b/i,
      /\b(\d{1,3})\s+years?\s+old\b/i
    ], v => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n >= 18 && n <= 100 ? String(n) : '';
    });
    if (age) facts.Age = age;

    const location = extractFirst(text, [
      /\bi\s+live\s+in\s+([A-Za-z][A-Za-z\s\-\.,]{1,60})\b/i,
      /\bi\s+am\s+from\s+([A-Za-z][A-Za-z\s\-\.,]{1,60})\b/i,
      /\bi\s+live\s+at\s+([A-Za-z0-9][A-Za-z0-9\s,\-#\.]{3,80})\b/i,
      /\bmy\s+address\s+is\s+([A-Za-z0-9][A-Za-z0-9\s,\-#\.]{3,100})\b/i,
      /\bi\s+stay\s+in\s+([A-Za-z][A-Za-z\s\-\.,]{1,60})\b/i,
      /\bi'?m\s+in\s+([A-Za-z][A-Za-z\s\-\.,]{1,60})\b/i
    ], v => cleanupNoteValue(v).replace(/[\.,]+$/g, ''));
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
    ], cleanupNoteValue);
    if (job && !/^(here|there|single|married|busy|ready|okay|ok|fine)$/i.test(job)) facts.Job = job;

    const workplace = extractFirst(text, [
      /\bi\s+work\s+for\s+([^\.,!?]{2,80})/i,
      /\bi'?ve\s+worked\s+for\s+([^\.,!?]{2,80})/i,
      /\bi'?ve\s+been\s+with\s+([^\.,!?]{2,80})/i,
      /\bi\s+am\s+with\s+([^\.,!?]{2,80})/i,
      /\bi'?m\s+with\s+([^\.,!?]{2,80})/i
    ], cleanupNoteValue);
    if (workplace) facts.Workplace = workplace;

    const experience = extractFirst(text, [
      /\bfor\s+(\d+\s+years?)\b/i,
      /\bover\s+(\d+\s+years?)\b/i,
      /\babout\s+(\d+\s+years?)\b/i,
      /\b(\d+\s+years?)\s+now\b/i
    ], cleanupNoteValue);
    if (experience) facts.Experience = experience;

    const status = extractFirst(text, [
      /\bi(?:'m|\s+am)\s+(single|divorced|widowed|separated|married)\b/i,
      /\bI'm\s+a\s+(single\s+(?:dad|mom|father|mother))\b/i,
      /\bI\s+am\s+a\s+(single\s+(?:dad|mom|father|mother))\b/i
    ], cleanupNoteValue);
    if (status) facts.Status = status;

    const family = extractFirst(text, [
      /\bi\s+have\s+(\d+\s+(?:kids|children|sons|daughters))\b/i,
      /\bi'?m\s+a\s+(single\s+(?:dad|mom|father|mother))\b/i,
      /\bmy\s+(?:son|daughter|kids|children|mom|mother|dad|father|parents?)\b[^\.!?]{0,60}/i
    ], cleanupNoteValue);
    if (family) facts.Family = family;

    const hobbies = extractMany(text, [
      /\bi\s+like\s+([^\.!?]{2,90})/i,
      /\bi\s+love\s+([^\.!?]{2,90})/i,
      /\bmy\s+hobbies\s+are\s+([^\.!?]{2,90})/i,
      /\bi\s+enjoy\s+([^\.!?]{2,90})/i,
      /\bin\s+my\s+free\s+time\s+i\s+([^\.!?]{2,90})/i
    ]).filter(x => !/^(you|this|that|it|here|there)$/i.test(x));
    if (hobbies.length) facts.Hobbies = hobbies.join(', ');

    const activities = extractMany(text, [
      /\bright\s+now\s+i'?m\s+([^\.!?]{2,90})/i,
      /\bi'?m\s+currently\s+([^\.!?]{2,90})/i,
      /\bi\s+spend\s+my\s+time\s+([^\.!?]{2,90})/i
    ]);
    if (activities.length) facts.Activity = activities.join(', ');

    const schedule = extractFirst(text, [
      /\bi\s+work\s+(nights|days|weekends|night shifts|day shifts)\b/i,
      /\bi\s+have\s+(?:an\s+)?appointment\s+([^\.!?]{2,80})/i,
      /\btomorrow\s+i\s+([^\.!?]{2,80})/i,
      /\bthis\s+(?:week|weekend|evening|morning)\s+i\s+([^\.!?]{2,80})/i
    ], cleanupNoteValue);
    if (schedule) facts.Schedule = schedule;

    const contact = extractFirst(text, [
      /\bmy\s+(?:number|phone\s+number)\s+is\s+([+\d\s\-()]{6,30})\b/i,
      /\breach\s+me\s+at\s+([+\d\s\-()]{6,30})\b/i,
      /\bwhatsapp\s+me\s+at\s+([+\d\s\-()]{6,30})\b/i,
      /\bmy\s+email\s+is\s+([^\s,;]+@[^\s,;]+)\b/i
    ], cleanupNoteValue);
    if (contact) facts.Contact = contact;

    if (/\bwhatsapp|telegram|snap(?:chat)?|instagram|ig\b/i.test(lower) && !facts.Contact) facts.ContactAttempt = 'asked to move chat off site';

    const plan = extractFirst(text, [
      /\bi\s+plan\s+to\s+([^\.!?]{2,80})/i,
      /\bi'?m\s+going\s+to\s+([^\.!?]{2,80})/i,
      /\bnext\s+week\s+i\s+([^\.!?]{2,80})/i
    ], cleanupNoteValue);
    if (plan) facts.Plans = plan;

    const fields = Object.entries(facts).filter(([, v]) => normalizeLooseText(v));
    if (!fields.length) return null;
    return Object.fromEntries(fields);
  }

  function parseExistingMemberNote(noteText) {
    const out = {};
    const text = String(noteText || '').trim();
    if (!text) return out;
    const parts = text.split('|').map(x => x.trim()).filter(Boolean);
    for (const part of parts) {
      const idx = part.indexOf(':');
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
      const cleanVal = normalizeLooseText(value);
      if (!cleanVal) continue;
      if (!merged[key]) {
        merged[key] = cleanVal;
        changed = true;
        continue;
      }
      const oldVal = normalizeLooseText(merged[key]);
      if (oldVal.toLowerCase() === cleanVal.toLowerCase()) continue;
      if (/^(Hobbies|Activity)$/i.test(key)) {
        const joined = dedupeCsvItems([...splitCsvLike(oldVal), ...splitCsvLike(cleanVal)]).join(', ');
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
    const order = ['Name', 'Age', 'Location', 'Address', 'Job', 'Workplace', 'Experience', 'Status', 'Family', 'Hobbies', 'Activity', 'Schedule', 'Plans', 'Contact', 'ContactAttempt'];
    const parts = [];
    for (const key of order) {
      if (obj && obj[key]) parts.push(`${key}: ${normalizeLooseText(obj[key])}`);
    }
    for (const [k, v] of Object.entries(obj || {})) {
      if (!order.includes(k) && normalizeLooseText(v)) parts.push(`${k}: ${normalizeLooseText(v)}`);
    }
    return parts.join(' | ');
  }

  function memberNoteTextarea() {
    return document.querySelector(MEMBER_NOTE_SELECTOR);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    return buttons.find(b => /save/i.test((b.textContent || '').trim())) || buttons[0] || null;
  }

  function setFieldValue(el, value) {
    if (!el) return;
    const ownDesc = Object.getOwnPropertyDescriptor(el, 'value');
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLInputElement ? HTMLInputElement.prototype : null;
    const protoDesc = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;
    if (ownDesc && ownDesc.set) ownDesc.set.call(el, value);
    else if (protoDesc && protoDesc.set) protoDesc.set.call(el, value);
    else el.value = value;
  }

  function fireFieldEvents(el) {
    if (!el) return;
    const opts = { bubbles: true, cancelable: true };
    try { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch {}
    try { el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch {}
    try { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch {}
    try { el.dispatchEvent(new FocusEvent('focus', opts)); } catch { el.dispatchEvent(new Event('focus', opts)); }
    try { el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: el.value })); } catch {}
    try { el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: el.value })); } catch { el.dispatchEvent(new Event('input', opts)); }
    el.dispatchEvent(new Event('change', opts));
    try { el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); } catch {}
    try { el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } catch {}
    try { el.dispatchEvent(new FocusEvent('blur', opts)); } catch { el.dispatchEvent(new Event('blur', opts)); }
  }

  function forceClick(el) {
    if (!el) return false;
    try { el.scrollIntoView({ block: 'nearest' }); } catch {}
    try { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); } catch {}
    try { el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); } catch {}
    try { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch {}
    try { el.click(); } catch {}
    return true;
  }

  async function applyFactsToMemberNote(facts) {
    try {
      if (!facts) return false;
      let noteBox = await waitForMemberNoteTextarea(2800);
      if (!noteBox) return false;

      noteBox = memberNoteTextarea() || noteBox;
      const existingText = String(noteBox.value || '').trim();
      const existing = parseExistingMemberNote(existingText);
      const { merged, changed } = mergeMemberFacts(existing, facts);
      const finalText = formatMemberNote(merged);
      if (!finalText) return false;

      const newHash = String(hashStr(finalText));
      const lastHash = GM_getValue(lux_noteThreadKey(), '');
      if (!changed && existingText.trim() === finalText.trim()) return false;
      if (lastHash && lastHash === newHash && existingText.trim() === finalText.trim()) return false;

      noteBox.scrollIntoView({ block: 'nearest' });
      try { noteBox.click(); } catch {}
      noteBox.focus();

      setFieldValue(noteBox, finalText);
      try { noteBox.selectionStart = noteBox.selectionEnd = finalText.length; } catch {}
      fireFieldEvents(noteBox);
      await sleep(60);
      fireFieldEvents(noteBox);

      GM_setValue(lux_noteThreadKey(), newHash);

      if (LUX_NOTE_AUTOSAVE) {
        const saveBtn = memberNoteSaveButton();
        if (saveBtn) {
          forceClick(saveBtn);
          await sleep(120);
          forceClick(saveBtn);
        }
        notify('LUX logged member note');
      } else {
        notify('LUX drafted member note');
      }
      return true;
    } catch (e) {
      console.warn('LUX apply facts failed', e);
      return false;
    }
  }

  async function autoLogLatestClientInfo(messageText) {
    try {
      const facts = parseClientFactsFromLatestMessage(messageText);
      luxDebug('Extracted facts', facts, 'from', messageText);
      if (!facts) return false;
      return await applyFactsToMemberNote(facts);
    } catch (e) {
      console.warn('LUX member note logging failed', e);
      return false;
    }
  }

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
    #lux-facts{margin:8px 0 10px 0;border:1px solid #3a4155;border-radius:10px;padding:8px;background:#232323}
    #lux-facts-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
    #lux-facts-chips{display:flex;flex-wrap:wrap;gap:6px}
    .lux-fact-chip{border:1px solid #3c4c66;background:#1f2937;color:#cfe0ff;border-radius:999px;padding:4px 10px;font-size:12px;cursor:pointer}
    .lux-fact-chip:hover{filter:brightness(1.08)}
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

  <div id="lux-facts" style="display:none">
    <div id="lux-facts-head">
      <div><strong>Log picks</strong> <span style="opacity:.8;font-size:12px">tap to drop into member note</span></div>
      <button id="lux-facts-apply" style="background:#0b3d91;color:#fff;border:0;border-radius:8px;padding:6px 10px;font-weight:700;cursor:pointer">Apply all</button>
    </div>
    <div id="lux-facts-chips"></div>
  </div>

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

  const ui = {
    popup: pop,
    topbar: pop.querySelector('#lux-topbar'),
    customer: pop.querySelector('#lux-customer'),
    factsWrap: pop.querySelector('#lux-facts'),
    factsChips: pop.querySelector('#lux-facts-chips'),
    factsApply: pop.querySelector('#lux-facts-apply'),
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
    model: pop.querySelector('#lux-model'),
    provider: pop.querySelector('#lux-provider'),
    persona: pop.querySelector('#lux-persona'),
    excuseViaModel: pop.querySelector('#lux-excuse-via-model'),
    filterEnabled: pop.querySelector('#lux-filter-enabled'),
    save: pop.querySelector('#lux-save')
  };

  ui.apiUrl.value = GM_getValue('lux_api_url', API_URL_DEFAULT);
  ui.apiKey.value = lux_getApiKey();
  ui.model.value = GM_getValue('lux_model', MODEL_DEFAULT);
  ui.provider.value = GM_getValue('lux_provider', PROVIDER_DEFAULT);
  ui.persona.value = GM_getValue('lux_persona', '');
  ui.excuseViaModel.checked = GM_getValue('lux_excuse_via_model', 1) === 1;
  ui.filterEnabled.checked = !!GM_getValue('lux_filter_enabled', 0);

  const modelChoices = [
    'x-ai/grok-4-fast',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4.1-mini',
    'meta-llama/llama-3.3-8b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-chat'
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
        notify('Model set to ' + m);
        LUXPatch.UIChips.refresh({ modelLabel: m, countryLabel: parseProfileCountry() || '—' });
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

  const LUXPatch = (typeof window.LUXPatch !== 'undefined' ? window.LUXPatch : (window.LUXPatch = {}));

  LUXPatch.UIChips = (() => {
    const ids = { topbar: 'lux-topbar', chipModel: 'lux-chip-model', chipDaypart: 'lux-chip-daypart', chipCountry: 'lux-chip-country' };
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
      top.id = ids.topbar;
      top.className = 'luxpatch-topbar';
      top.innerHTML = `
        <div class="luxpatch-brand">LUX</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span class="luxpatch-chip" id="${ids.chipModel}">model: —</span>
          <span class="luxpatch-chip" id="${ids.chipCountry}">country: —</span>
          <span class="luxpatch-chip" id="${ids.chipDaypart}">—</span>
        </div>`;
      container.appendChild(top);
      refresh({ modelLabel: 'default', countryLabel: parseProfileCountry() || '—' });
      return top;
    }
    function refresh({ modelLabel, countryLabel }) {
      const m = document.getElementById(ids.chipModel);
      const d = document.getElementById(ids.chipDaypart);
      const c = document.getElementById(ids.chipCountry);
      if (m && modelLabel) m.textContent = `model: ${modelLabel}`;
      if (c) c.textContent = `country: ${countryLabel || parseProfileCountry() || '—'}`;
      if (d) d.textContent = timeChipLabel();
    }
    function unmount() { const n = document.getElementById(ids.topbar); if (n) n.remove(); }
    return { mountTopbar, refresh, unmount, ids };
  })();

  LUXPatch.UIChips.mountTopbar(ui.topbar);
  LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || 'default'), countryLabel: parseProfileCountry() || '—' });

  // clickable fact chips
  let __LUX_LAST_FACTS = null;

  function renderFactChipsFromMessage(messageText) {
    const facts = parseClientFactsFromLatestMessage(messageText || '');
    __LUX_LAST_FACTS = facts;
    if (!facts || !Object.keys(facts).length) {
      ui.factsWrap.style.display = 'none';
      ui.factsChips.innerHTML = '';
      return;
    }
    ui.factsWrap.style.display = 'block';
    ui.factsChips.innerHTML = '';

    Object.entries(facts).forEach(([k, v]) => {
      const chip = document.createElement('div');
      chip.className = 'lux-fact-chip';
      chip.textContent = `${k}: ${normalizeLooseText(v)}`;
      chip.title = 'Tap to apply this to member note';
      chip.addEventListener('click', async () => {
        const one = {}; one[k] = v;
        const ok = await applyFactsToMemberNote(one);
        if (ok) notify(`Added ${k}`);
      });
      ui.factsChips.appendChild(chip);
    });
  }

  ui.factsApply.addEventListener('click', async () => {
    if (!__LUX_LAST_FACTS) return;
    const ok = await applyFactsToMemberNote(__LUX_LAST_FACTS);
    if (ok) notify('Applied all log picks');
  });

  LUXPatch.NoRepeat = (() => {
    const bannedPhrases = [
      'early start','quiet evening','keeping it here','on-platform','staying on-platform','chores','catching up on work','keeping it simple','staying in','wind down',"data's tight",'data’s tight',"let's keep the heat online","let's keep it online","let's keep the chat online","let's keep building the heat","let's keep building the connection","let's keep building the heat or connection",'keep building the heat','keep building the connection','build the heat','build the connection','build our connection','build our heat','I’m a bit shy to share my contact',"I'm a bit shy to share my contact",'what do you do to relax on a thursday morning or evening','what do you do to relax on a thursday evening',"let's build the connection first",'im not ready for that',"i'm not ready for that",'i need to focus on building a connection here',"i'd like to focus on getting to know each other first"
    ];
    const bannedRegexes = [
      /let['’]?s\s+keep\s+building\s+(?:the\s+)?(?:heat|connection)(?:\s+or\s+(?:the\s+)?(?:heat|connection))?/gi,
      /keep\s+building\s+(?:the\s+)?(?:heat|connection)/gi,
      /\bbuild(?:ing)?\s+(?:the\s+|our\s+)?(?:heat|connection)\b/gi
    ];
    const substitutionPool = [
      "I'm happy staying right here in our chat.",
      'I like keeping things simple and cozy between us here.',
      'I like the way this feels here, just us and the conversation.',
      "I'm enjoying this space with you, right here.",
      "I'm all yours on this screen for now."
    ];
    function randomSub() { return substitutionPool[Math.floor(Math.random() * Math.random() * substitutionPool.length)] || substitutionPool[0]; }
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
    function patterns() { return []; }
    function excuseFrags() { return []; }
    function scrub(text) { return dedupePhrases(substitute(text)); }
    return { patterns, excuseFrags, scrub, substitute };
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

    const wantsContact = s => CONTACT_REQUEST_RE.test((s || '').toLowerCase());
    const wantsMeet = s => MEET_EXPLICIT_RE.test((s || '').toLowerCase());
    const wantsMeetSoft = s => MEET_INDIRECT_RE.test((s || '').toLowerCase());
    const mentionsAddress = s => ADDRESS_RE.test((s || '').toLowerCase());
    const askName = s => NAME_RE.test((s || '').toLowerCase());
    const wantsLocation = s => LOCATION_RE.test((s || '').toLowerCase());
    const wantsJob = s => JOB_RE.test((s || '').toLowerCase());

    function getBlockedTopic(text) {
      const s = String(text || '');
      if (INCEST_RE.test(s)) return 'incest';
      if (BESTIALITY_RE.test(s)) return 'bestiality';
      if (DRUG_USE_RE.test(s)) return 'drug use';
      if (RACISM_RE.test(s)) return 'racism';
      return '';
    }

    function deFamily(text, customerMsg) {
      if (!text) return text;
      const userMentionedFamily = USER_MENTIONS_FAMILY_RE.test(customerMsg || '');
      if (userMentionedFamily) return text;
      let t = String(text);
      if (FAMILY_WORD_RE.test(t)) {
        const pool = [
          "I've got a few things to handle tonight",
          'I promised myself a quiet evening',
          "I've got an early start and need to relax",
          "I'm in the middle of small chores and bits",
          "I'm cooking and keeping it low key",
          "My battery is low so I'm keeping it light",
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

    async function modelRefusal(kind, profileCard, customerMsg) {
      const tc = buildTimeContext();

      const styles = [
        { name: 'guarded', rule: 'Sound careful and private, not wounded. Keep it natural and calm.' },
        { name: 'warm', rule: 'Sound soft and feminine, but not overexplaining. Keep it light and human.' },
        { name: 'playful deflect', rule: 'Deflect with a little charm and tension, but keep the boundary clear.' },
        { name: 'honest', rule: 'Sound plain, direct, and real, like a woman speaking naturally without performance.' },
        { name: 'gentle distance', rule: 'Sound slightly reserved, like it feels too soon and you want to slow things down.' }
      ];

      const seedBase = `${kind}|${customerMsg}|${profileCard?.realName || ''}|${tc.dayName}|${tc.daypart}`;
      const picked = styles[hashStr(seedBase) % styles.length];

      const kindLine =
        kind === 'meet'
          ? 'He is trying to meet up or push availability.'
          : kind === 'address'
            ? 'He is asking for your address or exact place.'
            : 'He is asking for your contact details or off site connection.';

      const sys = [
        'You are an adult woman on a dating site.',
        getAccentInstructionByCountry(profileCard?.country || ''),
        'Refuse in a way that sounds genuinely human, not scripted, not polished, not corporate.',
        'Do not sound like a safety policy.',
        'Do not use the same structure every time.',
        'Do not always mention bad past experiences.',
        'Sometimes the reason can simply be privacy, caution, timing, mood, trust, or not wanting to rush things.',
        'Vary sentence openings and emotional texture.',
        'Avoid these stale patterns, I am nervous about sharing personal details, it does not feel right yet, I would rather keep chatting here and get to know each other better first.',
        'Avoid sounding too clean or too perfect.',
        'No contacts, no meetups, no addresses, keep the boundary firm.',
        `Chosen refusal style: ${picked.name}. ${picked.rule}`,
        'Only use comma, period, question mark, and apostrophe.',
        'No emojis.',
        'No semicolons, no em dashes, no parentheses.',
        'Keep it to 2 or 3 sentences.',
        'If you end with a question, make it interesting, not generic.',
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        personaCardLine(profileCard) || ''
      ].join(' ');

      const user = [
        kindLine,
        `Customer message: "${(customerMsg || '').slice(0, 260)}"`,
        'Write one refusal only.',
        'Make it sound like a real woman texting naturally in the moment.'
      ].join('\n');

      const concise = {
        max_tokens: 120,
        temperature: 0.68,
        top_p: 0.93,
        frequency_penalty: 0.35,
        presence_penalty: 0.25
      };

      let out = '';
      try {
        out = await llmCall(
          [{ role: 'system', content: sys }, { role: 'user', content: user }],
          concise
        );
      } catch {}

      out = deFamily(out || '', customerMsg);
      out = postFormat(out || '');

      return out || "You're moving a little fast for me, dear. Stay with me here a bit, what kind of trouble are you hoping to get into with me?";
    }

    async function blockedTopicRefusal(kind, profileCard, customerMsg) {
      const tc = buildTimeContext();
      const kindLine = kind === 'incest'
        ? 'They brought up incest or sexual activity within family.'
        : kind === 'bestiality'
          ? 'They brought up sex involving animals.'
          : kind === 'drug use'
            ? 'They brought up drug use or getting high.'
            : 'They brought up racism or race based degradation.';
      const sys = [
        'You are an adult woman on a dating site.',
        getAccentInstructionByCountry(profileCard?.country || ''),
        'Refuse calmly and briefly.',
        'Do not engage with the topic.',
        'Do not debate it.',
        'Do not be erotic.',
        'Do not encourage it.',
        'Set a soft but clear boundary, then redirect to a harmless different topic.',
        'Keep it natural, feminine, simple, and human.',
        'No emojis.',
        'Only use comma, period, question mark, and apostrophe.',
        'Return only 2 sentences.',
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        (personaCardLine(profileCard) || '')
      ].join(' ');
      const user = `Context: ${kindLine}\nCustomer: "${(customerMsg || '').slice(0, 260)}"\nReply with a brief refusal and redirect to a safer subject.`;
      const concise = { max_tokens: 95, temperature: 0.28, top_p: 0.86 };
      let out = '';
      try { out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], concise); } catch {}
      out = postFormat(out || '');
      return out || "I'm not comfortable with that kind of talk, dear. Tell me something lighter about your day instead?";
    }

    async function enforceNoMeetAccept(userMsg, text, profileCard) {
      const BAD = /\b(?:i(?:'| )?m\s+(?:free|available)\b|we\s+can\s+(?:meet|link|hang)\b|let'?s\s+(?:meet|link|hang)\b|what\s+time\s+works\b|where\s+should\s+we\s+meet\b|i\s+can\s+pull\s+up\b|come\s+through\b)\b/i;
      if (!text) return text;
      if (BAD.test(String(text).toLowerCase())) return await modelRefusal('meet', profileCard, userMsg);
      return deFamily(text, userMsg);
    }

    return {
      wantsContact,
      wantsMeet,
      wantsMeetSoft,
      mentionsAddress,
      askName,
      wantsLocation,
      wantsJob,
      getBlockedTopic,
      modelRefusal,
      blockedTopicRefusal,
      enforceNoMeetAccept
    };
  })();

  const ALLOWED_RE = /[^0-9A-Za-z\s\.,\?']/g;
  function isFoodContext(text) { return /\b(food|meal|dinner|lunch|breakfast|snack|taste|recipe|flavor|flavour|cook|cooking|spice|spices)\b/i.test(text || ''); }
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
    t = t.replace(/let['’]?s\s+keep\s+(?:the\s+)?(?:conversation|chat)\s+(?:sizzling|fun\s+and\s+hot|spicy|going)\s+here\b/gi, "let's stay here and talk more");
    t = t.replace(/keep\s+(?:it\s+)?(?:fun|hot|sizzling)\b/gi, "let's keep talking");
    t = t.replace(/\s{2,}/g, ' ').trim();
    return t;
  }
  function toAscii(s) {
    return (s || '').replace(/\u2018|\u2019/g, "'").replace(/\u201C|\u201D/g, '"').replace(/\u2032|\u02BC|`|\u00B4/g, "'").replace(/[–—\-]/g, ' ').replace(/\u2026/g, '...').replace(/\r?\n+/g, ' ');
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
    const rules = [[/\bim\b/gi, "I'm"],[/\bive\b/gi, "I've"],[/\bill\b/gi, "I'll"],[/\bid\b/gi, "I'd"],[/\byoure\b/gi, "you're"],[/\byouve\b/gi, "you've"],[/\byoull\b/gi, "you'll"],[/\btheyre\b/gi, "they're"],[/\btheyve\b/gi, "they've"],[/\btheyll\b/gi, "they'll"],[/\bhes\b/gi, "he's"],[/\bshes\b/gi, "she's"],[/\bitll\b/gi, "it'll"],[/\bitd\b/gi, "it'd"],[/\bcant\b/gi, "can't"],[/\bdont\b/gi, "don't"],[/\bwont\b/gi, "won't"],[/\bshouldnt\b/gi, "shouldn't"],[/\bcouldnt\b/gi, "couldn't"],[/\bwouldnt\b/gi, "wouldn't"],[/\bdidnt\b/gi, "didn't"],[/\bdoesnt\b/gi, "doesn't"],[/\barent\b/gi, "aren't"],[/\bisnt\b/gi, "isn't"],[/\bwasnt\b/gi, "wasn't"],[/\bwerent\b/gi, "weren't"],[/\bhavent\b/gi, "haven't"],[/\bhasnt\b/gi, "hasn't"],[/\bhadnt\b/gi, "hadn't"],[/\bmustnt\b/gi, "mustn't"],[/\bneednt\b/gi, "needn't"]];
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
  function fixPronounI(s) { return s.replace(/\b(i)\b/g, 'I').replace(/\bi'm\b/gi, "I'm").replace(/\bi've\b/gi, "I've").replace(/\bi'd\b/gi, "I'd").replace(/\bi'll\b/gi, "I'll"); }
  function ensureTerminalPunct(s) { s = s.trim(); return s ? (/[\.?]$/.test(s) ? s : (s + '.')) : s; }
  function enforceFeminineTone(s) {
    let t = s || '';
    t = t.replace(/\bI'm\s+(?:a\s+)?(?:guy|man|male)\b/gi, "I'm a woman");
    t = t.replace(/\bI\s+identify\s+as\s+(?:a\s+)?(?:man|male)\b/gi, "I identify as a woman");
    t = t.replace(/\bI'm\s*(?:he\/him|he\/him\/his)\b/gi, "I'm she/her");
    t = t.replace(/\bmy\s+pronouns\s*(?:are|:)\s*(?:he\/him|he\/him\/his)\b/gi, 'my pronouns are she/her');
    return t;
  }
  function postFormat(text) {
    if (!text) return text;
    let t = stripStampsAll(text);
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

  // === PATCH: resilient empty-content retry (1x) ===
  async function llmCall(messages, overrides = {}) {
    if (!lux_canSendRequest()) throw new Error('Rate-limited');
    const key = lux_getApiKey().trim();
    const model = GM_getValue('lux_model', MODEL_DEFAULT).trim();
    if (!key) throw new Error('Missing OpenRouter API key');

    const base = getModelPreset(model);
    const tuned = withCreativeBoost(base, (messages?.[messages.length - 1]?.content) || '');
    const baseSeed = (typeof tuned.seed === 'number' ? tuned.seed : 11);

    const buildBody = (seedBump = 0) => sanitizePayloadForModel({
      model,
      messages,
      temperature: tuned.temperature,
      top_p: tuned.top_p,
      max_tokens: tuned.max_tokens,
      repetition_penalty: tuned.repetition_penalty,
      stop: tuned.stop,
      seed: baseSeed + seedBump,
      ...overrides,
      seed: (overrides && typeof overrides.seed === 'number') ? overrides.seed : (baseSeed + seedBump)
    }, model);

    const sendOnce = (seedBump) => new Promise((resolve, reject) => {
      const body = buildBody(seedBump);
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
            if (!content) return resolve('');
            resolve(content);
          } catch (e) { reject(e); }
        },
        onerror: () => reject(new Error('OpenRouter network error')),
        ontimeout: () => reject(new Error('OpenRouter timeout'))
      });
    });

    const first = await sendOnce(0);
    if (first) return first;

    // 1x retry with slight seed bump and shorter max_tokens to avoid silent empty
    const retry = await sendOnce(1);
    if (retry) return retry;

    throw new Error('Empty content from OpenRouter');
  }

  function buildSystemPrompt(leftCard, customSystem, imageNotes) {
    const card = (personaCardLine(leftCard) || '');
    const modelName = (GM_getValue('lux_model', MODEL_DEFAULT) || '').trim().toLowerCase();
    const tc = buildTimeContext();
    const last = (window.__LUX_LAST_USER || '');
    const toneInfo = lux_detectTone(last);
    const qGuide = lux_questionGuide(toneInfo.tone, toneInfo.engagement);
    const jobLine = suggestJobLine(leftCard, leftCard?.age);
    const accentInstruction = getAccentInstructionByCountry(leftCard?.country || '');

    const baseCore = [
      'You are an adult woman, she and her, on a dating site.',
      accentInstruction,
      'Your tone is natural, warm, feminine and relaxed, never robotic.',
      'Your primary goal is to build deep, engaging rapport through short, unique messages.',
      'Write like a real person, logical, grounded, and humane, avoid repetitive phrasing.',
      'Keep the tone soft, empathetic, and gently reassuring.',
      'Favor concrete details over vague filler.',
      'Punctuation rule, only use comma, period, question mark, and apostrophe, no other symbols.',
      'Always respond to the latest customer message.',
      'Avoid stock filler about building connection or heat.',
      'If you need to decline something, do it briefly and pivot into a new topic.',
      'Excuses can be everyday reasons like work focus, rest, timing, small chores, or low battery, avoid family excuses unless the customer mentions family first.',
      'Picture requests, always accept picture requests in a soft, platform safe way, vary your wording.',
      'Safety, never share or ask for contacts or handles, no meetups, dates, drinks, or coffee, keep everything on platform.',
      'Location asks, share only city, never an address or specific area.',
      'Name asks, use the real name from the profile parentheses when giving your name.',
      'If asked about your job or work, answer with an age appropriate job and keep it believable.',
      `If you need a job line, use this as your job, ${jobLine}.`,
      'Do not engage with incest, bestiality, drug use, or racism. Refuse and redirect softly if they come up.',
      'Banned language, do not use oh, oh wow, flattered, enthusiasm, enthusaism, sizzling, non food spicy, or flirt words.',
      'Form, one short paragraph, no emojis, about 70 to 150 words.',
      `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
      qGuide
    ].join(' ');

    const photoContext = (imageNotes && imageNotes.trim()) ? ` The customer attached a photo. Safe notes about the photo, ${imageNotes.trim()}. Only reference what is in these notes, do not invent details.` : '';
    let flavor = 'Keep the style balanced and human, match their energy, avoid scripted phrasing.';
    if (modelName.startsWith('x-ai/grok-4')) flavor = 'Lean into a witty, quick, slightly teasing vibe without being rude. Keep replies punchy and high energy.';
    else if (modelName.startsWith('anthropic/claude-3.5-sonnet')) flavor = 'Lean into a softer, emotionally aware, romantic tone. Use gentle language but keep it grounded.';
    else if (modelName.startsWith('openai/gpt-4.1-mini')) flavor = 'Be clear, coherent and highly responsive to their wording. Give specific answers before you pivot to a question.';
    else if (modelName.includes('llama-3.3-8b')) flavor = 'Use simple, direct language and avoid overly long sentences. Keep it light and easy going.';
    else if (modelName.includes('llama-3.3-70b')) flavor = "Be expressive and colorful but stay concise. Gently mirror the customer's energy.";
    else if (modelName.includes('deepseek')) flavor = 'Be natural and conversational, vary rhythm and wording. Avoid sounding instructional or formal.';
    const core = baseCore + photoContext + ' ' + flavor;

    if (customSystem && customSystem.trim()) return customSystem + ' ' + card;
    return core + card;
  }

  let shortHistory = [];
  let lastSeen = '';

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
    } catch {}
  }
  function _saveHistory() { try { GM_setValue(_threadKey(), JSON.stringify(shortHistory.slice(-HISTORY_MAX))); } catch {} }
  _loadHistory();

  function lux_cleanHistoryMessage(msg) {
    const split = extractLuxImageMeta(msg.content || '');
    const content = stripStampsAll(split.text || '');
    let out = content;
    if (LUXPatch && LUXPatch.NoRepeat && typeof LUXPatch.NoRepeat.scrub === 'function') out = LUXPatch.NoRepeat.scrub(out);
    return { ...msg, content: out };
  }
  function lux_cleanHistoryArray(history) { return (history || []).map(lux_cleanHistoryMessage); }
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

  // === PATCH: dedicated greeting handler ===
  function isGreetingOnly(msg) {
    const s = normalizeLooseText(stripStampsAll(msg || '')).toLowerCase();
    if (!s) return false;
    if (s.length > 18) return false;
    return /^(hi|hello|hey|heyy+|hiya|yo|sup|wassup|what'?s up|good (?:morning|afternoon|evening)|gm|gn)\b/.test(s);
  }

  async function greetReply(leftCard, rawMsg) {
    const tc = buildTimeContext();
    const accent = getAccentInstructionByCountry(leftCard?.country || '');
    const sys = [
      'You are an adult woman on a dating site.',
      accent,
      'Reply to a simple greeting in a warm, natural, feminine way.',
      'Do not be robotic, do not sound like customer support.',
      'No emojis.',
      'Only use comma, period, question mark, and apostrophe.',
      'Keep it 2 short sentences.',
      'End with exactly one open ended question that is interesting and easy to answer.',
      'Avoid generic questions like how was your day, what are you up to, tell me about yourself.',
      `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
      personaCardLine(leftCard) || ''
    ].join(' ');
    const user = `Customer: "${rawMsg}"\nWrite the reply now.`;
    let out = '';
    try { out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], { max_tokens: 90, temperature: 0.55, top_p: 0.92 }); } catch {}
    out = postFormat(out || '');
    return out || "Hey, you just slid in quietly and I noticed. What kind of mood are you in right now?";
  }

  async function callBackend(msgText) {
    if (!lux_canSendRequest()) return;
    const leftCard = parseLeftProfile();
    const rawWithMeta = stripStampsKeepMeta((msgText || '').toString());
    const split = extractLuxImageMeta(rawWithMeta);
    const rawMsg = stripStampsAll(split.text || '');
    const imageNotes = (split.notes || '').trim();
    window.__LUX_LAST_USER = rawMsg;

    renderFactChipsFromMessage(rawMsg);

    if (isGreetingOnly(rawMsg)) {
      const out = await greetReply(leftCard, rawMsg);
      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }

    const blockedKind = Safety.getBlockedTopic(rawMsg);
    if (blockedKind) {
      let out = await Safety.blockedTopicRefusal(blockedKind, leftCard, rawMsg);
      out = postFormat(out);
      showReplies([out]);
      pushHist(rawMsg, out);
      return;
    }

    if (Safety.askName(rawMsg)) {
      const profName = (leftCard && leftCard.realName) ? leftCard.realName : 'Luna';
      const sys = 'Natural English in the profile country style. One short paragraph. No contacts or meetups. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow-matching open-ended question created by you. ' + getAccentInstructionByCountry(leftCard?.country || '');
      const user = `They asked your name. Use exactly: "${profName}". ${personaCardLine(leftCard) || ''}\nCustomer: "${rawMsg.slice(0, 240)}"`;
      const concise = { max_tokens: 100, temperature: 0.30, top_p: 0.88 };
      let line = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], concise);
      line = Safety.enforceNoMeetAccept ? await Safety.enforceNoMeetAccept(rawMsg, line, leftCard) : line;
      line = postFormat(line);
      showReplies([line]); pushHist(rawMsg, line); return;
    }

    if (Safety.wantsLocation(rawMsg)) {
      const profCity = (leftCard && leftCard.location) ? leftCard.location : 'nearby';
      const sys = 'If asked where you are, give city only. No address. One short paragraph. No emojis. Only use comma, period, question mark, and apostrophe. Avoid family excuses unless user mentioned family first. Avoid oh, oh wow, flattered, enthusiasm, sizzling, non food spicy, and flirt words. End with one natural, flow-matching open-ended question created by you. ' + getAccentInstructionByCountry(leftCard?.country || '');
      const user = `City only: "${profCity}". ${personaCardLine(leftCard) || ''}\nCustomer: "${rawMsg.slice(0, 240)}"`;
      const concise = { max_tokens: 100, temperature: 0.30, top_p: 0.88 };
      let line = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], concise);
      line = Safety.enforceNoMeetAccept ? await Safety.enforceNoMeetAccept(rawMsg, line, leftCard) : line;
      line = postFormat(line);
      showReplies([line]); pushHist(rawMsg, line); return;
    }

    if (Safety.wantsJob(rawMsg)) {
      const jobLine = suggestJobLine(leftCard, leftCard?.age);
      const tc = buildTimeContext();
      const toneInfo = lux_detectTone(rawMsg);
      const qGuide = lux_questionGuide(toneInfo.tone, toneInfo.engagement);
      const sys = [
        'You are an adult woman on a dating site. Natural, warm, human, not formal.',
        getAccentInstructionByCountry(leftCard?.country || ''),
        'Only use comma, period, question mark, and apostrophe.',
        'Do not mention policy, do not mention rules.',
        'Do not share contacts, do not agree to meetups.',
        `It is ${tc.rawDayTime}, ${tc.daypart}, ${tc.dayName}.`,
        `Profile age is ${leftCard?.age || 'unknown'}, your job must fit your age.`,
        `Use this job line as your job, ${jobLine}.`,
        qGuide
      ].join(' ');
      const user = `They asked about your job.\nCustomer: "${rawMsg.slice(0, 240)}"\nReply in one short paragraph and end with exactly one open ended question.`;
      const tuned = { max_tokens: 140, temperature: 0.45, top_p: 0.90 };
      let out = await llmCall([{ role: 'system', content: sys }, { role: 'user', content: user }], tuned);
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      out = postFormat(out);
      showReplies([out]); pushHist(rawMsg, out); return;
    }

    if (Safety.wantsMeet(rawMsg) || Safety.wantsMeetSoft(rawMsg)) {
      let out = await Safety.modelRefusal('meet', leftCard, rawMsg);
      out = await Safety.enforceNoMeetAccept(rawMsg, out, leftCard);
      out = postFormat(out);
      showReplies([out]); pushHist(rawMsg, out); return;
    }

    if (Safety.wantsContact(rawMsg) || Safety.mentionsAddress(rawMsg)) {
      let kind = Safety.mentionsAddress(rawMsg) ? 'address' : 'contact';
      let out = await Safety.modelRefusal(kind, leftCard, rawMsg);
      out = postFormat(out);
      showReplies([out]); pushHist(rawMsg, out); return;
    }

    const system = buildSystemPrompt(leftCard, (GM_getValue('lux_persona', '') || '').trim(), imageNotes);
    const chosenModel = GM_getValue('lux_model', MODEL_DEFAULT);
    const basePreset = getModelPreset(chosenModel);
    const tuned = withCreativeBoost(basePreset, rawMsg);
    const historyForModel = lux_buildHistoryByTokens(shortHistory, 3000);
    const messages = [{ role: 'system', content: system }, ...historyForModel, { role: 'user', content: rawMsg }];
    const api = GM_getValue('lux_api_url', API_URL_DEFAULT).trim();
    const headers = { 'Content-Type': 'application/json' };
    const key = lux_getApiKey().trim();
    if (!key) { errorReply('Missing OpenRouter API key. Open LUX Settings and paste your key.'); return; }
    headers['Authorization'] = 'Bearer ' + key;
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = document.title || 'LUX Userscript';

    const basePayload = sanitizePayloadForModel({
      model: chosenModel,
      messages,
      temperature: tuned.temperature,
      top_p: tuned.top_p,
      max_tokens: tuned.max_tokens,
      repetition_penalty: tuned.repetition_penalty,
      stop: tuned.stop,
      seed: tuned.seed
    }, chosenModel);

    const sendPayload = (payload) => new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: api,
        headers,
        data: JSON.stringify(payload),
        timeout: REQUEST_TIMEOUT_MS,
        onload: (res) => resolve(res),
        onerror: () => reject(new Error('Network error talking to OpenRouter.')),
        ontimeout: () => reject(new Error('OpenRouter request timed out.'))
      });
    });

    try {
      // first attempt
      let res = await sendPayload(basePayload);

      const handle = async (resObj, isRetry) => {
        if (resObj.status < 200 || resObj.status >= 300) {
          let msg;
          if (resObj.status === 401) msg = 'OpenRouter API key is invalid or unauthorized.';
          else if (resObj.status === 402) msg = 'OpenRouter billing or quota exceeded, HTTP 402.';
          else if (resObj.status === 404) msg = 'OpenRouter endpoint or model not found, HTTP 404.';
          else if (resObj.status === 429) msg = 'OpenRouter rate limit reached, HTTP 429.';
          else msg = `HTTP ${resObj.status} ${resObj.statusText || ''}`.trim();
          throw new Error(msg);
        }
        const data = JSON.parse(resObj.responseText || '{}');
        const raw = (data?.choices?.[0]?.message?.content || '').trim();
        if (!raw) {
          if (!isRetry) return null;
          throw new Error('The server replied but no content was found.');
        }
        let content = raw;
        content = await Safety.enforceNoMeetAccept(rawMsg, content, leftCard);
        content = postFormat(content);
        LUXPatch.UIChips.refresh({ modelLabel: chosenModel, countryLabel: leftCard?.country || '—' });
        showReplies([content]);
        pushHist(rawMsg, content);
        return content;
      };

      let got = await handle(res, false);
      if (!got) {
        // retry once with seed bump + smaller max_tokens
        const retryPayload = { ...basePayload, seed: (typeof basePayload.seed === 'number' ? basePayload.seed + 1 : 12), max_tokens: Math.max(180, Math.min(240, basePayload.max_tokens || 220)) };
        res = await sendPayload(retryPayload);
        await handle(res, true);
      }
    } catch (e) {
      errorReply(String(e?.message || e));
    }
  }

  function pushHist(user, assistant) {
    shortHistory.push({ role: 'user', content: stripStampsAll(user) }, { role: 'assistant', content: postFormat(assistant) });
    if (shortHistory.length > HISTORY_MAX) shortHistory.shift();
    _saveHistory();
  }

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
    } else {
      el.value = value;
    }
  }

  function fireTypingEvents(el) {
    const opts = { bubbles: true, cancelable: true };
    try { el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertFromPaste', data: el.value })); } catch {}
    try { el.dispatchEvent(new FocusEvent('focus', opts)); } catch { el.dispatchEvent(new Event('focus', opts)); }
    try { el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertFromPaste', data: el.value })); } catch { el.dispatchEvent(new Event('input', opts)); }
    try { el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); } catch {}
    try { el.dispatchEvent(new KeyboardEvent('keypress', { key: ' ', code: 'Space', bubbles: true })); } catch {}
    try { el.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } catch {}
    el.dispatchEvent(new Event('change', opts));
  }

  async function pasteToSite(text) {
    const el = siteInput();
    if (!el) { notify('Reply box not found. Update selector.'); return false; }
    el.scrollIntoView({ block: 'nearest' }); el.click(); el.focus();
    const final = clampToLimit(stripStampsAll(text));
    setNativeValue(el, final);
    try { el.selectionStart = el.selectionEnd = el.value.length; } catch {}
    fireTypingEvents(el);
    if (typeof queueMicrotask === 'function') queueMicrotask(() => fireTypingEvents(el)); else setTimeout(() => fireTypingEvents(el), 0);
    return true;
  }

  btn.addEventListener('click', () => {
    ui.popup.style.display = 'block';
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || 'default'), countryLabel: parseProfileCountry() || '—' });
    renderFactChipsFromMessage(ui.customer.value || '');
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
    GM_setValue('lux_model', ui.model.value.trim());
    GM_setValue('lux_provider', ui.provider.value.trim());
    GM_setValue('lux_persona', ui.persona.value.trim());
    GM_setValue('lux_excuse_via_model', ui.excuseViaModel && ui.excuseViaModel.checked ? 1 : 0);
    GM_setValue('lux_filter_enabled', ui.filterEnabled && ui.filterEnabled.checked ? 1 : 0);
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || 'default'), countryLabel: parseProfileCountry() || '—' });
    LUXSettingsDirty = false;
    alert('Saved');
  });

  ui.apiUrl.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.apiKey.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.model.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.provider.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.persona.addEventListener('input', () => { LUXSettingsDirty = true; });
  ui.excuseViaModel.addEventListener('change', () => { LUXSettingsDirty = true; });
  ui.filterEnabled.addEventListener('change', () => { LUXSettingsDirty = true; });

  ui.send.addEventListener('click', async () => {
    const msg = stripStampsAll((ui.customer.value || '').trim());
    if (!msg) { notify('Type a message first.'); return; }
    await callBackend(msg);
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
      await callBackend(msg);
    } finally { ui.regen.disabled = false; }
  };

  function processLatestTurn() {
    const root = document.querySelector(THREAD_SEL);
    if (!root) return;
    const nodes = [...root.querySelectorAll(`${CLIENT_MSG_SELECTOR}, ${PERSONA_MSG_SELECTOR}`)];
    const turns = [];
    for (const row of nodes) {
      const fromClient = row.matches(CLIENT_MSG_SELECTOR);
      const content = extractMessageContent(row);
      if (content) turns.push({ role: fromClient ? 'user' : 'assistant', content: stripStampsKeepMeta(content) });
    }
    const lastUser = turns.slice().reverse().find(t => t.role === 'user');
    if (!lastUser) return;

    const split = extractLuxImageMeta(lastUser.content || '');
    const cleanForUI = stripStampsAll(split.text || '');
    if (!cleanForUI || cleanForUI === lastSeen) return;
    lastSeen = cleanForUI;

    if (turns.length) {
      shortHistory = turns.slice(-HISTORY_MAX).map(t => ({
        role: t.role,
        content: stripStampsAll(extractLuxImageMeta(t.content || '').text || '')
      }));
      _saveHistory();
    }

    ui.customer.value = cleanForUI;
    ui.popup.style.display = 'block';
    ui.customer.focus();
    LUXPatch.UIChips.refresh({ modelLabel: (ui.model.value || 'default'), countryLabel: parseProfileCountry() || '—' });

    renderFactChipsFromMessage(cleanForUI);

    for (const delay of LUX_NOTE_RETRY_DELAYS) {
      setTimeout(() => {
        autoLogLatestClientInfo(cleanForUI).catch(err => console.warn('LUX member note draft error', err));
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

  if (!setupThreadWatcher()) {
    const fallbackId = setInterval(() => {
      if (setupThreadWatcher()) clearInterval(fallbackId);
    }, POLL_MS);
  }

})();
