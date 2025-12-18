import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Bell, Phone, Key, CheckCircle, AlertCircle, MessageCircle, Link2 } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [supabase, setSupabase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [waEnabled, setWaEnabled] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waInstanceId, setWaInstanceId] = useState("");
  const [waAccessToken, setWaAccessToken] = useState("");
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [telegramInput, setTelegramInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabaseUrl = (window as any).ENV?.SUPABASE_URL;
    const supabaseKey = (window as any).ENV?.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey);
      setSupabase(client);
      checkUser(client);
    }
  }, []);

  const checkUser = async (client: any) => {
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    setUserId(user.id);
    loadSettings();
    await loadTelegramId(client, user.id);
    setLoading(false);
  };

  const loadTelegramId = async (client: any, id: string) => {
    try {
      const { data, error } = await client
        .from("user_profiles")
        .select("telegram_id")
        .eq("id", id)
        .single();
      
      if (error) {
        console.error("Error loading Telegram ID:", error);
        return;
      }
      
      if (data?.telegram_id) {
        console.log("Loaded Telegram ID:", data.telegram_id);
        setTelegramId(data.telegram_id.toString());
      } else {
        console.log("No Telegram ID found for user");
      }
    } catch (err) {
      console.error("Failed to load Telegram ID:", err);
    }
  };

  const connectTelegram = async () => {
    if (!supabase || !userId || !telegramInput) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const telegramIdNum = parseInt(telegramInput.trim());
      if (isNaN(telegramIdNum)) {
        throw new Error("Telegram ID harus berupa angka");
      }

      console.log("Saving Telegram ID:", telegramIdNum, "for user:", userId);
      
      const { error, data } = await supabase
        .from("user_profiles")
        .update({ telegram_id: telegramIdNum })
        .eq("id", userId)
        .select("telegram_id")
        .single();

      if (error) {
        console.error("Error saving Telegram ID:", error);
        throw error;
      }

      console.log("Telegram ID saved successfully:", data);

      setTelegramId(telegramInput.trim());
      setTelegramInput("");
      setMessage({ type: "success", text: "Telegram berhasil dihubungkan!" });
    } catch (err: any) {
      console.error("Failed to connect Telegram:", err);
      setMessage({ type: "error", text: err.message || "Gagal menghubungkan Telegram" });
    } finally {
      setSaving(false);
    }
  };

  const disconnectTelegram = async () => {
    if (!supabase || !userId) return;
    
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({ telegram_id: null })
        .eq("id", userId);

      if (error) throw error;

      setTelegramId(null);
      setMessage({ type: "success", text: "Telegram berhasil diputus" });
    } catch (err: any) {
      setMessage({ type: "error", text: "Gagal memutus Telegram" });
    } finally {
      setSaving(false);
    }
  };

  const loadSettings = () => {
    const saved = localStorage.getItem("tabunganku_settings");
    if (saved) {
      const settings = JSON.parse(saved);
      setWaEnabled(settings.waEnabled || false);
      setWaPhone(settings.waPhone || "");
      // Support both old format (waApiKey) and new format (waInstanceId, waAccessToken)
      setWaInstanceId(settings.waInstanceId || settings.waApiKey || "");
      setWaAccessToken(settings.waAccessToken || "");
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const normalizedPhone = waPhone.replace(/\D/g, "");
      
      const settings = {
        waEnabled,
        waPhone: normalizedPhone,
        waInstanceId: waInstanceId.trim(),
        waAccessToken: waAccessToken.trim(),
      };

      console.log("Saving settings:", { ...settings, waAccessToken: "***" });
      localStorage.setItem("tabunganku_settings", JSON.stringify(settings));
      
      // Verify settings were saved
      const saved = localStorage.getItem("tabunganku_settings");
      if (!saved) {
        throw new Error("Gagal menyimpan ke localStorage");
      }
      
      const savedSettings = JSON.parse(saved);
      console.log("Settings saved successfully:", { 
        ...savedSettings, 
        waAccessToken: "***" 
      });

      // Test connection only if WhatsApp is enabled and all fields are filled
      if (waEnabled && waInstanceId.trim() && waAccessToken.trim() && normalizedPhone) {
        const testResult = await testWhatsAppConnection();
        if (!testResult) {
          setMessage({ type: "error", text: "Gagal menghubungi WhatsApp API. Periksa Instance ID dan Access Token Anda." });
          setSaving(false);
          return;
        }
      }

      setMessage({ type: "success", text: "Pengaturan berhasil disimpan!" });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: error.message || "Gagal menyimpan pengaturan" });
    } finally {
      setSaving(false);
    }
  };

  const testWhatsAppConnection = async (): Promise<boolean> => {
    try {
      const phoneNumber = waPhone.replace(/\D/g, "");
      
      console.log("Testing WhatsApp connection with:", {
        instanceId: waInstanceId,
        accessToken: waAccessToken ? waAccessToken.substring(0, 10) + "..." : "missing",
        phone: phoneNumber
      });
      
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: waInstanceId.trim(),
          accessToken: waAccessToken.trim(),
          phone: phoneNumber,
          message: "🔔 Test notifikasi dari Pengeluaran Bulanan - Koneksi berhasil!",
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("WhatsApp API error:", errorData);
        
        // Tampilkan error detail yang lebih informatif
        let errorMessage = errorData.error || errorData.details?.error || "Unknown error";
        if (errorData.details) {
          if (typeof errorData.details === 'string') {
            errorMessage += `: ${errorData.details}`;
          } else if (errorData.details.message) {
            errorMessage += `: ${errorData.details.message}`;
          }
        }
        
        setMessage({ 
          type: "error", 
          text: `Gagal: ${errorMessage}` 
        });
        return false;
      }
      
      const result = await response.json();
      return result.success === true;
    } catch (error: any) {
      console.error("WhatsApp connection error:", error);
      setMessage({ 
        type: "error", 
        text: `Error: ${error?.message || "Gagal menghubungi server"}` 
      });
      return false;
    }
  };

  const sendTestMessage = async () => {
    setSaving(true);
    setMessage(null);

    const success = await testWhatsAppConnection();
    if (success) {
      setMessage({ type: "success", text: "Pesan test berhasil dikirim ke WhatsApp!" });
    } else {
      setMessage({ type: "error", text: "Gagal mengirim pesan. Periksa API Key dan nomor telepon." });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: "center", marginTop: "4rem" }}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

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
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Link to="/dashboard" className="btn" style={{ marginBottom: "2rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <ArrowLeft size={20} />
            Kembali
          </Link>

          <div className="card">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Bell size={28} />
              Pengaturan Notifikasi
            </h2>

            {message && (
              <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {message.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                {message.text}
              </div>
            )}

            <div style={{ marginBottom: "2rem" }}>
              <div style={{ 
                padding: "1rem", 
                background: "var(--bg-secondary)", 
                border: "3px solid var(--border)",
                marginBottom: "1.5rem"
              }}>
                <h3 style={{ marginBottom: "0.5rem" }}>📱 WhatsApp Notification</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
                  Dapatkan notifikasi setiap kali transaksi tercatat. Menggunakan layanan wawp.net
                </p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={waEnabled}
                    onChange={(e) => setWaEnabled(e.target.checked)}
                    style={{ width: "24px", height: "24px", cursor: "pointer" }}
                  />
                  <span style={{ fontWeight: 700 }}>Aktifkan Notifikasi WhatsApp</span>
                </label>
              </div>

              {waEnabled && (
                <>
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label className="label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Phone size={18} />
                      Nomor WhatsApp
                    </label>
                    <input
                      type="tel"
                      className="input"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      placeholder="628123456789"
                    />
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                      Format: 628xxx (tanpa + atau 0 di depan)
                    </p>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label className="label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Key size={18} />
                      Instance ID wawp.net
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={waInstanceId}
                      onChange={(e) => setWaInstanceId(e.target.value)}
                      placeholder="Contoh: 884BFCECD1F7"
                    />
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                      Instance ID dari akun wawp.net Anda
                    </p>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label className="label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Key size={18} />
                      Access Token wawp.net
                    </label>
                    <input
                      type="password"
                      className="input"
                      value={waAccessToken}
                      onChange={(e) => setWaAccessToken(e.target.value)}
                      placeholder="Masukkan Access Token dari wawp.net"
                    />
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                      Dapatkan Instance ID dan Access Token di{" "}
                      <a href="https://wawp.net/account/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-primary)", fontWeight: 700 }}>
                        wawp.net/account
                      </a>
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={sendTestMessage}
                    disabled={saving || !waInstanceId || !waAccessToken || !waPhone}
                    style={{ marginBottom: "1rem", width: "100%" }}
                  >
                    {saving ? "Mengirim..." : "🔔 Kirim Pesan Test"}
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={saveSettings}
              disabled={saving}
              style={{ width: "100%" }}
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>

          <div className="card" style={{ marginTop: "2rem" }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MessageCircle size={28} />
              Telegram Bot
            </h2>

            <div style={{ 
              padding: "1rem", 
              background: "var(--bg-secondary)", 
              border: "3px solid var(--border)",
              marginBottom: "1.5rem"
            }}>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
                Kirim foto resi ke Telegram Bot untuk input transaksi otomatis!
              </p>
            </div>

            {telegramId ? (
              <div>
                <div style={{ 
                  padding: "1rem", 
                  background: "#90ee90", 
                  border: "3px solid var(--border)",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  <CheckCircle size={20} />
                  <span style={{ fontWeight: 700 }}>Telegram terhubung!</span>
                  <span style={{ marginLeft: "auto", fontFamily: "monospace" }}>ID: {telegramId}</span>
                </div>
                <button
                  type="button"
                  className="btn"
                  onClick={disconnectTelegram}
                  disabled={saving}
                  style={{ width: "100%" }}
                >
                  Putuskan Koneksi Telegram
                </button>
              </div>
            ) : (
              <div>
                <div style={{ 
                  padding: "1rem", 
                  background: "var(--bg-secondary)", 
                  border: "3px solid var(--border)",
                  marginBottom: "1.5rem"
                }}>
                  <p style={{ margin: 0, fontWeight: 700, marginBottom: "0.5rem" }}>📋 Cara Mendapatkan Telegram Chat ID:</p>
                  <ol style={{ paddingLeft: "1.5rem", lineHeight: "2", margin: 0 }}>
                    <li>Buka Telegram, cari <strong>@TabunganKu2405_Bot</strong></li>
                    <li>Kirim <code>/start</code> atau <code>/id</code> ke bot</li>
                    <li>Bot akan mengirim Chat ID Anda (berupa angka)</li>
                    <li>Salin angka tersebut dan masukkan di bawah</li>
                  </ol>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    <strong>Catatan:</strong> Chat ID berbeda dengan username (@subagiyu). Chat ID berupa angka yang diberikan bot saat Anda kirim <code>/start</code> atau <code>/id</code>.
                  </p>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--accent-primary)", fontWeight: 700 }}>
                    💡 Tips: Kirim <code>/id</code> ke bot untuk mendapatkan Chat ID Anda kapan saja!
                  </p>
                </div>
                
                <ol style={{ paddingLeft: "1.5rem", lineHeight: "2", marginBottom: "1.5rem", display: "none" }}>
                  <li>Buka Telegram, cari <strong>@TabunganKu2405_Bot</strong></li>
                  <li>Kirim <code>/start</code> ke bot</li>
                  <li>Bot akan kasih kode ID Anda</li>
                  <li>Masukkan kode ID di bawah ini</li>
                </ol>

                <div style={{ marginBottom: "1rem" }}>
                  <label className="label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Link2 size={18} />
                    Telegram ID
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={telegramInput}
                    onChange={(e) => setTelegramInput(e.target.value)}
                    placeholder="Contoh: 123456789"
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={connectTelegram}
                  disabled={saving || !telegramInput}
                  style={{ width: "100%" }}
                >
                  {saving ? "Menghubungkan..." : "🔗 Hubungkan Telegram"}
                </button>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: "2rem" }}>
            <h3>📲 Cara Pakai Telegram Bot</h3>
            <ol style={{ paddingLeft: "1.5rem", lineHeight: "2" }}>
              <li>Hubungkan Telegram di atas</li>
              <li>Screenshot resi transaksi</li>
              <li>Kirim foto ke <strong>@TabunganKu2405_Bot</strong></li>
              <li>Atau ketik: <code>qris 50000 Indomaret</code></li>
              <li>Transaksi tersimpan + notif WA dikirim!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
