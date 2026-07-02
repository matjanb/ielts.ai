// Piece banks for instant reactions, per locale. Combinations, not canned
// phrases: [greeting] × [observation] × [closer] with a real number inside —
// thousands of variants from a small set, and the live figure keeps it from
// reading like a template.
//
// Placeholders: {name} {module} {band} {prev} {delta} — filled by reactions.ts.
// en/ru are the reference sets; kz/kg/uz are first drafts — worth a native
// speaker's pass before Telegram launch, same as the roast prompts got.

import type { ReactionBranch } from './reactions'

export type ReactionLocale = 'en' | 'ru' | 'kz' | 'kg' | 'uz'
export type ReactionTone = 'celebrate' | 'support' | 'steady' | 'welcome'

export type ReactionPieceSet = {
  greetingsNamed: string[]
  greetingsPlain: string[]
  observations: Record<ReactionBranch, string[]>
  closers: Record<ReactionTone, string[]>
}

export const REACTION_PIECES: Record<ReactionLocale, ReactionPieceSet> = {
  en: {
    greetingsNamed: [
      '{name},',
      'Okay {name} —',
      '{name}, quick note:',
      'Alright, {name}:',
      '{name}, here’s the read:',
      'So, {name} —',
    ],
    greetingsPlain: [
      'Quick note:',
      'Here’s the read:',
      'Alright —',
      'So —',
    ],
    observations: {
      progress: [
        '{module} moved up: {prev} → {band}.',
        'progress in {module} — {band} vs {prev} last time.',
        'new high in {module}: {band} (was {prev}).',
        '{module}: {delta} since your last test, now {band}.',
      ],
      decline: [
        '{module} dipped today: {band} after {prev}.',
        '{module} came out at {band} — below your {prev}.',
        '{module}: {band} this time, {prev} last time.',
      ],
      plateau: [
        '{module} is holding at {band} — same as last time.',
        '{band} in {module} again.',
        '{module}: steady at {band}.',
      ],
      first_test: [
        'first {module} test done: {band}.',
        'your starting point in {module} — {band}.',
        'first {module} result on the board: {band}.',
      ],
    },
    closers: {
      celebrate: [
        'Clean work. Keep that pace.',
        'That’s a real step forward.',
        'Momentum looks good — don’t stop now.',
        'Whatever you did this week — it’s working.',
      ],
      support: [
        'It happens. One test decides nothing.',
        'You’ll take it back next time — the base is there.',
        'Not a verdict. What matters is you showed up.',
        'Rough day, that’s all. Onward.',
      ],
      steady: [
        'Consistent — now let’s push higher.',
        'You’re holding the level. Time to move it.',
        'Steady. Next: find that extra half band.',
        'The base is solid — now it’s precision work.',
      ],
      welcome: [
        'Good start — now there’s a baseline.',
        'Baseline set. It gets more interesting from here.',
        'The hardest step is starting — done.',
        'Now we know where we’re starting from.',
      ],
    },
  },

  ru: {
    greetingsNamed: [
      '{name},',
      'Так, {name} —',
      '{name}, смотри:',
      'Окей, {name}:',
      '{name}, короткий итог:',
      'Итак, {name} —',
    ],
    greetingsPlain: [
      'Короткий итог:',
      'Смотри:',
      'Так —',
      'Итак:',
    ],
    observations: {
      progress: [
        '{module} подрос: {prev} → {band}.',
        'в {module} прогресс — {band} против {prev} в прошлый раз.',
        'новая планка в {module}: {band} (было {prev}).',
        '{module}: {delta} к прошлому тесту, теперь {band}.',
      ],
      decline: [
        '{module} сегодня просел: {band} после {prev}.',
        'в {module} вышло {band} — ниже прошлых {prev}.',
        '{module}: {band}, в прошлый раз было {prev}.',
      ],
      plateau: [
        '{module} держится на {band} — ровно как в прошлый раз.',
        'снова {band} в {module}.',
        '{module}: стабильные {band}.',
      ],
      first_test: [
        'первый тест по {module} позади: {band}.',
        'стартовая точка в {module} — {band}.',
        'первый результат в {module}: {band}.',
      ],
    },
    closers: {
      celebrate: [
        'Красиво. Так и держи.',
        'Это заметный шаг вперёд.',
        'Темп отличный — не сбавляй.',
        'Что бы ты ни делал на этой неделе — оно работает.',
      ],
      support: [
        'Бывает. Один тест ничего не решает.',
        'В следующий раз отыграешься — база у тебя есть.',
        'Это не приговор. Главное, что ты в процессе.',
        'Просто день такой. Продолжаем.',
      ],
      steady: [
        'Стабильность — уже неплохо. Следующий шаг — выше.',
        'Держишь уровень. Теперь попробуем его сдвинуть.',
        'Ровно. Дальше ищем, где добрать полбалла.',
        'База есть — дальше точечная работа.',
      ],
      welcome: [
        'Хорошее начало — теперь есть точка отсчёта.',
        'Точка отсчёта есть. Дальше — интереснее.',
        'Самый сложный шаг — начать. Он сделан.',
        'Теперь понятно, откуда стартуем.',
      ],
    },
  },

  kz: {
    greetingsNamed: [
      '{name},',
      'Жарайды, {name} —',
      '{name}, қысқаша:',
      '{name}, қараймыз:',
    ],
    greetingsPlain: [
      'Қысқаша:',
      'Сонымен —',
      'Қараймыз:',
    ],
    observations: {
      progress: [
        '{module} өсті: {prev} → {band}.',
        '{module} бойынша прогресс бар — {band} (бұрын {prev}).',
        '{module}: өткен тестке қарағанда {delta}, қазір {band}.',
      ],
      decline: [
        '{module} бүгін төмендеді: {prev} еді, {band} болды.',
        '{module}: {band} — өткендегі {prev}-тен төмен.',
      ],
      plateau: [
        '{module} {band} деңгейінде тұр — өткендегідей.',
        '{module}: тағы {band}.',
      ],
      first_test: [
        'Алғашқы {module} тесті аяқталды: {band}.',
        '{module} бойынша бастапқы нүкте — {band}.',
      ],
    },
    closers: {
      celebrate: [
        'Жақсы қарқын — тоқтама!',
        'Бұл нағыз алға басу.',
        'Осылай жалғастыр.',
      ],
      support: [
        'Болады. Бір тест ештеңе шешпейді.',
        'Келесіде қайтарасың — негіз бар.',
        'Бұл көрсеткіш емес. Ең бастысы — жаттығып жүрсің.',
      ],
      steady: [
        'Тұрақтылық жақсы. Енді жоғары көтерілейік.',
        'Деңгейді ұстап тұрсың. Енді оны жылжытайық.',
        'Негіз бар — енді нақты жұмыс керек.',
      ],
      welcome: [
        'Жақсы бастама — енді бастапқы нүкте бар.',
        'Ең қиын қадам — бастау. Ол жасалды.',
        'Енді қайдан бастайтынымыз белгілі.',
      ],
    },
  },

  kg: {
    greetingsNamed: [
      '{name},',
      'Макул, {name} —',
      '{name}, кыскача:',
    ],
    greetingsPlain: [
      'Кыскача:',
      'Демек —',
    ],
    observations: {
      progress: [
        '{module} өстү: {prev} → {band}.',
        '{module} боюнча прогресс бар — {band} (мурун {prev}).',
        '{module}: өткөн тестке салыштырганда {delta}, азыр {band}.',
      ],
      decline: [
        '{module} бүгүн төмөндөдү: {prev} эле, {band} болду.',
        '{module}: {band} — мурунку {prev}-тен төмөн.',
      ],
      plateau: [
        '{module} {band} деңгээлинде турат — мурункудай эле.',
        '{module}: дагы {band}.',
      ],
      first_test: [
        'Биринчи {module} тести бүттү: {band}.',
        '{module} боюнча баштапкы чекит — {band}.',
      ],
    },
    closers: {
      celebrate: [
        'Жакшы темп — токтобо!',
        'Бул чыныгы алдыга жылуу.',
        'Ушинтип улант.',
      ],
      support: [
        'Болот. Бир тест эч нерсени чечпейт.',
        'Кийинкиде кайтарасың — негиз бар.',
        'Бул көрсөткүч эмес. Эң негизгиси — машыгып жатасың.',
      ],
      steady: [
        'Туруктуулук жакшы. Эми жогору көтөрүлөлү.',
        'Деңгээлди кармап турасың. Эми аны жылдыралы.',
        'Негиз бар — эми так иштөө керек.',
      ],
      welcome: [
        'Жакшы старт — эми баштапкы чекит бар.',
        'Эң кыйын кадам — баштоо. Ал жасалды.',
        'Эми кайдан баштаарыбыз белгилүү.',
      ],
    },
  },

  uz: {
    greetingsNamed: [
      '{name},',
      "Xo'p, {name} —",
      '{name}, qisqacha:',
    ],
    greetingsPlain: [
      'Qisqacha:',
      'Demak —',
    ],
    observations: {
      progress: [
        "{module} o'sdi: {prev} → {band}.",
        "{module} bo'yicha progress bor — {band} (avval {prev}).",
        "{module}: o'tgan testga nisbatan {delta}, hozir {band}.",
      ],
      decline: [
        '{module} bugun pasaydi: {prev} edi, {band} bo‘ldi.',
        '{module}: {band} — avvalgi {prev} dan past.',
      ],
      plateau: [
        "{module} {band} darajasida turibdi — o'tgan safargidek.",
        '{module}: yana {band}.',
      ],
      first_test: [
        'Birinchi {module} testi tugadi: {band}.',
        "{module} bo'yicha boshlang'ich nuqta — {band}.",
      ],
    },
    closers: {
      celebrate: [
        "Zo'r sur'at — to'xtama!",
        'Bu haqiqiy oldinga qadam.',
        'Shu tarzda davom et.',
      ],
      support: [
        "Bo'ladi. Bitta test hech narsani hal qilmaydi.",
        'Keyingi safar qaytarib olasan — asos bor.',
        "Bu ko'rsatkich emas. Eng muhimi — mashq qilyapsan.",
      ],
      steady: [
        'Barqarorlik yaxshi. Endi yuqoriga ko‘tarilaylik.',
        'Darajani ushlab turibsan. Endi uni siljitaylik.',
        'Asos bor — endi aniq ish kerak.',
      ],
      welcome: [
        "Yaxshi boshlanish — endi boshlang'ich nuqta bor.",
        'Eng qiyin qadam — boshlash. U qilindi.',
        "Endi qayerdan boshlashimiz ma'lum.",
      ],
    },
  },
}
