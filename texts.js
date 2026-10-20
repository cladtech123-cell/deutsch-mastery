// A2 reading texts. quiz: q = question, o = options, a = index of the right option.
// Paragraphs in body are separated by "\n". Every word must have a DICT entry (checked by test.js).
const TEXTS = [
  {
    id: 'tag', title: 'Mein Tag', uz: 'Mening kunim', topic: 'Präsens',
    body: 'Ich heiße Anna und ich wohne in Hamburg. Ich stehe jeden Morgen um sechs Uhr auf. Zuerst trinke ich einen Kaffee und esse ein Brot mit Käse. Dann fahre ich mit dem Bus zur Arbeit.\nIch arbeite in einem Büro. Die Arbeit beginnt um acht Uhr. Mittags esse ich mit meinen Kollegen in der Kantine. Am Nachmittag habe ich oft viele Termine.\nUm fünf Uhr gehe ich nach Hause. Am Abend koche ich das Abendessen und sehe ein bisschen fern. Um elf Uhr gehe ich ins Bett. Ich bin müde, aber zufrieden.',
    quiz: [
      { q: 'Wo wohnt Anna?', o: ['In Berlin', 'In Hamburg', 'In München'], a: 1 },
      { q: 'Wie fährt Anna zur Arbeit?', o: ['Mit dem Auto', 'Mit dem Fahrrad', 'Mit dem Bus'], a: 2 },
      { q: 'Wo isst Anna mittags?', o: ['In der Kantine', 'Zu Hause', 'Im Restaurant'], a: 0 },
    ],
  },
  {
    id: 'supermarkt', title: 'Im Supermarkt', uz: 'Supermarketda', topic: 'Präsens',
    body: 'Heute ist Samstag. Paul geht in den Supermarkt, denn er braucht Lebensmittel für das Wochenende. Er nimmt einen Einkaufswagen. Zuerst kauft er Obst und Gemüse: Äpfel, Bananen, Tomaten und eine Gurke. Dann sucht er Milch und Eier. Die Milch ist im Kühlregal.\nPaul möchte auch Fleisch kaufen, aber das Fleisch ist heute sehr teuer. Er nimmt lieber Fisch. An der Kasse wartet er zehn Minuten. Alles kostet zweiunddreißig Euro. Paul bezahlt mit Karte und geht nach Hause.',
    quiz: [
      { q: 'Welcher Tag ist heute?', o: ['Sonntag', 'Samstag', 'Montag'], a: 1 },
      { q: 'Warum kauft Paul kein Fleisch?', o: ['Es ist zu teuer.', 'Er mag kein Fleisch.', 'Es gibt kein Fleisch.'], a: 0 },
      { q: 'Wie viel kostet alles?', o: ['23 Euro', '32 Euro', '30 Euro'], a: 1 },
      { q: 'Wie bezahlt Paul?', o: ['Mit Karte', 'Bar', 'Mit dem Handy'], a: 0 },
    ],
  },
  {
    id: 'familie', title: 'Meine Familie', uz: 'Mening oilam', topic: 'Präsens',
    body: 'Hallo! Ich bin Lukas und ich bin vierzehn Jahre alt. Meine Familie ist nicht sehr groß. Mein Vater heißt Thomas. Er ist Lehrer und arbeitet an einer Schule. Meine Mutter heißt Sabine. Sie ist Ärztin im Krankenhaus.\nIch habe eine Schwester. Sie heißt Lena und ist zehn Jahre alt. Wir haben auch einen Hund. Er heißt Bello und ist sehr lustig.\nMeine Großeltern wohnen auf dem Land. Wir besuchen sie oft am Sonntag. Meine Oma backt dann immer einen Kuchen. Ich liebe meine Familie!',
    quiz: [
      { q: 'Wie alt ist Lukas?', o: ['10 Jahre', '14 Jahre', '40 Jahre'], a: 1 },
      { q: 'Was ist die Mutter von Lukas von Beruf?', o: ['Lehrerin', 'Ärztin', 'Verkäuferin'], a: 1 },
      { q: 'Wann besucht die Familie die Großeltern?', o: ['Am Samstag', 'Am Sonntag', 'Am Montag'], a: 1 },
    ],
  },
  {
    id: 'berlin', title: 'Ein Wochenende in Berlin', uz: 'Berlinda dam olish kunlari', topic: 'Perfekt',
    body: 'Letztes Wochenende bin ich mit meiner Freundin nach Berlin gefahren. Wir haben mit dem Zug nur zwei Stunden gebraucht. Am Samstag haben wir das Brandenburger Tor gesehen. Danach sind wir in ein Museum gegangen. Das Museum war sehr interessant.\nAm Abend haben wir in einem türkischen Restaurant gegessen. Das Essen hat sehr gut geschmeckt. Am Sonntag hat es leider geregnet. Wir sind lange im Hotel geblieben und haben Karten gespielt. Am Nachmittag sind wir wieder nach Hause gefahren. Die Reise war kurz, aber schön.',
    quiz: [
      { q: 'Wie sind sie nach Berlin gefahren?', o: ['Mit dem Auto', 'Mit dem Zug', 'Mit dem Flugzeug'], a: 1 },
      { q: 'Wo haben sie am Abend gegessen?', o: ['In einem türkischen Restaurant', 'Im Hotel', 'Bei Freunden'], a: 0 },
      { q: 'Wie war das Wetter am Sonntag?', o: ['Sonnig', 'Es hat geregnet.', 'Es hat geschneit.'], a: 1 },
    ],
  },
  {
    id: 'arzt', title: 'Beim Arzt', uz: 'Shifokor qabulida', topic: 'Modalverben',
    body: 'Herr Becker fühlt sich nicht gut. Er hat Kopfschmerzen und Fieber. Seit gestern hat er auch Halsschmerzen. Am Montagmorgen ruft er in der Praxis an und bekommt einen Termin um zehn Uhr.\nIm Wartezimmer sitzen schon fünf Personen. Nach einer halben Stunde kommt er dran. Die Ärztin untersucht ihn und sagt: „Sie haben eine Erkältung. Sie müssen drei Tage zu Hause bleiben und viel Tee trinken.“\nSie schreibt ein Rezept für Tabletten. Herr Becker geht in die Apotheke und kauft die Medikamente. Dann geht er ins Bett.',
    quiz: [
      { q: 'Was hat Herr Becker?', o: ['Bauchschmerzen', 'Kopfschmerzen und Fieber', 'Rückenschmerzen'], a: 1 },
      { q: 'Wie lange muss er zu Hause bleiben?', o: ['Einen Tag', 'Drei Tage', 'Eine Woche'], a: 1 },
      { q: 'Wo kauft er die Medikamente?', o: ['Im Supermarkt', 'In der Praxis', 'In der Apotheke'], a: 2 },
    ],
  },
  {
    id: 'wohnung', title: 'Eine neue Wohnung', uz: 'Yangi kvartira', topic: 'Präsens',
    body: 'Maria kommt aus Spanien und lebt seit einem Jahr in München. Ihre Wohnung ist zu klein, deshalb sucht sie eine neue. Im Internet findet sie eine Anzeige: zwei Zimmer, Küche, Bad und ein Balkon.\nDie Wohnung liegt im dritten Stock und kostet neunhundert Euro warm. Das ist nicht billig, aber die Lage ist sehr gut. Der Bahnhof ist nur fünf Minuten entfernt.\nMaria schreibt dem Vermieter eine Nachricht. Am Donnerstag kann sie die Wohnung besichtigen. Die Zimmer sind hell und ruhig. Maria ist glücklich und möchte die Wohnung sofort mieten.',
    quiz: [
      { q: 'Woher kommt Maria?', o: ['Aus Italien', 'Aus Spanien', 'Aus Polen'], a: 1 },
      { q: 'Warum sucht sie eine neue Wohnung?', o: ['Die Wohnung ist zu teuer.', 'Die Wohnung ist zu klein.', 'Die Wohnung ist zu laut.'], a: 1 },
      { q: 'Wie viel kostet die neue Wohnung?', o: ['500 Euro', '900 Euro', '1200 Euro'], a: 1 },
    ],
  },
];

