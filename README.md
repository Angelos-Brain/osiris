# Osiris

**Osiris** is a free voice partner that helps you practice speaking English.

You click the microphone one time. Osiris greets you, listens, answers out loud, then listens again. You do not need to press anything else between turns.

## Live site

**https://angelos-brain.github.io/osiris/**

(After you enable GitHub Pages once — see the one-time setup below.)

## What you need

- A modern browser: **Chrome** or **Edge** work best
- A microphone
- Internet (for speech recognition and replies)

Firefox usually cannot hear you. Safari support is partial.

## How to use

1. Open the live site (or open `index.html` on your computer).
2. Pick a topic: daily life, school, hobbies, technology, or job interview.
3. Click the **microphone**.
4. Allow the microphone when the browser asks.
5. Wait for Osiris to greet you and ask one question.
6. Speak. When you stop for about 2 seconds, Osiris will answer.
7. Keep talking. The microphone turns on again by itself after each reply.
8. Click the microphone again, click **End session**, or say **I'm done** to finish.
9. Read your session summary: 3 strengths, top mistakes, and new words.

If the microphone cannot hear you, type a sentence in the box under **Live transcript** and press **Send** (after you start a session).

## One-time: turn on GitHub Pages

1. Open https://github.com/Angelos-Brain/osiris/settings/pages
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**.
4. Click **Save**.
5. Wait 1–2 minutes, then open https://angelos-brain.github.io/osiris/

## Settings

Open **Settings** at the bottom:

- **Voice** — pick a male English voice from your device when one exists
- **Speech speed** — a little slower is often easier to understand
- **Recognition language** — try English (Philippines) `en-PH`, or US / UK / Australia / India
- **Optional Gemini key** — leave empty for the free no-key path. If you paste a free key from [Google AI Studio](https://aistudio.google.com/apikey), it stays only in your browser

## Free tools (no paid plans)

| Piece | Free tool | Notes |
| --- | --- | --- |
| Hearing you | Browser **Web Speech API** | Chrome/Edge send audio to their speech service. Needs internet. |
| Speaking back | Browser **text-to-speech** | Uses voices already on your device. Quality varies by phone and computer. |
| Smart replies | **Pollinations** text API (no key) | Free public service. Can be slow or busy. Your words are sent there to write the reply. |
| Backup replies | Built-in coach | Works if the free service is down. Still corrects common mistakes. |
| Optional upgrade | **Google Gemini** free key | Optional. Stored only in `localStorage` on your device. Never put a key in the code. |
| Hosting | **GitHub Pages** | Free for a public repository. |

### Limits to know

- The page can only listen while the tab is open.
- The first click is required so the browser can ask for the microphone.
- Replies from the free text service can take several seconds.
- A private in-browser language model is about **480 MB** and is too heavy for many phones, so Osiris does not download one by default.
- Chrome speech recognition often needs the internet and is not available the same way in every browser.

## Run locally

No install step is required.

1. Download or clone this repository.
2. Open `index.html` in Chrome or Edge  
   **or** serve the folder with any static server, for example:

```bash
npx --yes serve .
```

## Troubleshooting

**Microphone does not work**

- Use Chrome or Edge.
- Click the lock icon in the address bar and allow the microphone.
- Stay on HTTPS or `localhost`.
- Type your sentence if speech recognition fails.

**No voice / Osiris is silent**

- Open Settings and press **Test voice**.
- Raise the system volume.
- Pick another English voice in Settings.
- On phones, turn off silent mode.

**Replies are slow or missing**

- Wait a few seconds on **Thinking...**.
- If the free service is busy, Osiris switches to the built-in coach.
- Optional: add a free Gemini key in Settings for a more stable brain.

## Privacy

- Settings and session history are stored in your browser only (`localStorage`).
- No login and no database.
- Chrome speech recognition may send audio to Google’s service.
- Free text replies are requested from Pollinations unless you use your own Gemini key.

## License

The app code in this repository is free to use for learning and personal practice.
