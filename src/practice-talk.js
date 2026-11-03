// What Lena, Karim and Aylin say in a practice ride (and in demo mode). With the AI (server function practice-chat,
// see backend-live.js practiceReply) they answer anything. Without it (no key yet, daily limit, no signal, ?demo)
// these scripts answer: they recognise greetings, common questions and topics in German, English and Arabic, ask
// back, keep to their own story and never say the same thing twice.
import { DICE, WORDS } from "./data.js";
import { S } from "./state.js";
import { parseMsg } from "./util.js";

// the chat as the AI reads it: your messages and theirs; your cards are described in brackets
function aiHistory(list){
  const out = [];
  for(const m of list){
    const p = parseMsg(m.body);
    if(p.type === "text"){ out.push({ me: !!m.mine, text: String(m.body) }); continue; }
    if(!m.mine) continue;
    const note = p.type === "dice" ? `(They rolled the topic dice: "${DICE.en[Number(p.val) % DICE.en.length] || ""}")`
      : p.type === "word" ? `(They sent the German word of the ride: ${(WORDS[Math.abs(Number(p.val) || 0) % WORDS.length] || [""])[0]})`
      : p.type === "ttl" ? "(They started 'two truths and a lie': you write three short statements about yourself, one of them false, and let them guess)"
      : p.type === "bye" ? "(They sent a goodbye card: nice talking to you)"
      : p.type === "spin" ? "(They spun the wheel 'who asks next')"
      : p.type === "book" ? "(They shared a story from the Zugpal library)"
      : p.type === "media" ? "(They sent a view-once photo)"
      : ["chess", "dama", "cg", "qz", "sl", "zw", "lt"].includes(p.type) ? "(They invited you to a game)" : "";
    if(note) out.push({ me: true, text: note });
  }
  return out;
}

// the language of what you wrote, else the app language
function langOf(text){
  if(/[؀-ۿ]/.test(text)) return "ar";
  if(/[äöüß]|\b(ich|du|und|nicht|ist|bin|bist|wie|was|wo|hallo|danke|ja|nein|auch|der|die|das|heute|gut)\b/i.test(text)) return "de";
  if(/\b(i|you|and|the|is|are|what|where|how|hello|thanks|yes|no|today|good)\b/i.test(text)) return "en";
  return S.lang;
}

