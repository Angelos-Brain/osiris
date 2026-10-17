import {
  SYSTEM_PROMPT,
  TOPICS,
  RECOGNITION_LANGUAGES,
  greetingFor,
  nudgeLine,
  isDonePhrase,
  isEcho,
  listeningDecision,
  findCorrections,
  capCorrections,
  parseTutorResponse,
  coachReply,
  localSummary,
  screenSummary,
  spokenSummary,
  pickMaleEnglishVoice,
  isProbablyMale,
  speechTimeoutMs,
  SILENCE_MS,
  NUDGE_MS,
} from "./engine.js";

const SETTINGS_KEY = "osiris.settings.v1";
const SESSIONS_KEY = "osiris.sessions.v1";

const defaultSettings = {
  rate: 0.9,
  voiceURI: "",
  lang: "en-US",
  geminiKey: "",
};

const state = {
  phase: "idle",
  active: false,
  topic: "daily life",
  live: "",
  reply: "",
  corrections: [],
  summary: null,
  messages: [],
  userTurns: 0,
  userTexts: [],
  asked: [],
  pastCorrections: [],
  lastSpoken: "",
  silenceTimer: null,
  speechTimer: null,
  listeningStartedAt: 0,
  lastSpeechAt: 0,
  interim: "",
  finalText: "",
  voices: [],
  settings: { ...defaultSettings },

  // Whisper / mic capture
  mediaStream: null,
  audioCtx: null,
  analyser: null,
  sourceNode: null,
  processor: null,
  captureBuffers: [],
  isSpeaking: false,
  speechStartAt: 0,
  rmsHistory: [],
  waveRaf: 0,
  whisperWorker: null,
  modelStatus: "not-started", // not-started | loading | ready | error
  modelDevice: "",
  modelProgress: 0,
  lastError: "",
  micPermission: "unknown", // unknown | granted | denied | prompt
  browserName: detectBrowser(),
};

function detectBrowser() {
  const ua = navigator.userAgent || "";
  if (/Brave/i.test(ua) || (navigator.brave && typeof navigator.brave.isBrave === "function"))
    return "Brave";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  return "Unknown";
}

function $(sel) {
  return document.querySelector(sel);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) Object.assign(state.settings, JSON.parse(raw));
  } catch {}
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch {}
}

