import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WAWP_API_KEY = process.env.WAWP_API_KEY;
const WAWP_PHONE = process.env.WAWP_PHONE;

const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string };
    text?: string;
    photo?: Array<{ file_id: string; file_size?: number }>;
    caption?: string;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    const update: TelegramUpdate = req.body;
    const message = update.message;

    if (!message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat.id;
    const userId = message.from?.id;
    const text = message.text;
    const photo = message.photo;
    const caption = message.caption;

    // Handle /start command
    if (text === "/start") {
      await sendTelegramMessage(
        chatId,
        `🎉 *Selamat datang di Pengeluaran Bulanan Bot!*

📱 *Chat ID Anda:* \`${chatId}\`

Salin Chat ID di atas dan masukkan di Settings → Telegram Bot untuk menghubungkan akun Anda.

Cara pakai:
1️⃣ Screenshot resi transaksi Anda
2️⃣ Kirim foto resi ke sini
3️⃣ Bot akan baca & simpan otomatis
4️⃣ Notifikasi dikirim ke WhatsApp Anda

📝 *Command:*
/saldo - Cek saldo saat ini
/riwayat - Lihat 5 transaksi terakhir
/id - Tampilkan Chat ID Anda
/help - Bantuan

Kirim foto resi untuk mulai! 📸`
      );
      return res.status(200).json({ ok: true });
    }

    // Handle /id command
    if (text === "/id") {
      await sendTelegramMessage(
        chatId,
        `📱 *Chat ID Anda:* \`${chatId}\`

Salin Chat ID di atas dan masukkan di Settings → Telegram Bot untuk menghubungkan akun Anda.`
      );
      return res.status(200).json({ ok: true });
    }

    // Handle /help command
    if (text === "/help") {
      await sendTelegramMessage(
        chatId,
        `📖 *Bantuan Pengeluaran Bulanan Bot*

*Cara input transaksi:*
Kirim foto/screenshot resi dari bank atau e-wallet Anda. Bot akan otomatis membaca nominal dan menyimpannya.

*Atau ketik manual:*
\`qris 50000 Indomaret\`
\`transfer 100000 Gaji\`
\`tarik 200000 ATM\`

*Command:*
/saldo - Cek saldo
/riwayat - 5 transaksi terakhir
/start - Mulai ulang`
      );
      return res.status(200).json({ ok: true });
    }

    // Handle /saldo command
    if (text === "/saldo") {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("balance, full_name")
        .eq("telegram_id", userId)
        .single();

      if (!profile) {
        await sendTelegramMessage(
          chatId,
          "❌ Akun belum terhubung. Silakan hubungkan akun di web Pengeluaran Bulanan terlebih dahulu."
        );
      } else {
        const balance = formatCurrency(profile.balance || 0);
        await sendTelegramMessage(
          chatId,
          `💰 *Saldo ${profile.full_name || "Anda"}*\n\n${balance}`
        );
      }
      return res.status(200).json({ ok: true });
    }

    // Handle /riwayat command
    if (text === "/riwayat") {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("telegram_id", userId)
        .single();

      if (!profile) {
        await sendTelegramMessage(
          chatId,
          "❌ Akun belum terhubung. Silakan hubungkan akun di web Pengeluaran Bulanan terlebih dahulu."
        );
      } else {
        const { data: transactions } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!transactions || transactions.length === 0) {
          await sendTelegramMessage(chatId, "📭 Belum ada transaksi.");
        } else {
          let msg = "📋 *5 Transaksi Terakhir:*\n\n";
          transactions.forEach((t, i) => {
            const icon = t.type === "withdrawal" ? "🔴" : "🟢";
            const sign = t.type === "withdrawal" ? "-" : "+";
            msg += `${icon} ${sign}${formatCurrency(t.amount)}\n`;
            msg += `   ${t.description || t.type}\n\n`;
          });
          await sendTelegramMessage(chatId, msg);
        }
      }
      return res.status(200).json({ ok: true });
    }

    // Handle photo (receipt)
    if (photo && photo.length > 0) {
      await sendTelegramMessage(chatId, "🔍 Membaca resi...");

      // Get the largest photo
      const largestPhoto = photo[photo.length - 1];
      const fileId = largestPhoto.file_id;

      // Get file path from Telegram
      const fileResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
      );
      const fileData = await fileResponse.json();

      if (!fileData.ok) {
        await sendTelegramMessage(chatId, "❌ Gagal mengambil foto. Coba lagi.");
        return res.status(200).json({ ok: true });
      }

      const filePath = fileData.result.file_path;
      const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

      // For now, use caption or ask for manual input
      // Full OCR would require external service like Google Vision API
      let amount: number | null = null;
      let type: "qris" | "transfer" | "withdrawal" = "qris";
      let description = caption || "";

      // Try to parse amount from caption
      if (caption) {
        const parsed = parseTransactionText(caption);
        amount = parsed.amount;
        type = parsed.type;
        description = parsed.description;
      }

      if (!amount) {
        await sendTelegramMessage(
          chatId,
          `📸 Foto diterima!\n\nKarena OCR terbatas, mohon ketik detail transaksi:\n\n\`qris 50000 Indomaret\`\n\`transfer 100000 Gaji\`\n\`tarik 200000 ATM\``
        );
        return res.status(200).json({ ok: true });
      }

      // Save transaction
      const result = await saveTransaction(userId!, type, amount, description, chatId);
      return res.status(200).json({ ok: true });
    }

    // Handle text input for manual transaction
    if (text && !text.startsWith("/")) {
      const parsed = parseTransactionText(text);

      if (!parsed.amount) {
        await sendTelegramMessage(
          chatId,
          `❓ Format tidak dikenali.\n\nContoh:\n\`qris 50000 Indomaret\`\n\`transfer 100000 Gaji\`\n\`tarik 200000 ATM\``
        );
        return res.status(200).json({ ok: true });
      }

      await saveTransaction(userId!, parsed.type, parsed.amount, parsed.description, chatId);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return res.status(200).json({ ok: true });
  }
}

