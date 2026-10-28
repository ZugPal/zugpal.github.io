// Fixed content: moods, topics, languages, badges, icebreakers, words of the ride.

const MOODS = {
  small:{en:"Light small talk",de:"Lockerer Small Talk",ar:"دردشة خفيفة"}, german:{en:"Practice German",de:"Deutsch üben",ar:"ممارسة الألمانية"},
  books:{en:"Books",de:"Bücher",ar:"الكتب"}, football:{en:"Football",de:"Fußball",ar:"كرة القدم"},
  work:{en:"Work & careers",de:"Arbeit & Beruf",ar:"العمل والمهنة"}, music:{en:"Music",de:"Musik",ar:"الموسيقى"},
  travel:{en:"Travel",de:"Reisen",ar:"السفر"}, quiet:{en:"Quiet company",de:"Stille Gesellschaft",ar:"رفقة هادئة"}
};
const TOPICS = {
  cooking:{en:"Cooking",de:"Kochen",ar:"الطبخ"}, football:{en:"Football",de:"Fußball",ar:"كرة القدم"}, tech:{en:"Tech & IT",de:"Technik & IT",ar:"التقنية"},
  family:{en:"Family & kids",de:"Familie & Kinder",ar:"العائلة والأطفال"}, books:{en:"Books",de:"Bücher",ar:"الكتب"}, music:{en:"Music",de:"Musik",ar:"الموسيقى"},
  travel:{en:"Travel",de:"Reisen",ar:"السفر"}, films:{en:"Films & series",de:"Filme & Serien",ar:"الأفلام والمسلسلات"}, sport:{en:"Sport & fitness",de:"Sport & Fitness",ar:"الرياضة واللياقة"},
  nature:{en:"Nature",de:"Natur",ar:"الطبيعة"}, business:{en:"Business",de:"Business",ar:"الأعمال"}, history:{en:"History",de:"Geschichte",ar:"التاريخ"},
  games:{en:"Games",de:"Spiele",ar:"الألعاب"}, psychology:{en:"Psychology",de:"Psychologie",ar:"علم النفس"}
};
const LANGS = ["Deutsch","English","العربية","Türkçe","Français","Español","Русский","Українська","فارسی","Kurdî","Polski","Italiano"];
const AGES = ["18–24","25–29","30–39","40–49","50–59","60+"];
const BADGES = {
  listener:{en:"Great listener",de:"Toller Zuhörer",ar:"مستمع رائع"}, funny:{en:"Funny",de:"Lustig",ar:"مرح"},
  german:{en:"Helped me with German",de:"Hat mir beim Deutsch geholfen",ar:"ساعدني في الألمانية"},
  kind:{en:"Kind",de:"Freundlich",ar:"لطيف"}, stories:{en:"Great stories",de:"Spannende Geschichten",ar:"قصص ممتعة"}
};
const ICE = {
  small:{en:["What's the best thing that happened to you this week?","Coffee or tea on the way to work?"],de:["Was war das Schönste an deiner Woche bisher?","Kaffee oder Tee auf dem Weg zur Arbeit?"],ar:["ما أجمل شيء حدث لك هذا الأسبوع؟","قهوة أم شاي في طريقك إلى العمل؟"]},
  german:{en:["Which German word do you always mix up?","What's your favourite German word?"],de:["Welches deutsche Wort verwechselst du immer?","Was ist dein deutsches Lieblingswort?"],ar:["ما الكلمة الألمانية التي تخلط بينها دائماً؟","ما كلمتك الألمانية المفضلة؟"]},
  books:{en:["What are you reading at the moment?","Which book would you recommend to a stranger?"],de:["Was liest du gerade?","Welches Buch würdest du einer fremden Person empfehlen?"],ar:["ماذا تقرأ هذه الأيام؟","أي كتاب تنصح به شخصاً لا تعرفه؟"]},
  football:{en:["Which team do you support, and why?","Who will win the league this season?"],de:["Für welchen Verein bist du, und warum?","Wer wird diese Saison Meister?"],ar:["أي فريق تشجّع، ولماذا؟","من سيفوز بالدوري هذا الموسم؟"]},
  work:{en:["What do you actually do all day?","What would you do if you could switch jobs tomorrow?"],de:["Was machst du eigentlich den ganzen Tag?","Was würdest du machen, wenn du morgen den Job wechseln könntest?"],ar:["ماذا تعمل طوال اليوم؟","ماذا كنت ستعمل لو استطعت تغيير مهنتك غداً؟"]},
  music:{en:["What was the last song you had on repeat?","What's the best concert you've ever been to?"],de:["Welcher Song lief bei dir zuletzt in Dauerschleife?","Was war das beste Konzert deines Lebens?"],ar:["ما آخر أغنية استمعت إليها مراراً؟","ما أفضل حفلة موسيقية حضرتها؟"]},
  travel:{en:["Where would you go if this train didn't stop?","What's the best place you've ever been?"],de:["Wohin würdest du fahren, wenn dieser Zug nicht anhält?","Was ist der schönste Ort, an dem du je warst?"],ar:["إلى أين كنت ستذهب لو لم يتوقف هذا القطار؟","ما أجمل مكان زرته في حياتك؟"]},
  quiet:{en:["A short hello now, and maybe more tomorrow?","Window or aisle?"],de:["Kurz Hallo sagen, vielleicht morgen mehr?","Fenster oder Gang?"],ar:["تحية قصيرة الآن، وربما حديث أطول غداً؟","النافذة أم الممر؟"]},
  generic:{en:["Do you take this train every day?","What's the best thing about your stop?"],de:["Fährst du jeden Tag mit diesem Zug?","Was ist das Beste an deiner Haltestelle?"],ar:["هل تركب هذا القطار كل يوم؟","ما أجمل شيء في محطتك؟"]}
};
const DICE = {
  en:["The best meal you've ever eaten","A place you'd love to visit","Your first job","Something you learned this year","Your favourite childhood game","A film you can watch again and again","The best advice you ever got","Your dream weekend","A skill you'd like to learn","Something that made you laugh this week","Your favourite season and why","A song that reminds you of home","The most beautiful city you know","What you'd do with an extra hour every day","A book that changed how you see things","Your favourite dish from your home country"],
  de:["Das beste Essen deines Lebens","Ein Ort, den du gern besuchen würdest","Dein erster Job","Etwas, das du dieses Jahr gelernt hast","Dein Lieblingsspiel als Kind","Ein Film, den du immer wieder schauen kannst","Der beste Rat, den du je bekommen hast","Dein Traum-Wochenende","Eine Fähigkeit, die du lernen möchtest","Etwas, das dich diese Woche zum Lachen gebracht hat","Deine Lieblingsjahreszeit und warum","Ein Lied, das dich an zu Hause erinnert","Die schönste Stadt, die du kennst","Was du mit einer Extrastunde am Tag machen würdest","Ein Buch, das deine Sicht verändert hat","Dein Lieblingsgericht aus deiner Heimat"],
  ar:["أفضل وجبة تناولتها في حياتك","مكان تحلم بزيارته","عملك الأول","شيء تعلّمته هذا العام","لعبتك المفضلة في الطفولة","فيلم يمكنك مشاهدته مراراً","أفضل نصيحة تلقيتها","عطلة نهاية الأسبوع التي تحلم بها","مهارة تودّ تعلّمها","شيء أضحكك هذا الأسبوع","فصلك المفضل ولماذا","أغنية تذكّرك بالوطن","أجمل مدينة تعرفها","ماذا ستفعل بساعة إضافية كل يوم","كتاب غيّر نظرتك للأمور","أكلتك المفضلة من بلدك"]
};
const WORDS = [
  ["Feierabend","Das Ende des Arbeitstags","The end of the workday","نهاية يوم العمل"],
  ["Fernweh","Sehnsucht nach fernen Orten","Longing for faraway places","الحنين إلى الأماكن البعيدة"],
  ["Gemütlichkeit","Ein warmes, gemütliches Gefühl","A warm, cosy feeling","الشعور بالدفء والراحة"],
  ["Ohrwurm","Ein Lied, das nicht aus dem Kopf geht","A song stuck in your head","أغنية عالقة في رأسك"],
  ["Verschlimmbessern","Etwas verbessern wollen und es schlimmer machen","To make something worse while trying to improve it","أن تُفسد الشيء وأنت تحاول تحسينه"],
  ["Schnapsidee","Eine verrückte, spontane Idee","A crazy, spontaneous idea","فكرة مجنونة وعفوية"],
  ["Kummerspeck","Gewicht durch Frustessen","Weight gained from comfort eating","الوزن الزائد بسبب الأكل عند الحزن"],
  ["Fingerspitzengefühl","Feingefühl im Umgang mit Menschen","Tact and intuition with people","الحسّ المرهف في التعامل مع الناس"],
  ["Sitzfleisch","Geduld, lange sitzen zu bleiben","The patience to sit through something","الصبر على الجلوس طويلاً"],
  ["Heimweh","Sehnsucht nach zu Hause","Homesickness","الحنين إلى الوطن"],
  ["Augenblick","Ein kurzer Moment","A brief moment","لحظة قصيرة"],
  ["Mitbringsel","Ein kleines Geschenk, das man mitbringt","A small gift you bring along","هدية صغيرة تحملها معك"],
  ["Stammtisch","Ein fester Tisch für Stammgäste","A regulars' table at a pub","طاولة الرواد الدائمين في المطعم"],
  ["Zugzwang","Der Zwang, handeln zu müssen","Being forced to make a move","الاضطرار إلى اتخاذ خطوة"],
  ["Torschlusspanik","Angst, Chancen im Leben zu verpassen","Fear of missing life's chances","الخوف من فوات فرص الحياة"],
  ["Weltschmerz","Traurigkeit über den Zustand der Welt","Sadness about the state of the world","الحزن على حال العالم"]
];
const FOLLOW = {
  de:["Haha, stimmt!","Erzähl mehr davon.","Das kenne ich gut.","Spannend!"],
  en:["Haha, true!","Tell me more about that.","I know that feeling.","Interesting!"],
  ar:["هههه، صحيح!","أخبرني المزيد عن ذلك.","أعرف هذا الشعور جيداً.","مثير للاهتمام!"]
};
const DEMO_PHOTO = "data:image/svg+xml;charset=utf-8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='#9FC9E8'/><circle cx='320' cy='70' r='34' fill='#F7E7B4'/><path d='M0 220 L90 140 L170 200 L260 120 L400 210 L400 300 L0 300 Z' fill='#1F6B50'/><rect x='0' y='250' width='400' height='14' fill='#4A5A54'/><rect x='60' y='226' width='150' height='28' rx='6' fill='#B4531E'/><rect x='72' y='232' width='22' height='12' fill='#F2F4F3'/><rect x='104' y='232' width='22' height='12' fill='#F2F4F3'/><rect x='136' y='232' width='22' height='12' fill='#F2F4F3'/><rect x='168' y='232' width='22' height='12' fill='#F2F4F3'/></svg>");
const REACT = {
  text:null,
  dice:{de:"Gute Frage! Lass mich kurz überlegen…",en:"Good one! Let me think…",ar:"سؤال جميل! دعني أفكر قليلاً…"},
  ttl:{de:"1) Ich habe in Spanien gelebt. 2) Ich habe drei Katzen. 3) Ich kann nicht schwimmen.",en:"1) I've lived in Spain. 2) I have three cats. 3) I can't swim.",ar:"1) عشت في إسبانيا. 2) عندي ثلاث قطط. 3) لا أجيد السباحة."},
  bye:{de:"Danke, gleichfalls! Vielleicht bis morgen.",en:"Thanks, you too! Maybe see you tomorrow.",ar:"شكراً، وأنت أيضاً! ربما نلتقي غداً."}
};

export { AGES, BADGES, DEMO_PHOTO, DICE, FOLLOW, ICE, LANGS, MOODS, REACT, TOPICS, WORDS };