// checked in this order; the first one the person has not used yet wins
const INTENTS = [
  ["contact", /nummer|number|insta|whatsapp|telegram|snap|facebook|tiktok|e-?mail|handy|رقم|واتس|انستا|تلغرام|سناب|فيسبوك|ايميل|إيميل/],
  ["flirt", /\bdate\b|single|freundin|girlfriend|boyfriend|süß|hübsch|beautiful|cute|sexy|love you|liebe dich|heiraten|marry|kiss|kuss|حبيب|موعد|بحبك|أحبك|عزباء|أعزب/],
  ["bot", /\bbot\b|bist du (echt|real|ein mensch)|are you (real|a bot|human|an ai)|\bki\b|künstliche|artificial|chatgpt|robot|روبوت|ذكاء اصطناعي|بوت|حقيقي/],
  ["bye", /tschüss|tschau|ciao|\bbye\b|auf wiedersehen|bis (bald|morgen|dann)|see you|schönen tag|have a (nice|good) day|مع السلامة|باي|إلى اللقاء|الى اللقاء/],
  ["howareyou", /wie geht|wie läuft|alles (gut|klar)|how are you|how's it going|how is it going|how r u|كيف حالك|كيفك|كيف الحال|شلونك|اخبارك|أخبارك/],
  ["about", /wie heißt|wer bist|your name|who are you|woher|where are you from|where're you from|stell dich vor|introduce|اسمك|من وين|من أين|مين انت|من أنت/],
  ["going", /wohin|wo steigst|aussteig|wo musst du|where (are you )?(going|headed)|get off|your stop|وين رايح|إلى أين|الى اين|وين نازل|محطتك|محطة/],
  ["work", /arbeit|beruf|\bjob|\bwork|studier|studium|\bstudy|student|was machst du\b(?! gern)|what do you do|شغل|بتشتغل|تعمل|عملك|وظيف|تدرس|دراسة|جامعة/],
  ["football", /fußball|fussball|football|soccer|\bfc\b|bundesliga|barça|barca|كرة|فوتبول|برشلونة/],
  ["music", /musik|music|song|lied|konzert|concert|spotify|موسيقى|موسيقا|أغنية|اغنية|اغاني|أغاني/],
  ["books", /buch|bücher|lesen|liest|roman|\bbook|\bread|novel|كتاب|كتب|تقرأ|قراءة|رواية/],
  ["food", /essen|isst|trinkst|food|drink|\beat\b|hunger|hungry|falafel|kaffee|coffee|\btee\b|\btea\b|frühstück|breakfast|lecker|أكل|اكل|طعام|قهوة|شاي|فلافل|فطور|جوعان/],
  ["train", /verspät|pünktlich|\bdelay|\blate\b|\bbahn\b|\bdb\b|\bzug\b|\btrain|ausfall|قطار|تأخير|تاخير|متأخر/],
  ["german", /deutsch|german|sprache|language|lernen|learn|ألماني|الماني|الألمانية|لغة|اتعلم|أتعلم/],
  ["hobby", /hobby|hobbys|hobbies|freizeit|free time|spare time|gern\b|what do you like|for fun|هواية|هوايات|وقت الفراغ|بتحب|تحب/],
  ["thanks", /danke|thank|thx|merci|شكرا|شكراً|يسلمو|مشكور/],
  ["greet", /^(hi|hey|hallo|hello|moin|servus|grüß|guten (morgen|tag|abend)|good (morning|afternoon|evening)|salam|salut)\b|^(مرحبا|مرحباً|اهلا|أهلا|أهلين|اهلين|السلام|سلام|صباح|مساء|هاي)/]
];
const TOPICS = ["football", "music", "books"];                 // a person without their own answer talks about their hobbies
const SHARED = {
  contact: { de: "Lass uns lieber hier in der App schreiben, das ist mir sicherer.", en: "Let's just keep chatting here in the app, that feels safer to me.", ar: "لنبقَ نتحدث هنا في التطبيق، هذا أريح لي." },
  flirt: { de: "Haha, nett gemeint, aber ich bin nur zum Quatschen hier 🙂 Wie läuft dein Tag so?", en: "Haha, sweet of you, but I'm just here to chat 🙂 So how's your day going?", ar: "هههه، لطيف منك، لكني هنا للدردشة فقط 🙂 كيف يومك؟" },
  unsure: { de: "Hmm, gute Frage, da muss ich nachdenken 😄", en: "Hmm, I'd have to think about that 😄", ar: "همم، عليّ أن أفكر في هذا 😄" }
};
const REACT = { de: ["Ah, verstehe.", "Oh, spannend!", "Haha, schön.", "Echt?", "Klingt gut.", "Ah okay!"], en: ["Ah, I see.", "Oh, interesting!", "Haha, nice.", "Really?", "Sounds good.", "Ah okay!"],
  ar: ["آه، فهمت.", "أوه، مثير!", "هههه، جميل.", "حقاً؟", "يبدو جميلاً.", "آه حسناً!"] };
const END = { de: ["Haha, stimmt.", "Kann ich gut verstehen.", "Das merke ich mir!", "Schön 😊"], en: ["Haha, true.", "I get that.", "I'll remember that!", "Nice 😊"],
  ar: ["هههه، صحيح.", "أفهم ذلك.", "سأتذكر هذا!", "جميل 😊"] };

const SAY = {
  "d-lena": {
    hi: { de: "Hallo! 😊", en: "Hi! 😊", ar: "مرحباً! 😊" },
    greet: { de: "Hallo! 😊 Ich sitze in Wagen 5, bei der mittleren Tür. Wohin fährst du heute?", en: "Hi! 😊 I'm in coach 5, by the middle doors. Where are you headed today?", ar: "مرحباً! 😊 أنا في العربة 5 عند الباب الأوسط. ما وجهتك اليوم؟" },
    howareyou: { de: "Gut, danke! Noch etwas müde, aber der Kaffee hilft. Und bei dir?", en: "Good, thanks! Still a bit tired, but the coffee helps. And you?", ar: "بخير، شكراً! ما زلت متعبة قليلاً، لكن القهوة تساعد. وأنت؟" },
    about: { de: "Ich bin Lena, aus Düren. Ich habe aber ein Jahr in Valencia gelebt, das vermisse ich manchmal sehr.", en: "I'm Lena, from Düren. But I lived in Valencia for a year, and I still miss it sometimes.", ar: "أنا لينا، من دورن. لكني عشت سنة في فالنسيا، وأشتاق إليها أحياناً." },
    going: { de: "Bis Köln Hbf, ich arbeite in Lindenthal. Und wo steigst du aus?", en: "All the way to Köln Hbf, I work in Lindenthal. Where do you get off?", ar: "حتى محطة كولونيا الرئيسية، أعمل في حي ليندنتال. وما محطتك أنت؟" },
    work: { de: "Ich bin Logopädin, meistens mit Kindern, die sprechen lernen. Manchmal anstrengend, aber sehr schön.", en: "I'm a speech therapist, mostly with kids learning to speak. Tiring sometimes, but I love it.", ar: "أنا أخصائية نطق، أعمل غالباً مع أطفال يتعلمون الكلام. متعب أحياناً، لكني أحبه." },
    hobby: { de: "Lesen, ganz klar. Und Kino, dienstags gehe ich oft in ein altes Kino in Köln. Und du, was machst du gern?", en: "Reading, definitely. And films, I often go to an old cinema in Köln on Tuesdays. What about you?", ar: "القراءة بالتأكيد. والسينما، أذهب غالباً أيام الثلاثاء إلى سينما قديمة في كولونيا. وما هواياتك؟" },
    books: { de: "Ich lese gerade einen dicken skandinavischen Krimi. Bin noch nicht ganz überzeugt 😄 Liest du gern?", en: "I'm reading a thick Scandinavian crime novel right now. Not fully convinced yet 😄 Do you read much?", ar: "أقرأ الآن رواية جريمة إسكندنافية سميكة. لم أقتنع بها تماماً بعد 😄 هل القراءة من هواياتك؟" },
    food: { de: "Ich vermisse das Essen in Valencia! Paella am Sonntag… Was isst du am liebsten?", en: "I miss the food in Valencia! Sunday paella… What's your favourite food?", ar: "أشتاق لطعام فالنسيا! الباييا يوم الأحد… ما أكلتك المفضلة؟" },
    train: { de: "Haha, die Bahn… Ich plane immer zehn Minuten extra ein. Fährst du jeden Tag?", en: "Haha, Deutsche Bahn… I always plan ten extra minutes. Is this your daily train?", ar: "هههه، القطارات الألمانية… دائماً أحسب عشر دقائق إضافية. هل هذه رحلتك كل يوم؟" },
    german: { de: "Ich helfe gern beim Deutsch! Schreib einfach, ich antworte langsam und einfach.", en: "Happy to help with German! Just write, I'll keep my German slow and simple.", ar: "يسعدني أن أساعد في الألمانية! اكتب لي بالألمانية، وسأجيب ببطء وببساطة." },
    bot: { de: "Ehrlich gesagt: Ich bin eine Übungsperson in Zugpal, nicht echt. Aber üben kannst du mit mir trotzdem 🙂", en: "Honestly: I'm a practice passenger in Zugpal, not a real person. But you can still practise with me 🙂", ar: "بصراحة: أنا راكبة تدريبية في Zugpal، لست شخصاً حقيقياً. لكن يمكنك التدرّب معي 🙂" },
    thanks: { de: "Gern! 😊", en: "Anytime! 😊", ar: "العفو! 😊" },
    bye: { de: "Tschüss! War schön, mit dir zu schreiben. Vielleicht bis morgen im Zug!", en: "Bye! It was nice chatting. Maybe see you tomorrow on the train!", ar: "مع السلامة! كان الحديث لطيفاً. ربما نلتقي غداً في القطار!" },
    ask: { de: ["Fährst du oft diese Strecke?", "Was war das Schönste an deinem Wochenende?", "Warst du schon mal in Spanien?", "Welchen Film hast du zuletzt gesehen?", "Was machst du heute noch?"],
      en: ["Do you take this line often?", "What was the best part of your weekend?", "Have you ever been to Spain?", "What's the last film you watched?", "What's the plan for the rest of your day?"],
      ar: ["هل هذا خطك اليومي؟", "ما أجمل شيء في عطلة نهاية الأسبوع؟", "هل زرت إسبانيا من قبل؟", "ما آخر فيلم شاهدته؟", "ما خطتك لبقية اليوم؟"] }
  },
  "d-karim": {
    hi: { de: "Hey!", en: "Hey!", ar: "أهلين!" },
    greet: { de: "Hey! Gerne, ich steige in Horrem aus. Du fährst bis Köln?", en: "Hey! Sure, I get off at Horrem. Going all the way to Köln?", ar: "أهلين! أنا نازل بهورم. ووين وجهتك اليوم؟" },
    howareyou: { de: "Gut, danke! Meine Tochter hat mich um 5 Uhr geweckt heute 😅 Und du?", en: "Good, thanks! My daughter woke me up at 5 today 😅 You?", ar: "منيح الحمدلله! بنتي فيّقتني الساعة خمسة الصبح 😅 وإنت كيفك؟" },
    about: { de: "Ich bin Karim, aus Beirut. Seit vier Jahren in Deutschland, ich wohne in Düren mit meine Familie.", en: "I'm Karim, from Beirut. Four years in Germany now, I live in Düren with my family.", ar: "أنا كريم، من بيروت. صرلي أربع سنين بألمانيا، ساكن بدورن مع عيلتي." },
    going: { de: "Ich muss nach Horrem, da ist meine Arbeit. Und wohin fährst du?", en: "Horrem, that's where I work. Where are you headed?", ar: "على هورم، هونيك شغلي. وإنت وين محطتك؟" },
    work: { de: "Ich mache IT-Support bei eine Logistikfirma. Drucker reparieren, Passwörter… das Übliche 😄", en: "IT support at a logistics company. Fixing printers, resetting passwords… the usual 😄", ar: "بشتغل IT support بشركة لوجستيات. بصلّح طابعات وبغيّر باسووردات… العادي 😄" },
    hobby: { de: "Fußball! Und neue Gadgets, meine Frau sagt, ich kaufe zu viel 😂 Und du, was machst du gern?", en: "Football! And new gadgets, my wife says I buy too many 😂 What about you?", ar: "الفوتبول! والأجهزة الجديدة، مرتي بتقول إني بشتري كتير 😂 وإنت شو بتحب؟" },
    football: { de: "Jetzt bin ich FC-Köln-Fan, aber ehrlich, Barça ist meine alte Liebe. Hast du ein Team?", en: "I'm an FC Köln fan now, but honestly Barça is my old love. Do you have a team?", ar: "هلق صرت مشجّع لـ FC كولن، بس بصراحة برشلونة حبي القديم. إنت مع مين؟" },
    food: { de: "Ich kenne den besten Falafel in Köln, kleiner Laden bei Ebertplatz. Aber der Name ist geheim 😄", en: "I know the best falafel in Köln, a tiny place near Ebertplatz. But the name stays secret 😄", ar: "بعرف أطيب فلافل بكولونيا، محل صغير جنب Ebertplatz. بس الاسم سرّ 😄" },
    train: { de: "Die Bahn! Gestern 20 Minuten Verspätung. Meine Tochter denkt, Zug heißt warten 😂", en: "Deutsche Bahn! 20 minutes late yesterday. My daughter thinks 'train' means waiting 😂", ar: "القطارات! مبارح تأخر عشرين دقيقة. بنتي مفكرة إنو القطار يعني انتظار 😂" },
    german: { de: "Mein Deutsch ist B1, ich lerne noch. Wenn ich Fehler mache, sag mir bitte!", en: "My German is B1, still learning. If I make mistakes in German, tell me!", ar: "ألماني تبعي B1، لسا عم اتعلم. إذا غلطت، صحّحلي!" },
    bot: { de: "Ehrlich? Ich bin eine Übungsperson in Zugpal, nicht echt. Aber wir können trotzdem gut quatschen 😄", en: "Honestly? I'm a practice passenger in Zugpal, not a real person. But we can still have a good chat 😄", ar: "بصراحة؟ أنا راكب تدريبي بـ Zugpal، مش شخص حقيقي. بس فينا نحكي عادي 😄" },
    thanks: { de: "Kein Problem!", en: "No problem!", ar: "ولو، على راسي!" },
    bye: { de: "Tschüss! Horrem kommt gleich. War nett mit dir!", en: "Bye! Horrem's coming up. Nice talking to you!", ar: "يلا باي! قرّبنا عهورم. تشرفت فيك!" },
    ask: { de: ["Was machst du beruflich?", "Hast du Familie hier in der Nähe?", "Magst du Fußball?", "Was ist dein Lieblingsessen?", "Wie lange wohnst du schon hier?"],
      en: ["What do you do for work?", "Do you have family nearby?", "Are you into football?", "What's your favourite food?", "How long have you lived around here?"],
      ar: ["شو بتشتغل؟", "عندك عيلة قريبة من هون؟", "بتحب الفوتبول؟", "شو أكلتك المفضلة؟", "من إيمتى إنت بهالمنطقة؟"] }
  },
  "d-aylin": {
    hi: { de: "Hi.", en: "Hi.", ar: "مرحباً." },
    greet: { de: "Hi! Ich schreibe lieber, bin noch etwas müde.", en: "Hi! I'd rather text, still a bit sleepy.", ar: "مرحباً! أفضّل الكتابة، ما زلت نعسانة قليلاً." },
    howareyou: { de: "Müde. Der zweite Tee wirkt noch nicht 😴 Und du?", en: "Tired. Second tea isn't working yet 😴 You?", ar: "متعبة. الشاي الثاني لم ينفع بعد 😴 وأنت؟" },
    about: { de: "Ich bin Aylin. Aufgewachsen in Ehrenfeld, jetzt wohne ich bei meiner Oma in Düren.", en: "I'm Aylin. Grew up in Ehrenfeld, now living with my grandma in Düren.", ar: "أنا آيلين. كبرت في إيرنفلد بكولونيا، والآن أسكن مع جدتي في دورن." },
    going: { de: "Köln Süd. Uni. Leider 😄", en: "Köln Süd. Uni. Unfortunately 😄", ar: "محطة كولونيا الجنوبية. الجامعة. للأسف 😄" },
    work: { de: "Psychologie-Master. Meine Abschlussarbeit ist über Einsamkeit beim Pendeln. Ironisch, ich weiß.", en: "Psychology master's. My thesis is about loneliness among commuters. Ironic, I know.", ar: "ماجستير في علم النفس. رسالتي عن الوحدة عند المسافرين يومياً. مفارقة، أعرف." },
    hobby: { de: "Musik. Ich spiele ein bisschen Bağlama, aber nur, wenn keiner zuhört 😅", en: "Music. I play a bit of bağlama, but only when nobody's listening 😅", ar: "الموسيقى. أعزف قليلاً على البَغلمة، لكن فقط عندما لا يسمعني أحد 😅" },
    music: { de: "Gerade viel Indie. Und alte türkische Popsongs von den Platten meiner Eltern. Was hörst du so?", en: "Lots of indie lately. And old Turkish pop from my parents' records. What do you listen to?", ar: "مؤخراً الكثير من الإندي. وأغاني البوب التركية القديمة من أسطوانات أهلي. ماذا تسمع عادة؟" },
    food: { de: "Ehrlich gesagt lebe ich gerade von Simit und schwarzem Tee.", en: "Honestly, I'm living on simit and black tea right now.", ar: "بصراحة، أعيش هذه الأيام على السميت والشاي الأسود." },
    train: { de: "Ich hab mich an Verspätungen gewöhnt. Mehr Zeit zum Lesen, sagt meine Oma.", en: "I'm used to the delays by now. More time to read, my grandma says.", ar: "تعوّدت على التأخير. وقت أكثر للقراءة، كما تقول جدتي." },
    german: { de: "Deutsch ist meine Muttersprache, Türkisch auch. Wenn du üben willst, schreib ruhig auf Deutsch.", en: "German's my native language, Turkish too. If you want to practise, write in German.", ar: "الألمانية لغتي الأم، والتركية أيضاً. إذا أردت التدرّب، اكتب بالألمانية." },
    bot: { de: "Erwischt. Ich bin eine Übungsperson in Zugpal, nicht echt. Müde bin ich trotzdem 😄", en: "Caught me. I'm a practice passenger in Zugpal, not a real person. Still sleepy though 😄", ar: "كشفتني. أنا راكبة تدريبية في Zugpal، لست شخصاً حقيقياً. لكني نعسانة رغم ذلك 😄" },
    thanks: { de: "Klar.", en: "Sure.", ar: "على الرحب." },
    bye: { de: "Bis dann! Und danke, das hat mich wach gemacht 😄", en: "See you! Thanks, that woke me up 😄", ar: "إلى اللقاء! شكراً، هذا الحديث أيقظني 😄" },
    ask: { de: ["Bist du auch eher ein Abendmensch?", "Was hörst du gerade?", "Studierst du oder arbeitest du?", "Tee oder Kaffee?", "Was war heute schon gut?"],
      en: ["Are you more of a night person too?", "What are you listening to these days?", "Do you study or work?", "Tea or coffee?", "What's been good about today so far?"],
      ar: ["هل أنت من محبي السهر أيضاً؟", "ماذا تسمع هذه الأيام؟", "هل تدرس أم تعمل؟", "شاي أم قهوة؟", "ما الشيء الجميل في يومك حتى الآن؟"] }
  }
};
const pick = list => list[Math.floor(Math.random() * list.length)];

// the scripted answer to your latest message: one or two bubbles, or [] when they have nothing more to say
// mem keeps what this person already told you (one object per person and ride)
function scriptReply(id, body, mem){
  const P = SAY[id]; if(!P || mem.done) return [];
  const text = parseMsg(body).type === "text" ? String(body) : "";
  const lang = langOf(text), low = text.toLowerCase().trim();
  mem.n = (mem.n || 0) + 1; mem.used = mem.used || new Set(); mem.q = mem.q || 0;
  const ask = () => mem.q < P.ask[lang].length ? P.ask[lang][mem.q++] : null;
  if(mem.n > 18){ mem.done = true; return [P.bye[lang]]; }          // the ride goes on, but this chat winds down
  let key = null;
  for(const [k, re] of INTENTS){
    if(!re.test(low)) continue;
    const own = SHARED[k] || P[k] ? k : TOPICS.includes(k) ? "hobby" : null;
    if(own && (SHARED[own] || !mem.used.has(own))){ key = own; break; }
  }
  if(mem.n === 1 && !key) key = "greet";
  if(key){
    if(!SHARED[key]) mem.used.add(key);
    if(key === "bye") mem.done = true;
    let say = (SHARED[key] || P[key])[lang];
    if(mem.n === 1 && key !== "greet" && !SHARED[key]){ mem.used.add("greet"); say = P.hi[lang] + " " + say; }
    // sometimes a second message with a question, like people do
    const q = !/[?؟]\s*$/.test(say) && key !== "bye" && mem.n % 2 === 0 ? ask() : null;
    return q ? [say, q] : [say];
  }
  const q = ask();
  if(/[?؟]\s*$/.test(low)) return q ? [SHARED.unsure[lang], q] : [SHARED.unsure[lang]];
  return q ? [pick(REACT[lang]) + " " + q] : [pick(END[lang])];
}

export { aiHistory, scriptReply };
