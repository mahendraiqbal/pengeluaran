type SendMessageParams = {
  phone: string;
  message: string;
  instanceId: string;
  accessToken: string;
};

export async function sendWhatsAppNotification({ phone, message, instanceId, accessToken }: SendMessageParams): Promise<boolean> {
  try {
    const response = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        message,
        instanceId,
        accessToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("WhatsApp API error:", error);
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error("WhatsApp notification error:", error);
    return false;
  }
}

export function formatTransactionMessage(
  type: "qris" | "transfer" | "withdrawal",
  amount: number,
  description: string,
  balance: number,
  monthlyExpense: number = 0,
  dailyExpense: number = 0
): string {
  const typeLabels = {
    qris: "💳 Pembayaran QRIS",
    transfer: "💸 Transfer",
    withdrawal: "🏧 Penarikan Dana",
  };

  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

  const formattedBalance = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(balance);

  const formattedMonthlyExpense = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(monthlyExpense);

  const formattedDailyExpense = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(dailyExpense);

  // Semua transaksi adalah pengeluaran
  const sign = "-";

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const currentMonth = monthNames[new Date().getMonth()];

  const warningDaily =
    dailyExpense > 50000
      ? `\n*Woi Nabung!! sehari udah 50 lebih katanya mau nikah woi!!*`
      : "";

  const warningMonthly =
    monthlyExpense > 2000000
      ? `\n*Lebih hemat goblog! katanya mau nikah!*`
      : "";

  return `📊 *Pengeluaran Bulanan - Transaksi Baru*

${typeLabels[type]}

💰 Jumlah: ${sign}${formattedAmount}
📝 Keterangan: ${description || "-"}

💵 Total Pengeluaran Saat Ini: ${formattedBalance}
📅 Pengeluaran Bulan ${currentMonth}: ${formattedMonthlyExpense}
📆 Pengeluaran Hari Ini: ${formattedDailyExpense}${warningDaily}${warningMonthly}

_Tercatat otomatis oleh Pengeluaran Bulanan_`;
}