// Lowercased word form -> Uzbek. Verbs show the infinitive, nouns the article.
const DICT = {
  // olmoshlar, artikllar, bog'lovchilar
  ich: "men", er: "u (erkak)", sie: "u (ayol); ular; Sie — Siz", es: "u (narsa); es regnet — yomg'ir yog'adi", wir: "biz",
  ihn: "uni (erkak)", sich: "o'zini (sich fühlen — o'zini his qilmoq)",
  mein: "mening", meine: "mening", meinen: "mening (Akkusativ erkak jinsi; Dativ ko'plik)", meiner: "mening (Dativ, ayol jinsi)", ihre: "uning (ayol)",
  der: "aniq artikl (erkak jinsi; Dativ ayol jinsi)", die: "aniq artikl (ayol jinsi; ko'plik)", das: "aniq artikl (o'rta jins); bu",
  den: "aniq artikl (Akkusativ, erkak jinsi)", dem: "aniq artikl (Dativ)",
  ein: "bir (noaniq artikl)", eine: "bir (noaniq artikl, ayol jinsi)", einen: "bir (noaniq artikl, Akkusativ)",
  einem: "bir (noaniq artikl, Dativ)", einer: "bir (noaniq artikl, Dativ ayol jinsi)",
  und: "va", aber: "lekin", denn: "chunki", deshalb: "shuning uchun", nicht: "emas, -ma",
  in: "ichida, -da; -ga", im: "-da (in dem)", ins: "-ga (in das)", mit: "bilan", zu: "-ga; haddan tashqari (zu klein — haddan tashqari kichik)",
  zur: "-ga (zu der)", nach: "-ga (shahar, uy); keyin", um: "soat ...da (um sechs Uhr — soat oltida)", am: "-da (an dem): am Abend — kechqurun",
  an: "yonida, -da; anrufen — qo'ng'iroq qilmoq", auf: "ustida; auf dem Land — qishloqda; aufstehen — turmoq", aus: "-dan (qayerdan)",
  für: "uchun", seit: "-dan beri",
  // ravishlar
  sehr: "juda", auch: "ham", dann: "keyin, so'ng", danach: "shundan keyin", zuerst: "avval, birinchi", oft: "tez-tez",
  immer: "doim", schon: "allaqachon", nur: "faqat", leider: "afsuski", lieber: "afzal ko'rib (gern — mamnuniyat bilan)",
  wieder: "yana", sofort: "darhol", lange: "uzoq vaqt", heute: "bugun", gestern: "kecha", jeden: "har (jeden Morgen — har ertalab)",
  viele: "ko'p", viel: "ko'p", alles: "hammasi", bisschen: "ein bisschen — ozgina, biroz", mittags: "tushlikda",
  dran: "navbat (drankommen — navbati kelmoq)", fern: "uzoq; fernsehen — televizor ko'rmoq", hause: "uy: nach Hause — uyga, zu Hause — uyda",
  hallo: "salom",
  // sifatlar
  gut: "yaxshi", schön: "chiroyli, yoqimli", müde: "charchagan", zufrieden: "mamnun", teuer: "qimmat", billig: "arzon",
  alt: "eski; ... yoshda (14 Jahre alt — 14 yoshda)", groß: "katta", klein: "kichik", neue: "yangi (neu)", lustig: "quvnoq, kulgili",
  interessant: "qiziqarli", kurz: "qisqa", hell: "yorug'", ruhig: "tinch", glücklich: "baxtli", warm: "issiq; kommunal to'lovlari bilan (ijara)",
  letztes: "o'tgan (letztes Wochenende — o'tgan dam olish kunlari)", türkischen: "turk (türkisch)", halben: "yarim (halb)",
  dritten: "uchinchi", entfernt: "uzoqlikda (fünf Minuten entfernt — besh daqiqalik masofada)",
  // sonlar
  zwei: "ikki", drei: "uch", fünf: "besh", sechs: "olti", acht: "sakkiz", zehn: "o'n", elf: "o'n bir", vierzehn: "o'n to'rt",
  zweiunddreißig: "o'ttiz ikki", neunhundert: "to'qqiz yuz",
  // fe'llar
  heiße: "ismim ... (heißen — atalmoq)", heißt: "ismi ... (heißen — atalmoq)", wohne: "yashayman (wohnen)", wohnen: "yashaydilar (wohnen)",
  stehe: "turaman (aufstehen — uyg'onib turmoq)", trinke: "ichaman (trinken)", trinken: "ichmoq", esse: "yeyman (essen)",
  fahre: "boraman, transportda (fahren)", arbeite: "ishlayman (arbeiten)", arbeitet: "ishlaydi (arbeiten)", beginnt: "boshlanadi (beginnen)",
  habe: "menda bor (haben)", hat: "unda bor (haben); Perfekt yordamchi fe'li", haben: "bor (haben); Perfekt yordamchi fe'li",
  gehe: "boraman, piyoda (gehen)", geht: "boradi (gehen)", koche: "pishiraman (kochen)", sehe: "ko'raman (sehen); fernsehen — televizor ko'rmoq",
  bin: "-man (sein — bo'lmoq); Perfekt yordamchi fe'li", ist: "-dir (sein — bo'lmoq)", sind: "-miz, -dir (sein); Perfekt yordamchi fe'li",
  war: "edi (sein, o'tgan zamon)", braucht: "kerak bo'ladi (brauchen)", nimmt: "oladi (nehmen)", kauft: "sotib oladi (kaufen)",
  kaufen: "sotib olmoq", sucht: "qidiradi (suchen)", möchte: "xohlaydi (möchten)", wartet: "kutadi (warten)", kostet: "turadi, narxi (kosten)",
  bezahlt: "to'laydi (bezahlen)", besuchen: "ziyorat qilamiz (besuchen)", backt: "pishiradi (backen)", liebe: "sevaman (lieben)",
  fühlt: "his qiladi (sich fühlen)", ruft: "chaqiradi; anrufen — qo'ng'iroq qilmoq", bekommt: "oladi (bekommen)",
  sitzen: "o'tirishibdi (sitzen)", kommt: "keladi (kommen)", untersucht: "tekshiradi (untersuchen)", sagt: "aytadi (sagen)",
  müssen: "kerak, majbursiz (müssen)", bleiben: "qolmoq", schreibt: "yozadi (schreiben)", lebt: "yashaydi (leben)", findet: "topadi (finden)",
  liegt: "joylashgan (liegen)", kann: "-a oladi (können)", besichtigen: "ko'zdan kechirmoq", mieten: "ijaraga olmoq",
  gefahren: "bordi(k) — transportda (fahren, Perfekt)", gebraucht: "sarfladik, kerak bo'ldi (brauchen, Perfekt)", gesehen: "ko'rdik (sehen, Perfekt)",
  gegangen: "bordik (gehen, Perfekt)", gegessen: "yedik (essen, Perfekt)", geschmeckt: "mazali bo'ldi (schmecken, Perfekt)",
  geregnet: "yomg'ir yog'di (regnen, Perfekt)", geblieben: "qoldik (bleiben, Perfekt)", gespielt: "o'ynadik (spielen, Perfekt)",
  // otlar
  morgen: "ertalab (der Morgen); ertaga (morgen)", uhr: "soat (die Uhr)", kaffee: "qahva (der Kaffee)", brot: "non (das Brot)",
  käse: "pishloq (der Käse)", bus: "avtobus (der Bus)", arbeit: "ish (die Arbeit)", büro: "ofis (das Büro)", kollegen: "hamkasblar (der Kollege)",
  kantine: "ish joyidagi oshxona (die Kantine)", nachmittag: "tushdan keyin (der Nachmittag)", termine: "uchrashuvlar (der Termin)",
  termin: "qabul vaqti, uchrashuv (der Termin)", abend: "kechqurun (der Abend)", abendessen: "kechki ovqat (das Abendessen)", essen: "ovqat (das Essen); yemoq", bett: "karavot (das Bett); ins Bett gehen — uxlashga yotmoq",
  samstag: "shanba (der Samstag)", sonntag: "yakshanba (der Sonntag)", donnerstag: "payshanba (der Donnerstag)", montagmorgen: "dushanba ertalab (der Montagmorgen)",
  supermarkt: "supermarket (der Supermarkt)", lebensmittel: "oziq-ovqat (die Lebensmittel)", wochenende: "dam olish kunlari (das Wochenende)",
  einkaufswagen: "xarid aravachasi (der Einkaufswagen)", obst: "meva (das Obst)", gemüse: "sabzavot (das Gemüse)", äpfel: "olmalar (der Apfel)",
  bananen: "bananlar (die Banane)", tomaten: "pomidorlar (die Tomate)", gurke: "bodring (die Gurke)", milch: "sut (die Milch)", eier: "tuxumlar (das Ei)",
  kühlregal: "sovutgichli javon (das Kühlregal)", fleisch: "go'sht (das Fleisch)", fisch: "baliq (der Fisch)", kasse: "kassa (die Kasse)",
  minuten: "daqiqa (die Minute)", euro: "yevro (der Euro)", karte: "bank kartasi (die Karte)", karten: "o'yin kartalari (die Karte)",
  jahre: "yil (das Jahr)", jahr: "yil (das Jahr)", familie: "oila (die Familie)", vater: "ota (der Vater)", lehrer: "o'qituvchi (der Lehrer)",
  schule: "maktab (die Schule)", mutter: "ona (die Mutter)", ärztin: "shifokor, ayol (die Ärztin)", krankenhaus: "kasalxona (das Krankenhaus)",
  schwester: "opa, singil (die Schwester)", hund: "it (der Hund)", großeltern: "bobo va buvi (die Großeltern)", land: "qishloq; mamlakat (das Land)",
  oma: "buvi (die Oma)", kuchen: "pirog (der Kuchen)", freundin: "dugona; qiz do'st (die Freundin)", zug: "poyezd (der Zug)",
  stunden: "soat (die Stunde)", stunde: "soat (die Stunde)", tor: "darvoza (das Tor)", brandenburger: "Brandenburg (Brandenburger Tor — Brandenburg darvozasi)",
  museum: "muzey (das Museum)", restaurant: "restoran (das Restaurant)", hotel: "mehmonxona (das Hotel)", reise: "sayohat (die Reise)",
  herr: "janob (der Herr)", kopfschmerzen: "bosh og'rig'i (die Kopfschmerzen)", fieber: "isitma (das Fieber)", halsschmerzen: "tomoq og'rig'i (die Halsschmerzen)",
  praxis: "shifokor qabulxonasi (die Praxis)", wartezimmer: "kutish xonasi (das Wartezimmer)", personen: "kishi (die Person)",
  erkältung: "shamollash (die Erkältung)", tage: "kun (der Tag)", tee: "choy (der Tee)", rezept: "retsept (das Rezept)",
  tabletten: "tabletkalar (die Tablette)", apotheke: "dorixona (die Apotheke)", medikamente: "dorilar (das Medikament)",
  wohnung: "kvartira (die Wohnung)", internet: "internet (das Internet)", anzeige: "e'lon (die Anzeige)", zimmer: "xona (das Zimmer)",
  küche: "oshxona (die Küche)", bad: "vannaxona (das Bad)", balkon: "balkon (der Balkon)", stock: "qavat (der Stock)", lage: "joylashuv (die Lage)",
  bahnhof: "vokzal (der Bahnhof)", vermieter: "uy egasi, ijaraga beruvchi (der Vermieter)", nachricht: "xabar (die Nachricht)",
  // ismlar va joylar
  anna: "Anna (ism)", paul: "Paul (ism)", lukas: "Lukas (ism)", thomas: "Tomas (ism)", sabine: "Zabina (ism)", lena: "Lena (ism)",
  bello: "Bello (it nomi)", maria: "Mariya (ism)", becker: "Bekker (familiya)", hamburg: "Gamburg (shahar)", berlin: "Berlin (shahar)",
  münchen: "Myunxen (shahar)", spanien: "Ispaniya",
};

if (typeof module !== 'undefined') module.exports = { TEXTS, DICT };
