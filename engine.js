export const SILENCE_MS = 2000;
export const NUDGE_MS = 15000;
export const SUMMARY_AFTER_USER_TURNS = 10;

export const TOPICS = [
  { id: "daily life", label: "Daily life" },
  { id: "school", label: "School" },
  { id: "hobbies", label: "Hobbies" },
  { id: "technology", label: "Technology" },
  { id: "job interview", label: "Job interview" },
];

export const RECOGNITION_LANGUAGES = [
  { tag: "en-PH", label: "English (Philippines)" },
  { tag: "en-US", label: "English (United States)" },
  { tag: "en-GB", label: "English (United Kingdom)" },
  { tag: "en-AU", label: "English (Australia)" },
  { tag: "en-IN", label: "English (India)" },
];

export const SYSTEM_PROMPT = `You are Osiris, a friendly, patient English-practice partner.
The name Osiris is only the app name. Keep every conversation focused on helping the student practice English.
The student is a beginner to intermediate speaker. English is their second language. They are a computer science student.
Rules:
- Ask ONE question at a time.
- Keep replies to 1-3 short sentences so the student does most of the talking.
- Use simple words that match this level. Follow up on what the student just said.
- When they make a grammar, word-choice, or sentence mistake, answer naturally first. Then give a short correction.
- Give at most 2 corrections. Skip tiny mistakes if a correction would break the flow.
- If they get stuck or use a word from another language, give the English word and ask them to try the sentence again.
- Do NOT judge pronunciation. Speech-to-text cannot measure pronunciation.
- Do not talk about other topics that are not English practice.
Return ONLY JSON with this shape and no markdown:
{"reply":"text shown on screen","spoken":"shorter text to say out loud","corrections":[{"said":"","better":"","why":"one short sentence"}],"summary":null}
corrections has 0, 1, or 2 items. spoken should be the natural answer. If you correct them, add one short line at the end of spoken, like: Better: I went to school.
When the user asks for a summary, summary is {"well":["","",""],"mistakes":[{"said":"","better":"","why":""},{"said":"","better":"","why":""},{"said":"","better":"","why":""}],"words":["","","","",""]} and reply is the full summary in simple sentences. Do not ask a new question in a summary.`;

const TAGALOG = {
  salamat: "thank you",
  oo: "yes",
  opo: "yes",
  hindi: "no",
  kumusta: "how are you",
  bahay: "house",
  paaralan: "school",
  gusto: "want",
  ayaw: "do not want",
  kain: "eat",
  kainin: "eat",
  trabaho: "work",
  trabaho: "job",
  kaibigan: "friend",
  pamilya: "family",
  maganda: "beautiful",
  mabuti: "good",
  masama: "bad",
  ngayon: "now",
  bukas: "tomorrow",
  kahapon: "yesterday",
  araw: "day",
  gabi: "night",
  umaga: "morning",
  hapon: "afternoon",
  tubig: "water",
  pagkain: "food",
  libro: "book",
  computer: "computer",
  laptop: "laptop",
  telepono: "phone",
  sapatos: "shoes",
  damit: "clothes",
  pera: "money",
  oras: "time",
  lugar: "place",
  tao: "person",
  bata: "child",
  lalaki: "man",
  babae: "woman",
  kuya: "older brother",
  ate: "older sister",
  nanay: "mother",
  tatay: "father",
  lolo: "grandfather",
  lola: "grandmother",
  asawa: "spouse",
  anak: "child",
  kapatid: "sibling",
  kamag-anak: "relative",
  kapitbahay: "neighbor",
  guro: "teacher",
  estudyante: "student",
  klase: "class",
  aralin: "lesson",
  pagsusulit: "exam",
  marka: "grade",
  homework: "homework",
  proyekto: "project",
  hobby: "hobby",
  libangan: "hobby",
  sports: "sports",
  musika: "music",
  pelikula: "movie",
  libro: "book",
  laruan: "toy",
  laro: "game",
  computer: "computer",
  internet: "internet",
  social media: "social media",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  cellphone: "cellphone",
  text: "text",
  tawag: "call",
  chat: "chat",
  email: "email",
  password: "password",
  wifi: "WiFi",
  data: "data",
  battery: "battery",
  charger: "charger",
  screen: "screen",
  keyboard: "keyboard",
  mouse: "mouse",
  printer: "printer",
  software: "software",
  hardware: "hardware",
  program: "program",
  code: "code",
  coding: "coding",
  programming: "programming",
  developer: "developer",
  website: "website",
  app: "app",
  application: "application",
  database: "database",
  server: "server",
  cloud: "cloud",
  security: "security",
  bug: "bug",
  error: "error",
  debug: "debug",
  test: "test",
  deploy: "deploy",
  github: "GitHub",
  repository: "repository",
  commit: "commit",
  pull request: "pull request",
  branch: "branch",
  merge: "merge",
  issue: "issue",
  documentation: "documentation",
  tutorial: "tutorial",
  course: "course",
  certification: "certification",
  interview: "interview",
  resume: "resume",
  portfolio: "portfolio",
  experience: "experience",
  skill: "skill",
  knowledge: "knowledge",
  learning: "learning",
  practice: "practice",
  improvement: "improvement",
  progress: "progress",
  goal: "goal",
  dream: "dream",
  future: "future",
  career: "career",
  job: "job",
  work: "work",
  office: "office",
  company: "company",
  boss: "boss",
  colleague: "colleague",
  meeting: "meeting",
  presentation: "presentation",
  project: "project",
  deadline: "deadline",
  salary: "salary",
  promotion: "promotion",
  resignation: "resignation",
  retirement: "retirement",
};

