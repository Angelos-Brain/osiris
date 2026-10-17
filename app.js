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
} from "./engine.js";

const SETTINGS_KEY = "osiris.settings.v1";
const SESSIONS_KEY = "osiris.sessions.v1";

const defaultSettings = {
  rate: 0.9,
  voiceURI: "",
  lang: "en-PH",
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
  recognition: null,
  silenceTimer: null,
  speechTimer: null,
  listeningStartedAt: 0,
  lastSpeechAt: 0,
  interim: "",
  finalText: "",
  voices: [],
  settings: { ...defaultSettings },
};

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
  return String(s)
    .replace(/&/g, String.fromCharCode(38) + "amp;")
    .replace(/</g, String.fromCharCode(38) + "lt;")
    .replace(/>/g, String.fromCharCode(38) + "gt;")
    .replace(/"/g, String.fromCharCode(38) + "quot;");
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
    u.lang = state.settings.lang || "en-PH";
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

function stopListening() {
  clearTimeout(state.silenceTimer);
  try {
    state.recognition?.stop();
  } catch {}
}

function startListening() {
  stopListening();
  state.interim = "";
  state.finalText = "";
  state.live = "";
  state.listeningStartedAt = Date.now();
  state.lastSpeechAt = 0;
  renderLive();

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    state.live = "Speech recognition not supported. Type your answer below.";
    renderLive();
    setPhase("listening");
    return;
  }

  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = state.settings.lang || "en-PH";
  state.recognition = rec;

  rec.onresult = (e) => {
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    if (final) {
      state.finalText = (state.finalText + " " + final).trim();
      state.lastSpeechAt = Date.now();
    }
    if (interim) state.lastSpeechAt = Date.now();
    state.interim = interim;
    state.live = (state.finalText + " " + interim).trim();
    renderLive();
    scheduleSilenceCheck();
  };

  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      state.live = "Microphone blocked. Allow mic or type your answer.";
      renderLive();
      const warn = $("#warn");
      if (warn) {
        warn.hidden = false;
        warn.textContent = "Allow the microphone in the address bar, then click the mic again.";
      }
    }
  };

  rec.onend = () => {
    if (state.phase === "listening" && state.active) {
      try {
        rec.start();
      } catch {}
    }
  };

  try {
    rec.start();
    setPhase("listening");
    scheduleSilenceCheck();
  } catch {
    state.live = "Could not start mic. Type your answer below.";
    renderLive();
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
    const heardSpeech = Boolean(state.finalText || state.interim);
    const action = listeningDecision({ heardSpeech, msSinceVoice, msSinceStart });
    if (action === "finalize") {
      const text = (state.finalText || state.interim || "").trim();
      stopListening();
      if (text && !isEcho(text, state.lastSpoken)) {
        handleUserText(text);
      } else {
        startListening();
      }
    } else if (action === "nudge") {
      state.reply = nudgeLine();
      renderReply();
      state.lastSpoken = state.reply;
      setPhase("speaking");
      speak(state.reply).then(() => {
        if (state.active) startListening();
      });
    } else {
      scheduleSilenceCheck();
    }
  }, 400);
}

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
    startListening();
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
  if (state.active) startListening();
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
  const warn = $("#warn");
  if (warn) {
    warn.hidden = true;
    warn.textContent = "";
  }
  renderCorrections();
  renderLive();
  renderReply();

  const greet = greetingFor(state.topic);
  state.reply = greet;
  state.lastSpoken = greet;
  state.messages.push({ role: "assistant", text: greet });
  renderReply();
  setPhase("speaking");
  await speak(greet);
  if (state.active) startListening();
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
    state.summary = null;
  }
  stopListening();
  handleUserText(text);
}

function openHistory() {
  let list = [];
  try {
    list = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {}
  const current =
    state.messages.length > 0
      ? '<div class="log">' +
        state.messages
          .map(
            (m) =>
              '<p class="bubble"><strong>' +
              (m.role === "user" ? "YOU" : "OSIRIS") +
              "</strong>" +
              escapeHtml(m.text) +
              "</p>"
          )
          .join("") +
        "</div>"
      : "<p>No talk yet. Click the microphone to start.</p>";
  const past =
    list.length > 0
      ? '<div class="past"><h3>Earlier sessions</h3>' +
        list
          .map(
            (s) =>
              "<article><h3>" +
              escapeHtml(s.topic) +
              " · " +
              new Date(s.at).toLocaleString() +
              "</h3><p>" +
              (s.turns || 0) +
              " turns</p></article>"
          )
          .join("") +
        "</div>"
      : "";
  openSheet("CHAT HISTORY", current + past);
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

  openSheet(
    "SETTINGS",
    '<label for="voice">Voice</label>' +
      '<select id="voice"><option value="">Automatic male English voice</option>' +
      voiceOptions +
      "</select>" +
      "<p>Voices come from your device. They differ on each phone and computer.</p>" +
      '<button type="button" class="primary" id="test-voice">Test voice</button>' +
      '<label for="rate">Speech speed (' +
      Number(state.settings.rate).toFixed(2) +
      ")</label>' +
      '<input id="rate" type="range" min="0.75" max="1.15" step="0.05" value="' +
      state.settings.rate +
      '">' +
      '<label for="lang">Recognition language</label>' +
      '<select id="lang">' +
      langOptions +
      "</select>" +
      "<p>Try English (Philippines). Chrome works best.</p>" +
      '<label for="key">Optional Gemini key</label>' +
      '<input id="key" type="password" autocomplete="off" value="' +
      escapeHtml(state.settings.geminiKey || "") +
      '" placeholder="Paste a free key, or leave empty">' +
      "<p>Leave empty for the free path. A key stays only in this browser.</p>"
  );

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
}

init();