function saveSession() {
  try {
    const list = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
    list.unshift({
      at: Date.now(),
      topic: state.topic,
      turns: state.userTurns,
      summary: state.summary,
    });
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {}
}

function setPhase(phase) {
  state.phase = phase;
  const orb = $("#orb");
  if (orb) {
    orb.className = "orb is-" + phase;
    orb.setAttribute("aria-label", "Osiris is " + phase);
  }
  const status = $("#status");
  if (status) {
    const map = {
      idle: "Click to start",
      listening: "Listening…",
      thinking: "Thinking…",
      speaking: "Speaking…",
      summary: "Session summary",
      downloading: "Downloading…",
    };
    status.textContent = map[phase] || phase;
  }
  const mic = $("#mic");
  if (mic) {
    mic.classList.toggle("is-listening", phase === "listening");
    mic.setAttribute("aria-pressed", state.active ? "true" : "false");
  }
  const endBtn = $("#end-session");
  if (endBtn) endBtn.disabled = !state.active;
}

function escapeHtml(s) {
  const a = String.fromCharCode(38);
  return String(s)
    .replace(/&/g, a + "amp;")
    .replace(/</g, a + "lt;")
    .replace(/>/g, a + "gt;")
    .replace(/"/g, a + "quot;");
}

function renderLive() {
  const el = $("#live");
  if (el) el.textContent = state.live || state.interim || "Your words will show up here while you speak.";
}

function renderReply() {
  const el = $("#reply");
  if (el) el.textContent = state.reply || "Osiris will answer here and say it out loud.";
}

function renderCorrections() {
  const panel = $("#corrections-panel");
  if (!panel) return;

  if (state.summary) {
    panel.className = "panel paper wide";
    panel.innerHTML =
      '<h2 class="hud-label">SESSION SUMMARY</h2>' +
      "<p><strong>You did well</strong></p><ol>" +
      state.summary.well.map((line) => "<li>" + escapeHtml(line) + "</li>").join("") +
      "</ol><p><strong>Top mistakes</strong></p>" +
      state.summary.mistakes
        .map(
          (item) =>
            '<p class="fix"><span class="said">You said: ' +
            escapeHtml(item.said) +
            '</span><br><span class="better">Better: ' +
            escapeHtml(item.better) +
            '</span><span class="why">Why: ' +
            escapeHtml(item.why) +
            "</span></p>"
        )
        .join("") +
      '<p><strong>New words</strong></p><ul class="words">' +
      state.summary.words.map((w) => "<li>" + escapeHtml(w) + "</li>").join("") +
      "</ul>";
    return;
  }

  panel.className = "panel paper wide";
  if (!state.corrections.length) {
    panel.innerHTML =
      '<h2 class="hud-label">CORRECTIONS</h2>' +
      "<p>Corrections will show up here in big text when there is a better way to say something.</p>";
    return;
  }
  panel.innerHTML =
    '<h2 class="hud-label">CORRECTIONS</h2>' +
    state.corrections
      .map(
        (item) =>
          '<p class="fix"><span class="said">You said: ' +
          escapeHtml(item.said) +
          '</span><br><span class="better">Better: ' +
          escapeHtml(item.better) +
          '</span><span class="why">Why: ' +
          escapeHtml(item.why) +
          "</span></p>"
      )
      .join("");
}

function updateClock() {
  const el = $("#clock");
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function openSheet(title, bodyHtml) {
  const backdrop = $("#backdrop");
  const titleEl = $("#sheet-title");
  const bodyEl = $("#sheet-body");
  if (!backdrop || !titleEl || !bodyEl) return;
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  backdrop.hidden = false;
}

function closeSheet() {
  const backdrop = $("#backdrop");
  if (backdrop) backdrop.hidden = true;
  const bodyEl = $("#sheet-body");
  if (bodyEl) bodyEl.innerHTML = "";
}

function populateTopics() {
  const row = $("#topics");
  if (!row) return;
  row.innerHTML = TOPICS.map(
    (t) =>
      '<button type="button" class="chip' +
      (t.id === state.topic ? " is-on" : "") +
      '" data-topic="' +
      t.id +
      '">' +
      t.label +
      "</button>"
  ).join("");
  row.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn || state.active) return;
    state.topic = btn.dataset.topic;
    row.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-on", c.dataset.topic === state.topic));
  });
}

function loadVoices() {
  state.voices = window.speechSynthesis?.getVoices() || [];
}

function speak(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis || !text) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = Number(state.settings.rate) || 0.9;
    u.lang = state.settings.lang || "en-US";
    const chosen =
      state.voices.find((v) => v.voiceURI === state.settings.voiceURI) ||
      pickMaleEnglishVoice(state.voices);
    if (chosen) u.voice = chosen;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(state.speechTimer);
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    state.speechTimer = setTimeout(finish, speechTimeoutMs(text, u.rate));
    window.speechSynthesis.speak(u);
  });
}

/* ---------- Whisper worker + mic capture ---------- */

