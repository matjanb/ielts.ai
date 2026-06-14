import { NextRequest, NextResponse } from 'next/server'
import openai from '@/lib/openai/client'
import { gateAiRequest, err } from '@/lib/api/helpers'

function detectLanguage(text: string): 'kz' | 'ky' | 'uz' | 'ru' | 'en' {
  // Kazakh-specific letters (Ә, Ғ, Қ, Ң, Ө, Ұ, Ү, Ҳ, І)
  if (/[ӘәҒғҚқҢңӨөҰұҮүІі]/.test(text)) return 'kz'
  // Kyrgyz-specific letters (Ң, Ү, Ө — overlap with KZ, but Ж and context)
  // Kyrgyz also uses Ң, Ү, Ө but we can't easily distinguish from KZ w/o more context
  // Use UZ Latin alphabet detection first
  if (/\b(bu|bu[ln]|siz|men|biz|ular|ham|va|yoki|lekin|chunki|uchun|bilan|kerak)\b/i.test(text)) return 'uz'
  // Uzbek Cyrillic (Ўў, Ққ, Ғғ, Ҳҳ)
  if (/[ЎўҲҳ]/.test(text)) return 'uz'
  // Russian / Kyrgyz Cyrillic — default to Russian unless Kyrgyz-specific words found
  if (/[А-яЁё]/.test(text)) {
    // Kyrgyz-specific words
    if (/\b(мен|сен|ал|биз|силер|алар|бул|ошол|кандай|кайда|эмне|жок|ооба|болот)\b/i.test(text)) return 'ky'
    return 'ru'
  }
  return 'en'
}

const ROAST_SYSTEM: Record<string, string> = {
  en: `You are a brutally honest but hilarious IELTS roast master. Your job is to roast the user's IELTS English text in the style of a TikTok "AI Roast Me" video.

Rules:
- Be savage but educational — every roast must point to a specific real IELTS mistake (grammar, vocabulary, coherence, task achievement)
- Use IELTS band score references ("this is band 4 energy", "your vocabulary is giving band 5 vibes")
- Maximum 4-5 roast points, each 1-2 sentences
- End with ONE genuine tip to improve by half a band
- Tone: confident, punchy, Gen-Z humor, NOT mean-spirited
- Write in English`,

  ru: `Ты — безжалостный, но смешной IELTS-ростер. Твоя задача — прожарить текст пользователя в стиле TikTok "AI Roast Me".

Правила:
- Будь жёстким, но образовательным — каждая прожарка должна указывать на конкретную ошибку IELTS (грамматика, лексика, связность, task achievement)
- Используй ссылки на баллы IELTS ("это энергия band 4", "твой словарный запас — band 5 вайб")
- Максимум 4-5 прожарок, каждая 1-2 предложения
- В конце — ОДИН реальный совет для улучшения на полбалла
- Тон: уверенный, острый, Gen-Z юмор, но не жестокий
- Пиши на русском`,

  kz: `Сен — мейірімсіз бірақ күлкілі IELTS ростер. Тапсырмаң — пайдаланушының мәтінін TikTok "AI Roast Me" стилінде прожарить.

Ережелер:
- Қатал бол, бірақ білімді — әр прожарка нақты IELTS қатесін көрсетуі керек (грамматика, сөздік, байланыстылық)
- IELTS балдарын пайда ("бұл band 4 энергиясы", "сенің сөздік қорың band 5 вайб")
- Максимум 4-5 прожарка, әрбірі 1-2 сөйлем
- Соңында — жарты балға жақсарту үшін БІР нақты кеңес
- Тон: сенімді, өткір, Gen-Z юморы, бірақ жауыз емес
- Қазақ тілінде жаз`,

  ky: `Сен — мейирсиз, бирок күлкүлүү IELTS ростер. Тапшырмаң — колдонуучунун текстин TikTok "AI Roast Me" стилинде прожарить.

Эрежелер:
- Катаал бол, бирок билимдүү — ар бир прожарка конкреттүү IELTS катасын көрсөтүшү керек
- IELTS баллдарына шилтеме кыл ("бул band 4 энергиясы", "сенин сөздүгүң band 5 вайб")
- Максимум 4-5 прожарка, ар бири 1-2 сүйлөм
- Аягында — жарым балга жакшыртуу үчүн БИР чыныгы кеңеш
- Тон: ишенимдүү, курч, Gen-Z юмор, катаал эмес
- Кыргыз тилинде жаз`,

  uz: `Siz — shafqatsiz ammo kulgili IELTS roaster siz. Vazifangiz — foydalanuvchining matnini TikTok "AI Roast Me" uslubida roast qilish.

Qoidalar:
- Qattiq bo'ling, lekin ta'limiy — har bir roast aniq IELTS xatosini ko'rsatishi kerak (grammatika, lug'at, izchillik)
- IELTS ball ko'rsatkichlaridan foydalaning ("bu band 4 energiyasi", "lug'atingiz band 5 vayb")
- Maksimal 4-5 ta roast, har biri 1-2 jumla
- Oxirida — yarim ballga yaxshilash uchun BITTA haqiqiy maslahat
- Ton: ishonchli, o'tkir, Gen-Z hazil, ammo qo'pol emas
- O'zbek tilida yozing`,
}

export async function POST(req: NextRequest) {
  const { user, error: gate } = await gateAiRequest('roast')
  if (gate) return gate

  let body: { text: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON', 400)
  }

  const { text } = body
  if (!text?.trim()) return err('No text provided', 400)
  if (text.length > 2000) return err('Text too long (max 2000 chars)', 400)

  const lang = detectLanguage(text)
  const systemPrompt = ROAST_SYSTEM[lang]

  const userPrompt = lang === 'en'
    ? `Here is the IELTS text to roast:\n\n"${text}"`
    : lang === 'ru'
    ? `Вот текст для прожарки:\n\n"${text}"`
    : lang === 'kz'
    ? `Мінe прожарить керек мәтін:\n\n"${text}"`
    : lang === 'ky'
    ? `Мине прожарить керек текст:\n\n"${text}"`
    : `Mana roast qilish kerak bo'lgan matn:\n\n"${text}"`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.85,
    })

    const roast = completion.choices[0]?.message?.content ?? ''
    return NextResponse.json({ roast, lang })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'AI error'
    return err(msg, 500)
  }
}