const COMMON_FIXES = [
  { re: /\bi am go to\b/i, better: "I am going to", why: "Use going for future plans." },
  { re: /\bi go to\b/i, better: "I went to / I go to", why: "Past needs went; habit uses go." },
  { re: /\bi went to the school\b/i, better: "I went to school", why: "No the before school in this meaning." },
  { re: /\bi am agree\b/i, better: "I agree", why: "Agree is not used with am." },
  { re: /\bi am not agree\b/i, better: "I do not agree", why: "Use do not with agree." },
  { re: /\bi very like\b/i, better: "I really like / I like very much", why: "Very does not go before like." },
  { re: /\bi can able to\b/i, better: "I can / I am able to", why: "Can and able mean the same." },
  { re: /\bi discuss about\b/i, better: "I discuss", why: "Discuss does not need about." },
  { re: /\bi enter to\b/i, better: "I enter", why: "Enter does not need to." },
  { re: /\bi request for\b/i, better: "I request", why: "Request does not need for." },
  { re: /\bi prefer than\b/i, better: "I prefer ... to", why: "Prefer uses to, not than." },
  { re: /\bi am interesting in\b/i, better: "I am interested in", why: "Interested describes the person." },
  { re: /\bi am boring\b/i, better: "I am bored", why: "Bored is how you feel; boring is the thing." },
  { re: /\bi am exciting\b/i, better: "I am excited", why: "Excited is how you feel." },
  { re: /\bi feel happily\b/i, better: "I feel happy", why: "Feel takes an adjective." },
  { re: /\bi did not went\b/i, better: "I did not go", why: "After did not use base form." },
  { re: /\bi did not saw\b/i, better: "I did not see", why: "After did not use base form." },
  { re: /\bi did not came\b/i, better: "I did not come", why: "After did not use base form." },
  { re: /\bshe don't\b/i, better: "she does not / she doesn't", why: "She/he/it uses does." },
  { re: /\bhe don't\b/i, better: "he does not / he doesn't", why: "She/he/it uses does." },
  { re: /\bit don't\b/i, better: "it does not / it doesn't", why: "She/he/it uses does." },
  { re: /\bmore better\b/i, better: "better", why: "Better already means more good." },
  { re: /\bmore easier\b/i, better: "easier", why: "Easier already means more easy." },
  { re: /\bmore harder\b/i, better: "harder", why: "Harder already means more hard." },
  { re: /\bthe nature\b/i, better: "nature", why: "Nature usually has no the." },
  { re: /\bin the nature\b/i, better: "in nature", why: "Nature usually has no the." },
  { re: /\bI am studying of\b/i, better: "I am studying", why: "Study does not need of." },
  { re: /\bI am graduated\b/i, better: "I graduated / I am a graduate", why: "Graduated is the verb form." },
  { re: /\bI am working as a\b/i, better: "I work as a / I am a", why: "Simple present is common for jobs." },
  { re: /\bI have 20 years old\b/i, better: "I am 20 years old", why: "Use am for age." },
  { re: /\bI have 21 years old\b/i, better: "I am 21 years old", why: "Use am for age." },
  { re: /\bhow many years old are you\b/i, better: "How old are you", why: "How old is the natural question." },
  { re: /\bwhat is your age\b/i, better: "How old are you", why: "How old is more natural." },
  { re: /\bI am from the Philippines and I live in\b/i, better: "I am from the Philippines. I live in", why: "Split long sentences." },
  { re: /\bplease to meet you\b/i, better: "pleased to meet you / nice to meet you", why: "Pleased or nice is the usual form." },
  { re: /\bnice to meeting you\b/i, better: "nice to meet you", why: "Meet is the base form after to." },
  { re: /\bI looking forward\b/i, better: "I am looking forward", why: "Need am with looking." },
  { re: /\bI looking for\b/i, better: "I am looking for", why: "Need am with looking." },
  { re: /\bI want that you\b/i, better: "I want you to", why: "Want + person + to + verb." },
  { re: /\bI suggest you to\b/i, better: "I suggest that you / I suggest you", why: "Suggest does not need to after you." },
  { re: /\bI recommend you to\b/i, better: "I recommend that you", why: "Recommend + that + clause." },
  { re: /\bdespite of\b/i, better: "despite", why: "Despite does not need of." },
  { re: /\bin spite\b/i, better: "in spite of", why: "In spite needs of." },
  { re: /\bbecause of that I\b/i, better: "so I / that is why I", why: "Simpler connectors sound more natural." },
  { re: /\bthe reason why is because\b/i, better: "the reason is that / because", why: "Avoid reason why is because." },
  { re: /\bI think so that\b/i, better: "I think that", why: "Think does not need so that." },
  { re: /\baccording to me\b/i, better: "in my opinion / I think", why: "According to is for other people." },
  { re: /\bas what I said\b/i, better: "as I said", why: "No what needed." },
  { re: /\blike what I said\b/i, better: "as I said", why: "As I said is more natural." },
  { re: /\bI am agree with you\b/i, better: "I agree with you", why: "Agree is not used with am." },
  { re: /\bI am not agree with you\b/i, better: "I do not agree with you", why: "Use do not with agree." },
  { re: /\bcan you repeat again\b/i, better: "can you repeat that / can you say that again", why: "Repeat already means again." },
  { re: /\brepeat again\b/i, better: "repeat / say again", why: "Repeat already means again." },
  { re: /\breturn back\b/i, better: "return / go back", why: "Return already means go back." },
  { re: /\brevert back\b/i, better: "revert / go back", why: "Revert already means go back." },
  { re: /\bcontinue on\b/i, better: "continue", why: "Continue does not need on." },
  { re: /\bproceed on\b/i, better: "proceed", why: "Proceed does not need on." },
  { re: /\bdiscuss about the\b/i, better: "discuss the", why: "Discuss does not need about." },
  { re: /\btalk about about\b/i, better: "talk about", why: "One about is enough." },
  { re: /\bI will going to\b/i, better: "I am going to / I will", why: "Will and going to are alternatives." },
  { re: /\bI am will\b/i, better: "I will", why: "Do not mix am and will." },
  { re: /\bshe is has\b/i, better: "she has", why: "Is and has do not go together." },
  { re: /\bhe is has\b/i, better: "he has", why: "Is and has do not go together." },
  { re: /\bit is has\b/i, better: "it has", why: "Is and has do not go together." },
  { re: /\bthere is many\b/i, better: "there are many", why: "Many needs are." },
  { re: /\bthere is a lot of people\b/i, better: "there are a lot of people", why: "People is plural." },
  { re: /\bthe informations\b/i, better: "the information", why: "Information has no plural s." },
  { re: /\bmany informations\b/i, better: "a lot of information", why: "Information is uncountable." },
  { re: /\ba informations\b/i, better: "information / some information", why: "Information is uncountable." },
  { re: /\bthe advices\b/i, better: "the advice", why: "Advice has no plural s." },
  { re: /\bmany advices\b/i, better: "a lot of advice", why: "Advice is uncountable." },
  { re: /\ban advice\b/i, better: "advice / a piece of advice", why: "Advice is uncountable." },
  { re: /\bthe equipments\b/i, better: "the equipment", why: "Equipment has no plural s." },
  { re: /\bmany equipments\b/i, better: "a lot of equipment", why: "Equipment is uncountable." },
  { re: /\bthe softwares\b/i, better: "the software", why: "Software has no plural s." },
  { re: /\bmany softwares\b/i, better: "a lot of software / many programs", why: "Software is uncountable." },
  { re: /\bthe hardwares\b/i, better: "the hardware", why: "Hardware has no plural s." },
  { re: /\bI did a mistake\b/i, better: "I made a mistake", why: "We make mistakes." },
  { re: /\bI did a research\b/i, better: "I did research / I conducted research", why: "Research is usually uncountable." },
  { re: /\ba research\b/i, better: "research / a research project", why: "Research is usually uncountable." },
  { re: /\bthe researches\b/i, better: "the research", why: "Research is usually uncountable." },
  { re: /\bI take a decision\b/i, better: "I make a decision", why: "We make decisions." },
  { re: /\bI take a photo\b/i, better: "I take a photo", why: "This one is correct; keep it." },
  { re: /\bI am good in\b/i, better: "I am good at", why: "Good at + skill." },
  { re: /\bI am bad in\b/i, better: "I am bad at", why: "Bad at + skill." },
  { re: /\bI am expert in\b/i, better: "I am an expert in / I am expert at", why: "Expert in or at both work." },
  { re: /\bI am afraid from\b/i, better: "I am afraid of", why: "Afraid of." },
  { re: /\bI am interested about\b/i, better: "I am interested in", why: "Interested in." },
  { re: /\bI am worried for\b/i, better: "I am worried about", why: "Worried about." },
  { re: /\bI am angry to\b/i, better: "I am angry with / at", why: "Angry with a person." },
  { re: /\bI am proud for\b/i, better: "I am proud of", why: "Proud of." },
  { re: /\bI am tired of\b/i, better: "I am tired of", why: "This is correct." },
  { re: /\bI am bored of\b/i, better: "I am bored with / of", why: "Bored with is common." },
  { re: /\bI depend to\b/i, better: "I depend on", why: "Depend on." },
  { re: /\bI rely to\b/i, better: "I rely on", why: "Rely on." },
  { re: /\bI listen music\b/i, better: "I listen to music", why: "Listen needs to." },
  { re: /\bI wait you\b/i, better: "I wait for you", why: "Wait for." },
  { re: /\bI search the answer\b/i, better: "I search for the answer", why: "Search for." },
  { re: /\bI look the book\b/i, better: "I look at the book / I look for the book", why: "Look at or look for." },
  { re: /\bI arrive to\b/i, better: "I arrive at / in", why: "Arrive at a place, in a city." },
  { re: /\bI reach to\b/i, better: "I reach", why: "Reach does not need to." },
  { re: /\bI approach to\b/i, better: "I approach", why: "Approach does not need to." },
  { re: /\bI contact to\b/i, better: "I contact", why: "Contact does not need to." },
  { re: /\bI phone to\b/i, better: "I phone / I call", why: "Phone does not need to." },
  { re: /\bI email to\b/i, better: "I email", why: "Email does not need to." },
  { re: /\bI message to\b/i, better: "I message", why: "Message does not need to." },
  { re: /\bI text to\b/i, better: "I text", why: "Text does not need to." },
  { re: /\bI answer to the question\b/i, better: "I answer the question", why: "Answer does not need to." },
  { re: /\bI reply to you\b/i, better: "I reply to you", why: "This is correct." },
  { re: /\bI explain you\b/i, better: "I explain to you", why: "Explain to someone." },
  { re: /\bI describe you\b/i, better: "I describe to you", why: "Describe to someone." },
  { re: /\bI suggest you\b/i, better: "I suggest that you", why: "Suggest + that + clause is safer." },
  { re: /\bI recommend you\b/i, better: "I recommend that you", why: "Recommend + that + clause." },
  { re: /\bI advise you to\b/i, better: "I advise you to", why: "This is correct." },
  { re: /\bI order you to\b/i, better: "I order you to", why: "This is correct." },
  { re: /\bI force you to\b/i, better: "I force you to", why: "This is correct." },
  { re: /\bI allow you to\b/i, better: "I allow you to", why: "This is correct." },
  { re: /\bI permit you to\b/i, better: "I permit you to", why: "This is correct." },
  { re: /\bI forbid you to\b/i, better: "I forbid you to", why: "This is correct." },
  { re: /\bI encourage you to\b/i, better: "I encourage you to", why: "This is correct." },
  { re: /\bI motivate you to\b/i, better: "I motivate you to", why: "This is correct." },
  { re: /\bI inspire you to\b/i, better: "I inspire you to", why: "This is correct." },
  { re: /\bI help you to\b/i, better: "I help you / I help you to", why: "Help can omit to." },
  { re: /\bI assist you to\b/i, better: "I assist you in / with", why: "Assist in or with." },
  { re: /\bI support you to\b/i, better: "I support you in", why: "Support in." },
  { re: /\bI congratulate you for\b/i, better: "I congratulate you on", why: "Congratulate on." },
  { re: /\bI apologize from\b/i, better: "I apologize to / for", why: "Apologize to a person, for a thing." },
  { re: /\bI thank you for\b/i, better: "I thank you for", why: "This is correct." },
  { re: /\bI blame you for\b/i, better: "I blame you for", why: "This is correct." },
  { re: /\bI praise you for\b/i, better: "I praise you for", why: "This is correct." },
  { re: /\bI criticize you for\b/i, better: "I criticize you for", why: "This is correct." },
  { re: /\bI punish you for\b/i, better: "I punish you for", why: "This is correct." },
  { re: /\bI reward you for\b/i, better: "I reward you for", why: "This is correct." },
  { re: /\bI pay you for\b/i, better: "I pay you for", why: "This is correct." },
  { re: /\bI charge you for\b/i, better: "I charge you for", why: "This is correct." },
  { re: /\bI fine you for\b/i, better: "I fine you for", why: "This is correct." },
  { re: /\bI tax you for\b/i, better: "I tax you on", why: "Tax on." },
  { re: /\bI insure you for\b/i, better: "I insure you against", why: "Insure against." },
  { re: /\bI protect you from\b/i, better: "I protect you from", why: "This is correct." },
  { re: /\bI save you from\b/i, better: "I save you from", why: "This is correct." },
  { re: /\bI rescue you from\b/i, better: "I rescue you from", why: "This is correct." },
  { re: /\bI free you from\b/i, better: "I free you from", why: "This is correct." },
  { re: /\bI release you from\b/i, better: "I release you from", why: "This is correct." },
  { re: /\bI exempt you from\b/i, better: "I exempt you from", why: "This is correct." },
  { re: /\bI exclude you from\b/i, better: "I exclude you from", why: "This is correct." },
  { re: /\bI ban you from\b/i, better: "I ban you from", why: "This is correct." },
  { re: /\bI prohibit you from\b/i, better: "I prohibit you from", why: "This is correct." },
  { re: /\bI prevent you from\b/i, better: "I prevent you from", why: "This is correct." },
  { re: /\bI stop you from\b/i, better: "I stop you from", why: "This is correct." },
  { re: /\bI keep you from\b/i, better: "I keep you from", why: "This is correct." },
  { re: /\bI discourage you from\b/i, better: "I discourage you from", why: "This is correct." },
  { re: /\bI dissuade you from\b/i, better: "I dissuade you from", why: "This is correct." },
  { re: /\bI deter you from\b/i, better: "I deter you from", why: "This is correct." },
  { re: /\bI hinder you from\b/i, better: "I hinder you from", why: "This is correct." },
  { re: /\bI inhibit you from\b/i, better: "I inhibit you from", why: "This is correct." },
  { re: /\bI restrain you from\b/i, better: "I restrain you from", why: "This is correct." },
  { re: /\bI restrict you from\b/i, better: "I restrict you from", why: "This is correct." },
  { re: /\bI limit you from\b/i, better: "I limit you to", why: "Limit to." },
  { re: /\bI confine you to\b/i, better: "I confine you to", why: "This is correct." },
  { re: /\bI commit you to\b/i, better: "I commit you to", why: "This is correct." },
  { re: /\bI dedicate you to\b/i, better: "I dedicate you to", why: "This is correct." },
  { re: /\bI devote you to\b/i, better: "I devote you to", why: "This is correct." },
  { re: /\bI assign you to\b/i, better: "I assign you to", why: "This is correct." },
  { re: /\bI appoint you to\b/i, better: "I appoint you to", why: "This is correct." },
  { re: /\bI elect you to\b/i, better: "I elect you to", why: "This is correct." },
  { re: /\bI nominate you to\b/i, better: "I nominate you for", why: "Nominate for." },
  { re: /\bI recommend you for\b/i, better: "I recommend you for", why: "This is correct." },
  { re: /\bI propose you for\b/i, better: "I propose you for", why: "This is correct." },
  { re: /\bI suggest you for\b/i, better: "I suggest you for", why: "This is correct." },
  { re: /\bI put you forward for\b/i, better: "I put you forward for", why: "This is correct." },
  { re: /\bI put you up for\b/i, better: "I put you up for", why: "This is correct." },
  { re: /\bI put your name forward for\b/i, better: "I put your name forward for", why: "This is correct." },
  { re: /\bI put your name up for\b/i, better: "I put your name up for", why: "This is correct." },
];

export function normalizeText(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findCorrections(userText) {
  const text = normalizeText(userText);
  if (!text) return [];
  const found = [];
  const seen = new Set();

  for (const [tag, eng] of Object.entries(TAGALOG)) {
    if (text.includes(tag) && !seen.has(tag)) {
      seen.add(tag);
      found.push({
        said: tag,
        better: eng,
        why: "That is not the English word.",
      });
      if (found.length >= 2) return found;
    }
  }

  for (const fix of COMMON_FIXES) {
    if (fix.re.test(userText) && !seen.has(fix.better)) {
      seen.add(fix.better);
      const m = userText.match(fix.re);
      found.push({
        said: m ? m[0] : fix.re.source,
        better: fix.better,
        why: fix.why,
      });
      if (found.length >= 2) return found;
    }
  }
  return found;
}

export function isEcho(userText, lastSpoken) {
  if (!lastSpoken || !userText) return false;
  const a = normalizeText(userText);
  const b = normalizeText(lastSpoken);
  if (a.length < 4 || b.length < 4) return false;
  if (a === b) return true;
  if (b.includes(a) && a.length > 8) return true;
  if (a.includes(b) && b.length > 8) return true;
  return false;
}

export function silenceDecision({ listeningStartedAt, lastSpeechAt, now, hasInterim }) {
  if (!listeningStartedAt) return "continue";
  const sinceStart = now - listeningStartedAt;
  const sinceSpeech = lastSpeechAt ? now - lastSpeechAt : sinceStart;
  if (hasInterim && sinceSpeech < SILENCE_MS) return "continue";
  if (sinceSpeech >= SILENCE_MS && (lastSpeechAt || sinceStart > 800)) return "finalize";
  if (sinceStart >= NUDGE_MS && !lastSpeechAt) return "nudge";
  return "continue";
}

export function listeningDecision({ state, interim, finalText, silenceAction }) {
  if (state !== "listening") return "ignore";
  if (silenceAction === "finalize" && (finalText || interim)) return "submit";
  if (silenceAction === "nudge") return "nudge";
  return "keep";
}

export function parseTutorResponse(raw) {
  if (!raw || typeof raw !== "string") return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj || typeof obj.reply !== "string") return null;
    return {
      reply: String(obj.reply || "").trim(),
      spoken: String(obj.spoken || obj.reply || "").trim(),
      corrections: Array.isArray(obj.corrections)
        ? obj.corrections
            .filter((c) => c && (c.said || c.better))
            .slice(0, 2)
            .map((c) => ({
              said: String(c.said || "").trim(),
              better: String(c.better || "").trim(),
              why: String(c.why || "").trim(),
            }))
        : [],
      summary: obj.summary || null,
    };
  } catch {
    return null;
  }
}

export function localSummary({ topic, userTexts, corrections }) {
  const well = [];
  if (userTexts.length >= 3) well.push("You kept answering for several turns.");
  if (userTexts.some((t) => t.split(/\s+/).length >= 8)) well.push("You used longer sentences.");
  if (corrections.length === 0) well.push("Few clear grammar mistakes.");
  else well.push("You accepted corrections and continued.");
  while (well.length < 3) well.push("You practiced speaking English.");

  const mistakes = (corrections || []).slice(0, 3).map((c) => ({
    said: c.said || "",
    better: c.better || "",
    why: c.why || "",
  }));
  while (mistakes.length < 3) {
    mistakes.push({ said: "—", better: "—", why: "Keep practicing full sentences." });
  }

  const words = [];
  const pool = ["practice", "sentence", "explain", "describe", "prefer", "because", "although", "however", "instead", "improve"];
  for (const w of pool) {
    if (words.length >= 5) break;
    if (!userTexts.join(" ").toLowerCase().includes(w)) words.push(w);
  }
  while (words.length < 5) words.push(pool[words.length % pool.length]);

  return { well: well.slice(0, 3), mistakes, words: words.slice(0, 5) };
}

function screenSummary(summary) {
  const goods = summary.well.map((w, i) => `${i + 1}. ${w}`).join(" ");
  const fixes = summary.mistakes
    .filter((m) => m.said && m.said !== "—")
    .map((m) => `You said "${m.said}" → better "${m.better}" (${m.why})`)
    .join(" ");
  return `Session summary. Things you did well: ${goods} ${fixes ? "Main corrections: " + fixes : "No major corrections."} Words to practice: ${summary.words.join(", ")}.`;
}

function spokenSummary(summary) {
  const goods = summary.well.slice(0, 2).join(" ");
  const fixes = summary.mistakes
    .filter((m) => m.said && m.said !== "—")
    .slice(0, 2)
    .map((m) => `Better: ${m.better}`)
    .join(". ");
  return `Good work today. Things you did well: ${goods} Top mistakes: ${fixes} New words to practice: ${summary.words.join(", ")}.`;
}

export function coachReply({ userText, topic, asked, userTurns, userTexts, pastCorrections, forceSummary }) {
  if (forceSummary || userTurns >= 10) {
    const summary = localSummary({ topic, userTexts, corrections: pastCorrections });
    return {
      asked,
      result: {
        reply: screenSummary(summary),
        spoken: spokenSummary(summary),
        corrections: [],
        summary,
      },
    };
  }

  const corrections = findCorrections(userText);
  const tagalog = corrections.find((c) => c.why.includes("not the English word"));
  if (tagalog) {
    const reply = `${tagalog.better[0].toUpperCase()}${tagalog.better.slice(1)} is the English word. Please try that sentence again.`;
    return {
      asked,
      result: {
        reply,
        spoken: `${tagalog.better}. Please try the sentence again.`,
        corrections,
        summary: null,
      },
    };
  }

  const short = userText.trim().split(/\s+/).filter(Boolean).length < 3;
  const question = nextQuestion(topic, asked);
  const acks = ["Thanks for saying that.", "I hear you.", "That is useful.", "Good, tell me more."];
  const ack = acks[userText.length % 4];
  const reply = short
    ? `That is a start. Can you say it in a full sentence? ${question}`
    : `${ack} ${question}`;
  const spoken = corrections[0] ? `${reply} Better: ${corrections[0].better}.` : reply;
  return {
    asked: [...asked, question],
    result: { reply, spoken, corrections, summary: null },
  };
}

const MALE_HINT = /male|\bdavid\b|\bdaniel\b|\balex\b|\bfred\b|\brishi\b|\bmark\b|\bguy\b|\bryan\b|\bandrew\b|\bgeorge\b|\bjames\b|\brian\b/i;
const FEMALE_HINT = /female|\bzira\b|\bsamantha\b|\bvictoria\b|\bkaren\b|\bmoira\b|\bsusan\b|\bhazel\b|\baria\b|\bjenny\b|\blinda\b|\bsara\b/i;

export function isProbablyMale(voice) {
  return MALE_HINT.test(voice.name || "") && !FEMALE_HINT.test(voice.name || "");
}

export function pickMaleEnglishVoice(voices) {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang) || /english/i.test(v.name));
  const pool = english.length ? english : voices;
  return pool.find((v) => isProbablyMale(v)) || pool[0] || null;
}