function ensureWorker() {
  if (state.whisperWorker) return state.whisperWorker;
  try {
    const worker = new Worker(new URL("./whisper-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = onWorkerMessage;
    worker.onerror = (e) => {
      state.modelStatus = "error";
      state.lastError = "Worker error: " + (e.message || "unknown");
      showWarn("The speech model worker failed. You can still type your answers.");
    };
    state.whisperWorker = worker;
    return worker;
  } catch (err) {
    state.modelStatus = "error";
    state.lastError = "Could not start speech worker: " + (err?.message || String(err));
    return null;
  }
}

function onWorkerMessage(event) {
  const msg = event.data || {};
  if (msg.type === "status") {
    if (msg.status === "loading") {
      state.modelStatus = "loading";
      state.modelDevice = msg.device || "";
    } else if (msg.status === "ready") {
      state.modelStatus = "ready";
      state.modelDevice = msg.device || state.modelDevice;
      state.modelProgress = 100;
      const note = $("#note");
      if (note) {
        note.hidden = true;
        note.textContent = "";
      }
    } else if (msg.status === "booted") {
      // idle
    }
  } else if (msg.type === "progress") {
    state.modelStatus = "loading";
    if (typeof msg.progress === "number") {
      state.modelProgress = Math.min(100, Math.max(0, msg.progress));
      showDownloadProgress(state.modelProgress);
    }
  } else if (msg.type === "result") {
    const text = (msg.text || "").trim();
    finishUtterance(text);
  } else if (msg.type === "error") {
    state.modelStatus = "error";
    state.lastError = msg.message || "Unknown model error";
    showWarn("Speech model problem: " + state.lastError + " You can type your answer.");
    if (state.phase === "thinking" || state.phase === "listening") {
      state.live = "Model error. Type your answer below.";
      renderLive();
      if (state.active) setPhase("listening");
    }
  } else if (msg.type === "info") {
    state.modelDevice = msg.device || state.modelDevice;
    if (msg.ready) state.modelStatus = "ready";
  }
}

function showDownloadProgress(pct) {
  const note = $("#note");
  if (!note) return;
  note.hidden = false;
  note.textContent = "Downloading Osiris's ears: " + pct + "%… only the first time";
  if (state.phase !== "speaking" && state.phase !== "thinking") {
    setPhase("downloading");
  }
}

function showWarn(text) {
  const warn = $("#warn");
  if (warn) {
    warn.hidden = false;
    warn.textContent = text;
  }
}

function clearWarn() {
  const warn = $("#warn");
  if (warn) {
    warn.hidden = true;
    warn.textContent = "";
  }
}

async function ensureMicPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    state.micPermission = "denied";
    return { ok: false, error: "no-getUserMedia" };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    state.micPermission = "granted";
    stream.getTracks().forEach((t) => t.stop());
    clearWarn();
    return { ok: true };
  } catch (err) {
    const name = err && err.name ? err.name : String(err);
    state.micPermission = "denied";
    state.lastError = "Microphone: " + name;
    showWarn(
      "Microphone blocked. Click the lock icon near the address bar, allow Microphone, then click the mic again. Or type your answer below."
    );
    state.live = "Microphone blocked. Allow mic permission or type your answer.";
    renderLive();
    return { ok: false, error: name };
  }
}

function stopCapture() {
  cancelAnimationFrame(state.waveRaf);
  state.waveRaf = 0;
  try {
    if (state.processor) {
      state.processor.disconnect();
      state.processor.onaudioprocess = null;
      state.processor = null;
    }
  } catch {}
  try {
    if (state.sourceNode) {
      state.sourceNode.disconnect();
      state.sourceNode = null;
    }
  } catch {}
  try {
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach((t) => t.stop());
      state.mediaStream = null;
    }
  } catch {}
  try {
    if (state.audioCtx && state.audioCtx.state !== "closed") {
      state.audioCtx.close();
    }
  } catch {}
  state.audioCtx = null;
  state.analyser = null;
  state.captureBuffers = [];
  state.isSpeaking = false;
  state.speechStartAt = 0;
  state.rmsHistory = [];
}

function stopListening() {
  clearTimeout(state.silenceTimer);
  stopCapture();
}

function computeRms(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i];
    sum += v * v;
  }
  return Math.sqrt(sum / Math.max(1, buf.length));
}

function updateWaveFromRms(rms) {
  const bars = document.querySelectorAll(".orb .bars span");
  if (!bars.length) return;
  const level = Math.min(1.2, Math.max(0.2, rms * 12));
  bars.forEach((span, i) => {
    const jitter = 0.7 + ((i * 17) % 10) / 30;
    span.style.transform = "scaleY(" + (level * jitter).toFixed(3) + ")";
  });
}

function startWaveLoop() {
  cancelAnimationFrame(state.waveRaf);
  const tick = () => {
    if (state.phase !== "listening" || !state.analyser) return;
    const data = new Float32Array(state.analyser.fftSize);
    state.analyser.getFloatTimeDomainData(data);
    const rms = computeRms(data);
    updateWaveFromRms(rms);
    state.waveRaf = requestAnimationFrame(tick);
  };
  state.waveRaf = requestAnimationFrame(tick);
}

function resampleTo16k(float32, fromRate) {
  if (fromRate === 16000) return float32;
  const ratio = fromRate / 16000;
  const newLen = Math.round(float32.length / ratio);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, float32.length - 1);
    const t = src - i0;
    out[i] = float32[i0] * (1 - t) + float32[i1] * t;
  }
  return out;
}

