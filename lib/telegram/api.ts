import 'server-only'

// Minimal Telegram Bot API wrapper — the three calls the coach needs.
// Best-effort by design: Telegram being down must never break a digest run.

export const TELEGRAM_BOT_USERNAME = 'IeltsCampBot'

type InlineButton = { text: string; url?: string; callback_data?: string }

async function tg(method: string, payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error('[telegram] TELEGRAM_BOT_TOKEN is not set')
    return null
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!json.ok) {
      console.error(`[telegram] ${method} failed:`, json.description)
      return null
    }
    return json.result
  } catch (e) {
    console.error(`[telegram] ${method} error:`, e)
    return null
  }
}

/** Returns the sent message_id, or null on failure. */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  inlineKeyboard?: InlineButton[][],
): Promise<number | null> {
  const result = await tg('sendMessage', {
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
    ...(inlineKeyboard ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
  })
  return typeof result?.message_id === 'number' ? result.message_id : null
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await tg('answerCallbackQuery', { callback_query_id: callbackQueryId, ...(text ? { text } : {}) })
}