function parseTransactionText(text: string): {
  type: "qris" | "transfer" | "withdrawal";
  amount: number | null;
  description: string;
} {
  const lower = text.toLowerCase();
  let type: "qris" | "transfer" | "withdrawal" = "qris";
  let amount: number | null = null;
  let description = "";

  // Detect type
  if (lower.includes("tarik") || lower.includes("withdraw") || lower.includes("atm")) {
    type = "withdrawal";
  } else if (lower.includes("transfer") || lower.includes("tf") || lower.includes("kirim")) {
    type = "transfer";
  } else if (lower.includes("qris") || lower.includes("scan") || lower.includes("bayar")) {
    type = "qris";
  }

  // Extract amount
  const amountMatch = text.match(/(\d{1,3}(?:[.,]?\d{3})*)/);
  if (amountMatch) {
    const numStr = amountMatch[1].replace(/[.,]/g, "");
    amount = parseInt(numStr, 10);
    if (amount < 100) amount = null; // Too small, probably not valid
  }

  // Extract description (everything after the amount)
  const parts = text.split(/\d+/).filter(Boolean);
  if (parts.length > 1) {
    description = parts[parts.length - 1].trim();
  } else if (parts.length === 1) {
    description = parts[0].replace(/qris|transfer|tf|tarik|withdraw|bayar|scan/gi, "").trim();
  }

  return { type, amount, description };
}

async function saveTransaction(
  telegramId: number,
  type: "qris" | "transfer" | "withdrawal",
  amount: number,
  description: string,
  chatId: number
) {
  // Get user by telegram_id
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, balance, full_name")
    .eq("telegram_id", telegramId)
    .single();

  if (!profile) {
    await sendTelegramMessage(
      chatId,
      `❌ Akun belum terhubung.\n\nSilakan buka web Pengeluaran Bulanan → Settings → Hubungkan Telegram\n\nKode Anda: \`${telegramId}\``
    );
    return;
  }

  // Insert transaction
  const { error } = await supabase.from("transactions").insert({
    user_id: profile.id,
    type,
    amount,
    description: description || null,
  });

  if (error) {
    await sendTelegramMessage(chatId, "❌ Gagal menyimpan transaksi. Coba lagi.");
    return;
  }

  // Get updated balance
  const { data: updatedProfile } = await supabase
    .from("user_profiles")
    .select("balance")
    .eq("id", profile.id)
    .single();

  const newBalance = updatedProfile?.balance || 0;
  const typeLabels = { qris: "💳 QRIS", transfer: "💸 Transfer", withdrawal: "🏧 Penarikan" };
  const sign = type === "withdrawal" ? "-" : "+";

  // Send Telegram confirmation
  await sendTelegramMessage(
    chatId,
    `✅ *Transaksi Tersimpan!*

${typeLabels[type]}
💰 ${sign}${formatCurrency(amount)}
📝 ${description || "-"}

💵 Saldo: ${formatCurrency(newBalance)}`
  );

  // Send WhatsApp notification
  if (WAWP_API_KEY && WAWP_PHONE) {
    await sendWhatsAppNotification(type, amount, description, newBalance);
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

async function sendWhatsAppNotification(
  type: "qris" | "transfer" | "withdrawal",
  amount: number,
  description: string,
  balance: number
) {
  const typeLabels = {
    qris: "💳 Pembayaran QRIS",
    transfer: "💸 Transfer Masuk",
    withdrawal: "🏧 Penarikan Dana",
  };
  const sign = type === "withdrawal" ? "-" : "+";

  const message = `📊 *Pengeluaran Bulanan - Transaksi Baru*

${typeLabels[type]}

💰 Jumlah: ${sign}${formatCurrency(amount)}
📝 Keterangan: ${description || "-"}

💵 Saldo Saat Ini: ${formatCurrency(balance)}

_Tercatat via Telegram Bot_`;

  try {
    await fetch("https://wawp.net/api/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: WAWP_API_KEY,
        phone: WAWP_PHONE,
        message,
      }),
    });
  } catch (error) {
    console.error("WhatsApp notification error:", error);
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}
