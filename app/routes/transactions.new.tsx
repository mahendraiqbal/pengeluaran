import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, CheckCircle, Share2 } from "lucide-react";
import ReceiptScanner from "~/components/ReceiptScanner";
import { sendWhatsAppNotification, formatTransactionMessage } from "~/lib/whatsapp";
import { sendTelegramNotification } from "~/lib/telegram";

export default function NewTransaction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isShared = searchParams.get("shared") === "true";
  
  const [user, setUser] = useState<any>(null);
  const [type, setType] = useState<"qris" | "transfer" | "withdrawal">("qris");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [sharedImage, setSharedImage] = useState<string | null>(null);

  const handleScanComplete = (result: { amount: number | null; type: "qris" | "transfer" | "withdrawal"; description: string }) => {
    if (result.amount) {
      setAmount(result.amount.toString());
    }
    setType(result.type);
    if (result.description) {
      setDescription(result.description);
    }
    setScanSuccess(true);
    setTimeout(() => setScanSuccess(false), 3000);
  };

  useEffect(() => {
    const supabaseUrl = (window as any).ENV?.SUPABASE_URL;
    const supabaseKey = (window as any).ENV?.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey);
      setSupabase(client);
      checkUser(client);
    }

    // Listen for share target messages from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SHARE_TARGET') {
          const { image, text } = event.data.data;
          if (image) {
            setSharedImage(image);
          }
          if (text) {
            setDescription(text);
          }
        }
      });
    }
  }, []);

  const checkUser = async (client: any) => {
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);
  };

  const sendNotificationsIfEnabled = async (amountNum: number) => {
    try {
      const savedSettings = localStorage.getItem("tabunganku_settings");
      if (!savedSettings) {
        console.log("No settings found in localStorage");
        return;
      }

      const settings = JSON.parse(savedSettings);
      console.log("Settings loaded:", { 
        waEnabled: settings.waEnabled, 
        hasInstanceId: !!settings.waInstanceId, 
        hasAccessToken: !!settings.waAccessToken,
        hasPhone: !!settings.waPhone 
      });

      // Get current balance and calculate monthly expense
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("balance, telegram_id")
        .eq("id", user.id)
        .single();

      const newBalance = profile?.balance || 0;

      // Calculate total expense for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { data: monthlyTransactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString())
        .lte("created_at", endOfMonth.toISOString());

      const monthlyExpense = monthlyTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Calculate total expense for current day
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const { data: dailyTransactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString());

      const dailyExpense = dailyTransactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const message = formatTransactionMessage(
        type,
        amountNum,
        description,
        newBalance,
        monthlyExpense,
        dailyExpense // sudah termasuk transaksi baru yang baru disimpan
      );

      // Send WhatsApp notification if enabled
      const instanceId = settings.waInstanceId || settings.waApiKey;
      const accessToken = settings.waAccessToken;
      
      if (settings.waEnabled && instanceId && accessToken && settings.waPhone) {
        console.log("Sending WhatsApp notification...");
        try {
          await sendWhatsAppNotification({
            phone: settings.waPhone,
            message,
            instanceId,
            accessToken,
          });
          console.log("WhatsApp notification sent successfully");
        } catch (err) {
          console.error("Failed to send WhatsApp notification:", err);
        }
      } else {
        console.log("WhatsApp notification skipped:", {
          waEnabled: settings.waEnabled,
          hasInstanceId: !!instanceId,
          hasAccessToken: !!accessToken,
          hasPhone: !!settings.waPhone
        });
      }

      // Send Telegram notification if enabled
      if (profile?.telegram_id) {
        console.log("Sending Telegram notification to:", profile.telegram_id);
        try {
          const telegramMessage = `✅ *Transaksi Tersimpan!*

${message}

_Tercatat via Web App_`;
          const telegramResult = await sendTelegramNotification(profile.telegram_id.toString(), telegramMessage);
          if (telegramResult) {
            console.log("Telegram notification sent successfully");
          } else {
            console.log("Telegram notification failed");
          }
        } catch (err) {
          console.error("Failed to send Telegram notification:", err);
        }
      } else {
        console.log("Telegram notification skipped - no telegram_id found");
      }
    } catch (err) {
      console.error("Failed to send notifications:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!supabase) {
      setError("Supabase not initialized");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }

    setLoading(true);

    try {
      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const { error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type,
          amount: amountNum,
          description: description || null,
          category: category || null,
          tags: tagsArray.length ? tagsArray : null,
        });

      if (error) throw error;

      // Send WhatsApp and Telegram notifications if enabled
      await sendNotificationsIfEnabled(amountNum);

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menambah transaksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="header">
        <nav className="nav">
          <Link to="/dashboard" style={{ fontSize: "1.5rem", fontWeight: 900, textDecoration: "none", color: "var(--text-primary)" }}>
            💰 Pengeluaran Bulanan
          </Link>
        </nav>
      </header>

      <div className="container">
        <div style={{ maxWidth: "600px", margin: "2rem auto" }}>
          <Link to="/dashboard" className="btn" style={{ marginBottom: "2rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <ArrowLeft size={20} />
            Kembali
          </Link>

          <div className="card">
            <h2>Tambah Transaksi Baru</h2>
            
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <ReceiptScanner onScanComplete={handleScanComplete} />

              {scanSuccess && (
                <div className="alert alert-success" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CheckCircle size={20} />
                  <span>Resi berhasil dibaca! Silakan review dan edit jika perlu.</span>
                </div>
              )}

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="label">Tipe Transaksi</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                  <button
                    type="button"
                    className={`btn ${type === "qris" ? "btn-tertiary" : ""}`}
                    onClick={() => setType("qris")}
                    style={{ width: "100%" }}
                  >
                    QRIS
                  </button>
                  <button
                    type="button"
                    className={`btn ${type === "transfer" ? "btn-secondary" : ""}`}
                    onClick={() => setType("transfer")}
                    style={{ width: "100%" }}
                  >
                    Transfer
                  </button>
                  <button
                    type="button"
                    className={`btn ${type === "withdrawal" ? "btn-primary" : ""}`}
                    onClick={() => setType("withdrawal")}
                    style={{ width: "100%" }}
                  >
                    Penarikan
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="label">Jumlah (Rp)</label>
                <input
                  type="number"
                  className="input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="50000"
                  step="1000"
                  min="0"
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="label">Deskripsi (Opsional)</label>
                <textarea
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Belanja di Indomaret"
                  rows={3}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="label">Kategori</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Pilih kategori (opsional)</option>
                  <option value="Makan">Makan</option>
                  <option value="Transport">Transport</option>
                  <option value="Belanja">Belanja</option>
                  <option value="Tagihan">Tagihan</option>
                  <option value="Hiburan">Hiburan</option>
                  <option value="Kesehatan">Kesehatan</option>
                  <option value="Pendidikan">Pendidikan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="label">Tag (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  className="input"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="contoh: kerja, keluarga, promo"
                />
              </div>

              <div style={{ 
                padding: "1rem", 
                border: "3px solid var(--border)", 
                background: type === "withdrawal" ? "var(--accent-primary)" : "var(--accent-tertiary)",
                marginBottom: "1.5rem"
              }}>
                <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
                  {type === "qris" && "💳 Pembayaran QRIS"}
                  {type === "transfer" && "💸 Transfer Masuk"}
                  {type === "withdrawal" && "🏧 Penarikan Dana"}
                </div>
                <div style={{ fontSize: "0.875rem" }}>
                  {type === "qris" && "Pengeluaran akan ditambahkan"}
                  {type === "transfer" && "Pengeluaran akan ditambahkan"}
                  {type === "withdrawal" && "Pengeluaran akan ditambahkan"}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={loading}
              >
                {loading ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