function flattenBuffers(buffers) {
  let total = 0;
  for (const b of buffers) total += b.length;
  const out = new Float32Array(total);
  let offset = 0;
  for (const b of buffers) {
    out.set(b, offset);
    offset += b.length;
  }
  return out;
}

async function startListening() {
  stopListening();
  state.interim = "";
  state.finalText = "";
  state.live = "";
  state.listeningStartedAt = Date.now();
  state.lastSpeechAt = 0;
  state.captureBuffers = [];
  state.isSpeaking = false;
  state.speechStartAt = 0;
  renderLive();

  const perm = await ensureMicPermission();
  if (!perm.ok) {
    setPhase("listening");
    return;
  }

  const worker = ensureWorker();
  if (!worker) {
    state.live = "Speech engine failed to start. Type your answer below.";
    renderLive();
    setPhase("listening");
    return;
  }

  if (state.modelStatus === "not-started" || state.modelStatus === "error") {
    worker.postMessage({ type: "preload" });
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    state.mediaStream = stream;
    state.micPermission = "granted";

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    state.audioCtx = audioCtx;
    if (audioCtx.state === "suspended") await audioCtx.resume();
    window.__osirisLastSampleRate = audioCtx.sampleRate;

    const source = audioCtx.createMediaStreamSource(stream);
    state.sourceNode = source;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.3;
    state.analyser = analyser;
    source.connect(analyser);

    const bufferSize = 4096;
    const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
    state.processor = processor;

    const SPEECH_THRESHOLD = 0.015;

    processor.onaudioprocess = (e) => {
      if (state.phase !== "listening" || !state.active) return;
      const input = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      const rms = computeRms(copy);

      state.rmsHistory.push(rms);
      if (state.rmsHistory.length > 8) state.rmsHistory.shift();
      const avgRms = state.rmsHistory.reduce((a, b) => a + b, 0) / state.rmsHistory.length;

      if (avgRms > SPEECH_THRESHOLD) {
        if (!state.isSpeaking) {
          state.isSpeaking = true;
          state.speechStartAt = Date.now();
        }
        state.lastSpeechAt = Date.now();
        state.captureBuffers.push(copy);
        if (state.live !== "Listening… (I hear you)") {
          state.live = "Listening… (I hear you)";
          renderLive();
        }
      } else if (state.isSpeaking) {
        state.captureBuffers.push(copy);
      }
    };

    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioCtx.destination);

    setPhase("listening");
    state.live = "Listening… speak now.";
    renderLive();
    startWaveLoop();
    scheduleSilenceCheck();
  } catch (err) {
    state.lastError = "Could not start microphone: " + (err?.message || String(err));
    state.live = "Could not start mic. Type your answer below.";
    renderLive();
    showWarn(state.lastError);
    setPhase("listening");
  }
}

function scheduleSilenceCheck() {
  clearTimeout(state.silenceTimer);
  state.silenceTimer = setTimeout(() => {
    if (state.phase !== "listening" || !state.active) return;
    const now = Date.now();
    const msSinceVoice = state.lastSpeechAt ? now - state.lastSpeechAt : now - state.listeningStartedAt;
    const msSinceStart = now - state.listeningStartedAt;
    const heardSpeech = state.isSpeaking || state.captureBuffers.length > 0;
    const action = listeningDecision({ heardSpeech, msSinceVoice, msSinceStart });

    if (action === "finalize") {
      const speechDuration = state.speechStartAt ? now - state.speechStartAt : 0;
      if (speechDuration < 400 && state.captureBuffers.length < 4) {
        state.captureBuffers = [];
        state.isSpeaking = false;
        state.lastSpeechAt = 0;
        state.live = "Listening… speak now.";
        renderLive();
        scheduleSilenceCheck();
        return;
      }
      finalizeAndTranscribe();
    } else if (action === "nudge") {
      stopCapture();
      state.reply = nudgeLine();
      renderReply();
      state.lastSpoken = state.reply;
      setPhase("speaking");
      speak(state.reply).then(async () => {
        if (state.active) await startListening();
      });
    } else {
      scheduleSilenceCheck();
    }
  }, 350);
}

