/**
 * Telegram Dispatch Core for Athar Hub (أَثَر)
 * Supports dual-channel routing to @natharat06 and @nasmat1448
 * Handles both native MP3 audio broadcasting (`sendAudio`) and rich HTML text (`sendMessage`).
 */

export type ChannelTargetType = "NATHARAT" | "NASMAT" | "BOTH";

export interface TelegramDispatchPayload {
  content: string;
  isAudio?: boolean;
  mediaUrl?: string | null;
  audioTitle?: string | null;
  audioPerformer?: string | null;
  targetChannel: ChannelTargetType;
}

export interface TelegramDispatchResult {
  targetChannel: ChannelTargetType;
  success: boolean;
  dispatchedChannels: string[];
  results: {
    channel: string;
    success: boolean;
    messageId?: number;
    error?: string;
  }[];
}

const DEFAULT_NATHARAT = process.env.TELEGRAM_CHANNEL_NATHARAT || "@natharat06";
const DEFAULT_NASMAT = process.env.TELEGRAM_CHANNEL_NASMAT || "@nasmat1448";

/**
 * Resolves channel usernames based on target enum
 */
export function resolveTargetChannels(target: ChannelTargetType): string[] {
  switch (target) {
    case "NATHARAT":
      return [DEFAULT_NATHARAT];
    case "NASMAT":
      return [DEFAULT_NASMAT];
    case "BOTH":
    default:
      return [DEFAULT_NATHARAT, DEFAULT_NASMAT];
  }
}

/**
 * Format Arabic and classical text for Telegram HTML parse mode
 */
export function formatTelegramHtml(text: string, sourceName?: string): string {
  if (!text) return "";

  let formatted = text.trim();

  // If source tag is present, append a clean footer
  if (sourceName) {
    formatted += `\n\n— <b>المصدر:</b> <i>${sourceName}</i>`;
  }

  // Athar footer signature
  formatted += `\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n✨ <b>مَنَصَّة أَثَر | Athar Hub</b>`;

  return formatted;
}

/**
 * Dispatches a single post to Telegram (sendAudio or sendMessage)
 */
export async function sendToTelegramChannel(
  channel: string,
  payload: {
    content: string;
    isAudio?: boolean;
    mediaUrl?: string | null;
    audioTitle?: string | null;
    audioPerformer?: string | null;
  },
  botToken: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  try {
    const formattedContent = formatTelegramHtml(payload.content);

    if (payload.isAudio && payload.mediaUrl) {
      // Broadcast native MP3 using sendAudio
      const url = `https://api.telegram.org/bot${botToken}/sendAudio`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel,
          audio: payload.mediaUrl,
          caption: formattedContent,
          parse_mode: "HTML",
          title: payload.audioTitle || "تلاوة مباركة",
          performer: payload.audioPerformer || "أَثَر",
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        return {
          success: false,
          error: data.description || "فشل إرسال المقطع الصوتي",
        };
      }

      return {
        success: true,
        messageId: data.result?.message_id,
      };
    } else {
      // Broadcast rich HTML text using sendMessage
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channel,
          text: formattedContent,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        return {
          success: false,
          error: data.description || "فشل إرسال المنشور",
        };
      }

      return {
        success: true,
        messageId: data.result?.message_id,
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `خطأ في الاتصال بتليجرام: ${message}`,
    };
  }
}

/**
 * Main broadcaster engine: routes to 1 or 2 channels according to targetChannel
 */
export async function dispatchPost(
  payload: TelegramDispatchPayload
): Promise<TelegramDispatchResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  const channels = resolveTargetChannels(payload.targetChannel);
  const results: TelegramDispatchResult["results"] = [];

  // If no bot token is set, simulate successful broadcast for development mode
  if (!botToken || botToken === "your_bot_token_here") {
    for (const ch of channels) {
      results.push({
        channel: ch,
        success: true,
        messageId: Math.floor(Math.random() * 90000) + 10000,
        error: "وضع المحاكاة نشط (لم يتم تعيين TELEGRAM_BOT_TOKEN فعلي بعد)",
      });
    }

    return {
      targetChannel: payload.targetChannel,
      success: true,
      dispatchedChannels: channels,
      results,
    };
  }

  for (const ch of channels) {
    const res = await sendToTelegramChannel(ch, payload, botToken);
    results.push({
      channel: ch,
      success: res.success,
      messageId: res.messageId,
      error: res.error,
    });
  }

  const allSucceeded = results.length > 0 && results.every((r) => r.success);

  return {
    targetChannel: payload.targetChannel,
    success: allSucceeded,
    dispatchedChannels: results.filter((r) => r.success).map((r) => r.channel),
    results,
  };
}