export function speechTimeoutMs(text, rate) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
  const safeRate = rate > 0 ? rate : 1;
  return Math.min(25000, 900 + words * (480 / safeRate));
}

function nextQuestion(topic, asked) {
  const bank = {
    "daily life": [
      "What did you do this morning?",
      "What do you usually eat for breakfast?",
      "How do you go to school or work?",
      "What is your favorite part of the day?",
      "What will you do this evening?",
    ],
    school: [
      "What subject do you like most?",
      "What are you studying this week?",
      "Do you prefer group work or solo work?",
      "What is hard about your course right now?",
      "What do you want to learn next?",
    ],
    hobbies: [
      "What do you like to do after class?",
      "Do you play any sports or games?",
      "What kind of music or videos do you enjoy?",
      "Have you tried a new hobby this year?",
      "Who do you share your hobbies with?",
    ],
    technology: [
      "What app do you use every day?",
      "Are you learning any programming language?",
      "What device do you use for coding or study?",
      "What is one tech skill you want to improve?",
      "How do you usually learn new tech topics?",
    ],
    "job interview": [
      "Tell me about yourself in two sentences.",
      "What is your greatest strength?",
      "Why do you want this kind of job?",
      "Describe a project you are proud of.",
      "Where do you see yourself in three years?",
    ],
  };
  const list = bank[topic] || bank["daily life"];
  const unused = list.filter((q) => !asked.includes(q));
  return unused[0] || list[asked.length % list.length];
}

export function greetingFor(topic) {
  const map = {
    "daily life": "Hi. I am Osiris. Let's practice English. Tell me about your day. What did you do this morning?",
    school: "Hi. I am Osiris. Let's practice English. What subject do you like most at school?",
    hobbies: "Hi. I am Osiris. Let's practice English. What do you like to do after class?",
    technology: "Hi. I am Osiris. Let's practice English. What app or tool do you use every day?",
    "job interview": "Hi. I am Osiris. Let's practice interview English. Tell me about yourself in two short sentences.",
  };
  return map[topic] || map["daily life"];
}