function finalizeAndTranscribe() {
  clearTimeout(state.silenceTimer);
  const buffers = state.captureBuffers.slice();
  const rate =
    (state.audioCtx && state.audioCtx.sampleRate) ||
    window.__osirisLastSampleRate ||
    48000;
  if (state.audioCtx) window.__osirisLastSampleRate = state.audioCtx.sampleRate;

  stopCapture();

  if (!buffers.length) {
    state.live = "No speech heard. Speak again or type.";
    renderLive();
    if (state.active) startListening();
    return;
  }

  setPhase("thinking");
  state.live = "Thinking…";
  renderLive();

  const flat = flattenBuffers(buffers);
  const audio16k = resampleTo16k(flat, rate);

  const worker = ensureWorker();
  if (!worker) {
    state.live = "Speech engine unavailable. Type your answer.";
    renderLive();
    setPhase("listening");
    return;
  }

  worker.postMessage({ type: "transcribe", audio: audio16k }, [audio16k.buffer]);
}

function finishUtterance(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    state.live = "No speech heard. Speak again or type.";
    renderLive();
    if (state.active) startListening();
    return;
  }
  if (isEcho(cleaned, state.lastSpoken)) {
    if (state.active) startListening();
    return;
  }
  handleUserText(cleaned);
}

/* ---------- Tutor flow (unchanged behaviour) ---------- */

async function askOsiris(userText) {
  setPhase("thinking");
  state.reply = "…";
  renderReply();

  const history = state.messages
    .slice(-8)
    .map((m) => (m.role === "user" ? "Student" : "Osiris") + ": " + m.text)
    .join("\n");

  const prompt =
    SYSTEM_PROMPT +
    "\n\nTopic: " +
    state.topic +
    "\nUser turns: " +
    state.userTurns +
    "\nRecent:\n" +
    history +
    "\nStudent: " +
    userText +
    "\nReturn JSON only.";

  let result = null;
  const key = (state.settings.geminiKey || "").trim();

  if (key) {
    try {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
          encodeURIComponent(key),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        result = parseTutorResponse(
          text,
          localSummary({
            topic: state.topic,
            userTexts: state.userTexts,
            corrections: state.pastCorrections,
          })
        );
      }
    } catch {}
  }

  if (!result) {
    try {
      const url =
        "https://text.pollinations.ai/" +
        encodeURIComponent(prompt) +
        "?model=openai&seed=" +
        Math.floor(Math.random() * 100000);
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        const text = await res.text();
        result = parseTutorResponse(
          text,
          localSummary({
            topic: state.topic,
            userTexts: state.userTexts,
            corrections: state.pastCorrections,
          })
        );
      }
    } catch {}
  }

  if (!result) {
    const coached = coachReply({
      userText,
      topic: state.topic,
      asked: state.asked,
      userTurns: state.userTurns,
      userTexts: state.userTexts,
      pastCorrections: state.pastCorrections,
      forceSummary: false,
    });
    state.asked = coached.asked;
    result = coached.result;
  }

  if (!result.corrections?.length) {
    result.corrections = capCorrections(findCorrections(userText));
  }

  return result;
}

async function handleUserText(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    await startListening();
    return;
  }

  if (isDonePhrase(cleaned)) {
    await endSession(true);
    return;
  }

  state.messages.push({ role: "user", text: cleaned });
  state.userTexts.push(cleaned);
  state.userTurns += 1;
  state.live = cleaned;
  renderLive();

  const result = await askOsiris(cleaned);
  state.reply = result.reply;
  state.corrections = result.corrections || [];
  state.pastCorrections = state.pastCorrections.concat(state.corrections);
  state.lastSpoken = result.spoken || result.reply;
  state.messages.push({ role: "assistant", text: result.reply });
  renderReply();
  renderCorrections();

  if (result.summary) {
    state.summary = result.summary;
    setPhase("summary");
    await speak(result.spoken || result.reply);
    saveSession();
    state.active = false;
    setPhase("summary");
    return;
  }

  if (state.userTurns >= 10) {
    await endSession(true);
    return;
  }

  setPhase("speaking");
  await speak(result.spoken || result.reply);
  if (state.active) await startListening();
}

