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
  document.body.dataset.phase = phase;
  const orb = $("#orb");
  if (orb) {
    orb.dataset.phase = phase;
    orb.setAttribute("aria-label", `Osiris is ${phase}`);
  }
  const status = $("#status-text");
  if (status) {
    const map = {
      idle: "Ready",
      listening: "Listening…",
      thinking: "Thinking…",
      speaking: "Speaking…",
      summary: "Summary",
    };
    status.textContent = map[phase] || phase;
  }
}

function renderMessages() {
  const box = $("#chat-log");
  if (!box) return;
  box.innerHTML = state.messages
    .map((m) => {
      const who = m.role === "user" ? "You" : "Osiris";
      return `<div class="msg msg-${m.role}"><span class="who">${who}</span><p>${escapeHtml(m.text)}</p></div>`;
    })
    .join("");
  box.scrollTop = box.scrollHeight;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

function renderCorrections() {
  const panel = $("#corrections-panel");
  const list = $("#corrections-list");
  if (!panel || !list) return;
  if (!state.corrections.length) {
    panel.hidden = true;
    list.innerHTML = "";
    return;
  }
  panel.hidden = false;
  list.innerHTML = state.corrections
    .map(
      (c) =>
        `<div class="corr-item"><div class="said">You said: <strong>${escapeHtml(c.said)}</strong></div><div class="better">Better: <strong>${escapeHtml(c.better)}</strong></div><div class="why">${escapeHtml(c.why)}</div></div>`
    )
    .join("");
}

function renderLive() {
  const el = $("#live-transcript");
  if (el) el.textContent = state.live || state.interim || "";
}

function renderReply() {
  const el = $("#reply-text");
  if (el) el.textContent = state.reply || "";
}

function updateClock() {
  const el = $("#clock");
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function openPanel(id) {
  document.querySelectorAll(".sheet").forEach((s) => (s.hidden = true));
  const sheet = $(`#${id}`);
  if (sheet) sheet.hidden = false;
  $("#backdrop")?.classList.add("open");
}

function closePanel() {
  document.querySelectorAll(".sheet").forEach((s) => (s.hidden = true));
  $("#backdrop")?.classList.remove("open");
}

function populateTopics() {
  const sel = $("#topic-select");
  if (!sel) return;
  sel.innerHTML = TOPICS.map((t) => `<option value="${t.id}">${t.label}</option>`).join("");
  sel.value = state.topic;
}

function populateLanguages() {
  const sel = $("#lang-select");
  if (!sel) return;
  sel.innerHTML = RECOGNITION_LANGUAGES.map(
    (l) => `<option value="${l.tag}">${l.label}</option>`
  ).join("");
  sel.value = state.settings.lang || "en-PH";
}

function populateVoices() {
  const sel = $("#voice-select");
  if (!sel) return;
  const voices = state.voices.filter((v) => /^en/i.test(v.lang) || /english/i.test(v.name));
  const pool = voices.length ? voices : state.voices;
  sel.innerHTML =
    `<option value="">Auto (male English if available)</option>` +
    pool
      .map((v) => {
        const mark = isProbablyMale(v) ? " ♂" : "";
        return `<option value="${escapeHtml(v.voiceURI)}">${escapeHtml(v.name)}${mark} (${v.lang})</option>`;
      })
      .join("");
  if (state.settings.voiceURI) sel.value = state.settings.voiceURI;
}

function loadVoices() {
  state.voices = window.speechSynthesis?.getVoices() || [];
  populateVoices();
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
    }
  };

  rec.onend = () => {
    if (state.phase === "listening" && state.active) {
      // browser ended early; restart if we still want to listen
      try {
        rec.start();
      } catch {}
    }
  };

  try {
    rec.start();
    setPhase("listening");
    scheduleSilenceCheck();
  } catch (err) {
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
    .map((m) => `${m.role === "user" ? "Student" : "Osiris"}: ${m.text}`)
    .join("\n");

  const prompt = `${SYSTEM_PROMPT}\n\nTopic: ${state.topic}\nUser turns: ${state.userTurns}\nRecent:\n${history}\nStudent: ${userText}\nReturn JSON only.`;

  let result = null;

  // Optional Gemini key from settings (localStorage only)
  const key = (state.settings.geminiKey || "").trim();
  if (key) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
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
        result = parseTutorResponse(text, localSummary({
          topic: state.topic,
          userTexts: state.userTexts,
          corrections: state.pastCorrections,
        }));
      }
    } catch {}
  }

  // Free Pollinations text endpoint (no key)
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
        result = parseTutorResponse(text, localSummary({
          topic: state.topic,
          userTexts: state.userTexts,
          corrections: state.pastCorrections,
        }));
      }
    } catch {}
  }

  // Always have coach fallback
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

  // Merge local corrections if model returned none
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
  renderMessages();
  renderLive();

  const result = await askOsiris(cleaned);
  state.reply = result.reply;
  state.corrections = result.corrections || [];
  state.pastCorrections = state.pastCorrections.concat(state.corrections);
  state.lastSpoken = result.spoken || result.reply;
  state.messages.push({ role: "assistant", text: result.reply });
  renderMessages();
  renderReply();
  renderCorrections();

  if (result.summary) {
    state.summary = result.summary;
    setPhase("summary");
    await speak(result.spoken || result.reply);
    saveSession();
    state.active = false;
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
    renderMessages();
    await speak(spokenSummary(summary));
    saveSession();
  } else {
    setPhase("idle");
    state.reply = "Session ended. Click the mic to start again.";
    renderReply();
  }
  state.active = false;
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
  renderMessages();
  renderCorrections();
  renderLive();
  renderReply();

  const topicSel = $("#topic-select");
  if (topicSel) state.topic = topicSel.value || "daily life";

  const greet = greetingFor(state.topic);
  state.reply = greet;
  state.lastSpoken = greet;
  state.messages.push({ role: "assistant", text: greet });
  renderMessages();
  renderReply();
  setPhase("speaking");
  await speak(greet);
  if (state.active) startListening();
}

