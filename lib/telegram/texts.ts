// Canned bot replies — the bot NEVER spends tokens on incoming traffic; every
// user-initiated interaction gets one of these templates. en/ru are reference,
// kz/kg/uz are drafts pending a native pass (same as reactionPieces).

export type TgLocale = 'en' | 'ru' | 'kz' | 'kg' | 'uz'

export type TgTexts = {
  linked: string
  linkPrompt: string
  badCode: string
  freeText: string
  snoozeAck: string
  farewell: string
  progressTitle: string
  noData: string
  btnDrill: string
  btnProgress: string
  btnSnooze: string
  btnRenew: string
}

const SITE = 'https://ielts.camp'

export const TG_TEXTS: Record<TgLocale, TgTexts> = {
  en: {
    linked: '✅ Linked! I\'ll send your evening reviews here. See you at 20:00.',
    linkPrompt: `To link your account, open ${SITE}/dashboard/settings and press "Connect Telegram" — then send me the code.`,
    badCode: 'That code doesn\'t match or has expired. Grab a fresh one in the site settings.',
    freeText: `I only send reviews for now 🙂 For a real conversation the site is better — the full AI coach lives there: ${SITE}/dashboard`,
    snoozeAck: 'Okay, resting today 👌 Back tomorrow.',
    farewell: `Your subscription ended, so I\'m pausing the evening reviews 😔 Renew and I\'m back the same evening — no re-linking needed: ${SITE}/subscription`,
    progressTitle: '📊 Your current bands:',
    noData: 'No completed tests yet — finish one and I\'ll have numbers for you.',
    btnDrill: '🎧 Give me a drill',
    btnProgress: '📊 My progress',
    btnSnooze: '😴 Not today',
    btnRenew: 'Renew',
  },
  ru: {
    linked: '✅ Привязано! Вечерние разборы теперь будут приходить сюда. До встречи в 20:00.',
    linkPrompt: `Чтобы привязать аккаунт, открой ${SITE}/dashboard/settings, нажми «Подключить Telegram» и пришли мне код.`,
    badCode: 'Код не подошёл или истёк. Возьми свежий в настройках на сайте.',
    freeText: `Я пока только присылаю разборы 🙂 Поговорить лучше на сайте — там полный AI-тренер: ${SITE}/dashboard`,
    snoozeAck: 'Ок, сегодня отдыхаем 👌 Вернусь завтра.',
    farewell: `Подписка закончилась, ставлю вечерние разборы на паузу 😔 Продлишь — вернусь тем же вечером, заново подключать не нужно: ${SITE}/subscription`,
    progressTitle: '📊 Твои текущие band’ы:',
    noData: 'Пока нет завершённых тестов — пройди один, и у меня появятся цифры.',
    btnDrill: '🎧 Дай drill',
    btnProgress: '📊 Мой прогресс',
    btnSnooze: '😴 Не сегодня',
    btnRenew: 'Продлить',
  },
  kz: {
    linked: '✅ Байланды! Кешкі талдаулар енді осында келеді. 20:00-де кездесеміз.',
    linkPrompt: `Аккаунтты байлау үшін ${SITE}/dashboard/settings ашып, «Telegram қосу» батырмасын бас та, маған кодты жібер.`,
    badCode: 'Код сәйкес келмеді немесе мерзімі өтті. Сайттағы баптаулардан жаңасын ал.',
    freeText: `Мен әзірге тек талдау жіберемін 🙂 Сөйлесу үшін сайт ыңғайлы — толық AI-жаттықтырушы сонда: ${SITE}/dashboard`,
    snoozeAck: 'Жарайды, бүгін демаламыз 👌 Ертең ораламын.',
    farewell: `Жазылым аяқталды, кешкі талдауларды тоқтата тұрамын 😔 Ұзартсаң — сол кеште ораламын, қайта қосудың қажеті жоқ: ${SITE}/subscription`,
    progressTitle: '📊 Қазіргі band көрсеткіштерің:',
    noData: 'Әзірге аяқталған тест жоқ — біреуін өтсең, сандар пайда болады.',
    btnDrill: '🎧 Drill бер',
    btnProgress: '📊 Прогресім',
    btnSnooze: '😴 Бүгін емес',
    btnRenew: 'Ұзарту',
  },
  kg: {
    linked: '✅ Байланды! Кечки талдоолор эми ушул жерге келет. 20:00дө жолугабыз.',
    linkPrompt: `Аккаунтту байлоо үчүн ${SITE}/dashboard/settings ачып, «Telegram кошуу» баскычын басып, мага кодду жөнөт.`,
    badCode: 'Код туура келген жок же мөөнөтү өттү. Сайттагы жөндөөлөрдөн жаңысын ал.',
    freeText: `Мен азырынча талдоо гана жөнөтөм 🙂 Сүйлөшүү үчүн сайт ыңгайлуу — толук AI-машыктыруучу ошол жерде: ${SITE}/dashboard`,
    snoozeAck: 'Макул, бүгүн эс алабыз 👌 Эртең кайтам.',
    farewell: `Жазылуу бүттү, кечки талдоолорду токтотуп турам 😔 Узартсаң — ошол эле кечте кайтам, кайра кошуунун кереги жок: ${SITE}/subscription`,
    progressTitle: '📊 Азыркы band көрсөткүчтөрүң:',
    noData: 'Азырынча бүткөн тест жок — бирөөнү өтсөң, сандар пайда болот.',
    btnDrill: '🎧 Drill бер',
    btnProgress: '📊 Прогрессим',
    btnSnooze: '😴 Бүгүн эмес',
    btnRenew: 'Узартуу',
  },
  uz: {
    linked: '✅ Bog\'landi! Kechki tahlillar endi shu yerga keladi. 20:00 da ko\'rishamiz.',
    linkPrompt: `Hisobni bog'lash uchun ${SITE}/dashboard/settings sahifasini ochib, «Telegram ulash» tugmasini bos va menga kodni yubor.`,
    badCode: 'Kod mos kelmadi yoki muddati o\'tgan. Saytdagi sozlamalardan yangisini ol.',
    freeText: `Men hozircha faqat tahlil yuboraman 🙂 Suhbat uchun sayt qulayroq — to'liq AI-murabbiy o'sha yerda: ${SITE}/dashboard`,
    snoozeAck: 'Xo\'p, bugun dam olamiz 👌 Ertaga qaytaman.',
    farewell: `Obuna tugadi, kechki tahlillarni pauza qilaman 😔 Uzaytirsang — o'sha kechqurun qaytaman, qayta ulash shart emas: ${SITE}/subscription`,
    progressTitle: '📊 Hozirgi band ko\'rsatkichlaring:',
    noData: 'Hali tugallangan test yo\'q — bittasini o\'tsang, raqamlar paydo bo\'ladi.',
    btnDrill: '🎧 Drill ber',
    btnProgress: '📊 Progressim',
    btnSnooze: '😴 Bugun emas',
    btnRenew: 'Uzaytirish',
  },
}

export function tgTexts(locale: string | null | undefined): TgTexts {
  return TG_TEXTS[(locale ?? 'en') as TgLocale] ?? TG_TEXTS.en
}