async function endSession(forceSummary) {
  stopListening();
  window.speechSynthesis?.cancel();
  clearTimeout(state.silenceTimer);
  clearTimeout(state.speechTimer);

  if (forceSummary || state.userTurns > 0) {
    const summary =
      state.summary ||
      localSummary({
        topic: state.topic,
        userTexts: state.userTexts,
        corrections: state.pastCorrections,
      });
    state.summary = summary;
    state.reply = screenSummary(summary);
    state.corrections = [];
    renderReply();
    renderCorrections();
    setPhase("summary");
    state.messages.push({ role: "assistant", text: state.reply });
    await speak(spokenSummary(summary));
    saveSession();
  } else {
    setPhase("idle");
    state.reply = "Session ended. Click the mic to start again.";
    renderReply();
  }
  state.active = false;
  const endBtn = $("#end-session");
  if (endBtn) endBtn.disabled = true;
}

async function startSession() {
  if (state.active) return;
  state.active = true;
  state.userTurns = 0;
  state.userTexts = [];
  state.asked = [];
  state.pastCorrections = [];
  state.messages = [];
  state.corrections = [];
  state.summary = null;
  state.live = "";
  state.reply = "";
  state.lastSpoken = "";
  clearWarn();
  const note = $("#note");
  if (note) {
    note.hidden = true;
    note.textContent = "";
  }
  renderCorrections();
  renderLive();
  renderReply();

  ensureWorker()?.postMessage({ type: "preload" });

  state.live = "Checking microphone…";
  renderLive();
  const perm = await ensureMicPermission();
  if (!perm.ok) {
    state.reply = "I cannot use the mic yet. Please allow microphone, or type your answer.";
    renderReply();
    setPhase("listening");
    return;
  }

  const greet = greetingFor(state.topic);
  state.reply = greet;
  state.lastSpoken = greet;
  state.messages.push({ role: "assistant", text: greet });
  renderReply();
  setPhase("speaking");
  await speak(greet);
  await new Promise((r) => setTimeout(r, 350));
  if (state.active) await startListening();
}

function sendTyped() {
  const input = $("#typed");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  if (!state.active) {
    state.active = true;
    state.userTurns = 0;
    state.userTexts = [];
    state.asked = [];
    state.pastCorrections = [];
    state.messages = [];
    state.corrections = [];
    state.summary = null;
  }
  stopListening();
  handleUserText(text);
}

function openHistory() {
  let html = "";
  try {
    const list = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
    if (!list.length) {
      html = "<p>No past sessions yet.</p>";
    } else {
      html =
        '<div class="log">' +
        list
          .map((s) => {
            const when = new Date(s.at).toLocaleString();
            return (
              '<div class="bubble"><strong>' +
              escapeHtml(when) +
              " · " +
              escapeHtml(s.topic) +
              " · " +
              s.turns +
              " turns</strong></div>"
            );
          })
          .join("") +
        "</div>";
    }
  } catch {
    html = "<p>Could not load history.</p>";
  }
  openSheet("HISTORY", html);
}