function sendTyped() {
  const input = $("#typed-input");
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

function bindUI() {
  $("#mic-btn")?.addEventListener("click", () => {
    if (state.active && state.phase !== "idle" && state.phase !== "summary") {
      endSession(false);
    } else {
      startSession();
    }
  });

  $("#end-btn")?.addEventListener("click", () => endSession(true));

  $("#settings-btn")?.addEventListener("click", () => openPanel("settings-sheet"));
  $("#history-btn")?.addEventListener("click", () => {
    const box = $("#history-list");
    if (box) {
      try {
        const list = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
        box.innerHTML = list.length
          ? list
              .map(
                (s) =>
                  `<div class="hist-item"><time>${new Date(s.at).toLocaleString()}</time> · ${escapeHtml(s.topic)} · ${s.turns} turns</div>`
              )
              .join("")
          : "<p>No past sessions yet.</p>";
      } catch {
        box.innerHTML = "<p>No past sessions yet.</p>";
      }
    }
    openPanel("history-sheet");
  });

  $("#backdrop")?.addEventListener("click", closePanel);
  document.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", closePanel));

  $("#rate-range")?.addEventListener("input", (e) => {
    state.settings.rate = Number(e.target.value);
    $("#rate-value").textContent = state.settings.rate.toFixed(1);
    saveSettings();
  });

  $("#voice-select")?.addEventListener("change", (e) => {
    state.settings.voiceURI = e.target.value;
    saveSettings();
  });

  $("#lang-select")?.addEventListener("change", (e) => {
    state.settings.lang = e.target.value;
    saveSettings();
  });

  $("#gemini-key")?.addEventListener("change", (e) => {
    state.settings.geminiKey = e.target.value.trim();
    saveSettings();
  });

  $("#test-voice")?.addEventListener("click", () => {
    speak("Hello. This is a voice test from Osiris.");
  });

  $("#typed-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendTyped();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
}

function init() {
  loadSettings();
  populateTopics();
  populateLanguages();
  loadVoices();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
  const rate = $("#rate-range");
  if (rate) {
    rate.value = state.settings.rate;
    $("#rate-value").textContent = Number(state.settings.rate).toFixed(1);
  }
  const gem = $("#gemini-key");
  if (gem) gem.value = state.settings.geminiKey || "";
  updateClock();
  setInterval(updateClock, 30000);
  setPhase("idle");
  bindUI();
  state.reply = "Click the microphone to start practicing English with Osiris.";
  renderReply();
}

init();
