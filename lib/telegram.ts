const defaultPublicChannelId = "@totosite_org";

export function normalizeTelegramChatId(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const [, username] = url.pathname.split("/");

    if (url.hostname === "t.me" && username) {
      return username.startsWith("@") ? username : `@${username}`;
    }
  } catch {
    // Plain chat IDs and @usernames are handled below.
  }

  return trimmed;
}

export function getApprovedContentChannelId() {
  return (
    normalizeTelegramChatId(process.env.TELEGRAM_APPROVED_CONTENT_CHANNEL_ID) ||
    normalizeTelegramChatId(process.env.TELEGRAM_CHANNEL_ID) ||
    defaultPublicChannelId
  );
}

export function getAdminTelegramChatId() {
  return (
    normalizeTelegramChatId(process.env.TELEGRAM_CHAT_ID) ||
    normalizeTelegramChatId(process.env.TELEGRAM_APPROVED_CONTENT_CHANNEL_ID) ||
    normalizeTelegramChatId(process.env.TELEGRAM_CHANNEL_ID) ||
    defaultPublicChannelId
  );
}
