// Canned bot replies — the bot NEVER spends tokens on incoming traffic; every
// user-initiated interaction gets one of these templates. en/ru are reference,
// kz/kg/uz are drafts pending a native pass (same as reactionPieces).

export type TgLocale = 'en' | 'ru' | 'kz' | 'kg' | 'uz'

export type TgTexts = {
  linked: string
  // Welcome for a linked account without a subscription: confirm the bonus,
  // set expectations, first soft pitch.
  linkedFree: string
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
    linkedFree: `✅ Linked! +2 free essay checks added. I'll ping you with reminders and your results. The full evening AI review is part of full access: ${SITE}/subscription`,
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
    linkedFree: `✅ Подключено! +2 бесплатные проверки эссе начислены. Буду присылать напоминания и твои результаты. Полный вечерний AI-разбор — в полном доступе: ${SITE}/subscription`,
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
    linkedFree: `✅ Қосылды! +2 тегін эссе тексеруі берілді. Еске салулар мен нәтижелеріңді жіберіп тұрамын. Толық кешкі AI-талдау — толық қолжетімділікте: ${SITE}/subscription`,
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
    linkedFree: `✅ Кошулду! +2 акысыз эссе текшерүү берилди. Эскертүүлөр менен жыйынтыктарыңды жөнөтүп турам. Толук кечки AI-талдоо — толук мүмкүнчүлүктө: ${SITE}/subscription`,
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
    linkedFree: `✅ Ulandi! +2 bepul esse tekshiruvi qo'shildi. Eslatmalar va natijalaringni yuborib turaman. To'liq kechki AI-tahlil — to'liq imkoniyatda: ${SITE}/subscription`,
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

// ── Upsell nudges for free linked users ──────────────────────────────────────
// Deliberately hard-sell: concrete value, price anchor (a retake costs more
// than the subscription), urgency. Sent by lib/agent/upsell.server.ts only —
// which owns the cooldowns, so these strings never decide frequency.

export type TgUpsells = {
  mock: (band: string) => string
  checkerLimit: string
  inactive: string
  btnUpgrade: string
}

export const TG_UPSELLS: Record<TgLocale, TgUpsells> = {
  en: {
    mock: band => `Your free mock: ${band} 🎯 That's the ceiling of the free plan. Full access = unlimited AI Writing & Speaking checks, every mock test and a personal plan to your target band. One exam retake costs more than months of full access. Upgrade now:`,
    checkerLimit: `Your free checks are gone. You've seen how the AI catches your mistakes — now imagine that after every single essay. Full access removes every limit: Writing, Speaking, mocks, your plan. Don't practise blind:`,
    inactive: `3 days without practice — your band doesn't grow on its own 😬 Every skipped day pushes your exam result further away. Come back for 15 minutes today, or unlock full access and I'll walk you to the target step by step:`,
    btnUpgrade: '🚀 Get full access',
  },
  ru: {
    mock: band => `Твой бесплатный мок: ${band} 🎯 Это потолок бесплатного тарифа. Полный доступ — безлимитные AI-проверки Writing и Speaking, все мок-тесты и личный план до целевого балла. Одна пересдача экзамена стоит дороже месяцев подписки. Подключай:`,
    checkerLimit: `Бесплатные проверки закончились. Ты видел, как AI ловит твои ошибки — представь такой разбор после каждого эссе. Полный доступ снимает все лимиты: Writing, Speaking, моки, план. Не готовься вслепую:`,
    inactive: `3 дня без практики — балл сам не вырастет 😬 Каждый пропущенный день отодвигает результат. Вернись сегодня на 15 минут — или открой полный доступ, и я доведу тебя до цели по шагам:`,
    btnUpgrade: '🚀 Открыть полный доступ',
  },
  kz: {
    mock: band => `Тегін мок нәтижең: ${band} 🎯 Бұл тегін тарифтің төбесі. Толық қолжетімділік — шексіз AI Writing және Speaking тексерулері, барлық мок-тесттер және мақсатты балға дейінгі жеке жоспар. Емтиханды қайта тапсыру айлық жазылымнан әлдеқайда қымбат. Қазір қосыл:`,
    checkerLimit: `Тегін тексерулер бітті. AI қателеріңді қалай тапқанын көрдің — енді әр эссе сайын осындай талдау бар деп елестет. Толық қолжетімділік барлық шектеуді алып тастайды: Writing, Speaking, моктар, жоспар. Көзсіз дайындалма:`,
    inactive: `3 күн жаттығусыз — балл өздігінен өспейді 😬 Әр өткізілген күн нәтижені алыстатады. Бүгін 15 минутқа орал — немесе толық қолжетімділікті аш, мен сені мақсатқа қадам-қадаммен жеткіземін:`,
    btnUpgrade: '🚀 Толық қолжетімділік алу',
  },
  kg: {
    mock: band => `Акысыз мок жыйынтыгың: ${band} 🎯 Бул акысыз тарифтин чеги. Толук мүмкүнчүлүк — чексиз AI Writing жана Speaking текшерүүлөрү, бардык мок-тесттер жана максаттуу баллга чейинки жеке план. Экзаменди кайра тапшыруу айлык жазылуудан кымбат. Азыр кошул:`,
    checkerLimit: `Акысыз текшерүүлөр бүттү. AI каталарыңды кантип тапканын көрдүң — эми ар бир эсседен кийин ушундай талдоо бар деп элестет. Толук мүмкүнчүлүк бардык чектөөнү алып салат: Writing, Speaking, моктор, план. Сокур даярданба:`,
    inactive: `3 күн машыгуусуз — балл өзүнөн-өзү өспөйт 😬 Ар бир өткөрүлгөн күн жыйынтыкты алыстатат. Бүгүн 15 мүнөткө кайт — же толук мүмкүнчүлүктү ач, мен сени максатка кадам-кадам жеткирем:`,
    btnUpgrade: '🚀 Толук мүмкүнчүлүк алуу',
  },
  uz: {
    mock: band => `Bepul mok natijang: ${band} 🎯 Bu bepul tarifning shifti. To'liq imkoniyat — cheksiz AI Writing va Speaking tekshiruvlari, barcha mok-testlar va maqsadli balgacha shaxsiy reja. Imtihonni qayta topshirish oylik obunadan qimmatroq. Hozir ula:`,
    checkerLimit: `Bepul tekshiruvlar tugadi. AI xatolaringni qanday topganini ko'rding — endi har bir essedan keyin shunday tahlil bor deb tasavvur qil. To'liq imkoniyat barcha limitlarni olib tashlaydi: Writing, Speaking, moklar, reja. Ko'r-ko'rona tayyorlanma:`,
    inactive: `3 kun mashqsiz — ball o'z-o'zidan o'smaydi 😬 Har bir o'tkazib yuborilgan kun natijani uzoqlashtiradi. Bugun 15 daqiqaga qayt — yoki to'liq imkoniyatni och, men seni maqsadgacha qadam-baqadam olib boraman:`,
    btnUpgrade: '🚀 To\'liq imkoniyat olish',
  },
}

export function tgUpsells(locale: string | null | undefined): TgUpsells {
  return TG_UPSELLS[(locale ?? 'en') as TgLocale] ?? TG_UPSELLS.en
}