function openSettings() {
  const englishVoices = state.voices.filter(
    (v) => /^en([-_]|$)/i.test(v.lang) || /english/i.test(v.name)
  );
  const pool = englishVoices.length ? englishVoices : state.voices;
  const voiceOptions = pool
    .map(
      (v) =>
        '<option value="' +
        escapeHtml(v.voiceURI) +
        '"' +
        (state.settings.voiceURI === v.voiceURI ? " selected" : "") +
        ">" +
        escapeHtml(v.name) +
        " (" +
        escapeHtml(v.lang) +
        ")" +
        (isProbablyMale(v) ? " · male" : "") +
        "</option>"
    )
    .join("");
  const langOptions = RECOGNITION_LANGUAGES.map(
    (lang) =>
      '<option value="' +
      lang.tag +
      '"' +
      (state.settings.lang === lang.tag ? " selected" : "") +
      ">" +
      lang.label +
      "</option>"
  ).join("");

  const rateNow = Number(state.settings.rate).toFixed(2);

  const diag = [
    "<h3 style=\"margin:16px 0 8px;font-size:0.95rem;letter-spacing:0.1em\">DIAGNOSTICS</h3>",
    "<p style=\"margin:4px 0;font-size:0.95rem\">Browser: <strong>" + escapeHtml(state.browserName) + "</strong></p>",
    "<p style=\"margin:4px 0;font-size:0.95rem\">Microphone permission: <strong>" +
      escapeHtml(state.micPermission) +
      "</strong></p>",
    "<p style=\"margin:4px 0;font-size:0.95rem\">Speech model: <strong>" +
      escapeHtml(state.modelStatus) +
      (state.modelDevice ? " (" + escapeHtml(state.modelDevice) + ")" : "") +
      "</strong></p>",
    state.modelStatus === "loading"
      ? "<p style=\"margin:4px 0;font-size:0.95rem\">Download progress: <strong>" +
        state.modelProgress +
        "%</strong></p>"
      : "",
    "<p style=\"margin:4px 0;font-size:0.95rem\">Last error: <strong>" +
      (state.lastError ? escapeHtml(state.lastError) : "none") +
      "</strong></p>",
    "<p style=\"margin:8px 0 0;font-size:0.85rem;color:var(--muted)\">Voice uses a free on-device Whisper model (no Google speech, no API key). First visit downloads ~40–80 MB once; later visits use the browser cache.</p>",
  ].join("");

  const settingsHtml = [
    '<label for="voice">Voice</label>',
    '<select id="voice"><option value="">Automatic male English voice</option>',
    voiceOptions,
    "</select>",
    "<p>Voices come from your device. They differ on each phone and computer.</p>",
    '<button type="button" class="primary" id="test-voice">Test voice</button>',
    '<label for="rate">Speech speed (' + rateNow + ")</label>",
    '<input id="rate" type="range" min="0.75" max="1.15" step="0.05" value="' + state.settings.rate + '">',
    '<label for="lang">Preferred language tag</label>',
    '<select id="lang">',
    langOptions,
    "</select>",
    "<p>Used for the spoken voice. Speech recognition is English-only (Whisper tiny.en).</p>",
    '<label for="key">Optional Gemini key</label>',
    '<input id="key" type="password" autocomplete="off" value="' +
      escapeHtml(state.settings.geminiKey || "") +
      '" placeholder="Paste a free key, or leave empty">',
    "<p>Leave empty for the free path. A key stays only in this browser.</p>",
    diag,
  ].join("");
  openSheet("SETTINGS", settingsHtml);

  $("#voice")?.addEventListener("change", (e) => {
    state.settings.voiceURI = e.target.value;
    saveSettings();
  });
  $("#rate")?.addEventListener("input", (e) => {
    state.settings.rate = Number(e.target.value);
    saveSettings();
    const label = document.querySelector('label[for="rate"]');
    if (label) label.textContent = "Speech speed (" + state.settings.rate.toFixed(2) + ")";
  });
  $("#lang")?.addEventListener("change", (e) => {
    state.settings.lang = e.target.value;
    saveSettings();
  });
  $("#key")?.addEventListener("change", (e) => {
    state.settings.geminiKey = e.target.value.trim();
    saveSettings();
  });
  $("#test-voice")?.addEventListener("click", () => {
    speak("Hello. This is a voice test from Osiris.");
  });
}

function bindUI() {
  $("#mic")?.addEventListener("click", () => {
    if (state.active && state.phase !== "idle" && state.phase !== "summary") {
      endSession(false);
    } else {
      startSession();
    }
  });

  $("#end-session")?.addEventListener("click", () => endSession(true));
  $("#history-btn")?.addEventListener("click", openHistory);
  $("#settings-btn")?.addEventListener("click", openSettings);
  $("#close-sheet")?.addEventListener("click", closeSheet);

  $("#backdrop")?.addEventListener("click", (e) => {
    if (e.target === $("#backdrop")) closeSheet();
  });

  $("#typed-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendTyped();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
  });
}

function init() {
  closeSheet();
  loadSettings();
  populateTopics();
  loadVoices();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  updateClock();
  setInterval(updateClock, 15000);
  setPhase("idle");
  bindUI();
  state.reply = "Click the microphone to start practicing English with Osiris.";
  renderReply();
  renderLive();
  renderCorrections();

  try {
    ensureWorker()?.postMessage({ type: "preload" });
  } catch {}
}

init();
