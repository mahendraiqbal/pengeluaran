export async function sendTelegramNotification(
  telegramId: string,
  message: string
): Promise<boolean> {
  try {
    console.log("Sending Telegram notification:", { telegramId, messageLength: message.length });
    
    const response = await fetch("/api/telegram/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        telegramId: telegramId.trim(),
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Telegram API error:", error);
      return false;
    }

    const result = await response.json();
    console.log("Telegram API response:", result);
    return result.success === true;
  } catch (error) {
    console.error("Telegram notification error:", error);
    return false;
  }
}

