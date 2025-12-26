import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, CheckCircle } from "lucide-react";

type Transaction = {
  id: string;
  type: "qris" | "transfer" | "withdrawal";
  amount: number;
  description: string | null;
  created_at: string;
};

export default function EditTransaction() {
  const navigate = useNavigate();
  const { transactionId } = useParams();

  const [user, setUser] = useState<any>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [type, setType] = useState<"qris" | "transfer" | "withdrawal">("qris");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState("");

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

    setUser(user);
    await loadTransaction(client, user.id, transactionId);
    setLoading(false);
  };

  const loadTransaction = async (client: any, userId: string, txId: string | undefined) => {
    if (!txId) {
      setError("ID transaksi tidak valid");
      return;
    }

    const { data, error: fetchError } = await client
      .from("transactions")
      .select("*")
      .eq("id", txId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !data) {
      setError("Transaksi tidak ditemukan");
      return;
    }

    setTransaction(data);
    setType(data.type);
    setAmount(data.amount.toString());
    setDescription(data.description || "");
    setCategory(data.category || "");
    setTagsInput(Array.isArray(data.tags) ? data.tags.join(", ") : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");

    if (!amount || parseFloat(amount) <= 0) {
      setError("Jumlah harus lebih dari 0");
      setSaving(false);
      return;
    }

    if (!supabase || !user || !transaction) {
      setError("Terjadi kesalahan");
      setSaving(false);
      return;
    }

    try {
      const amountNum = parseFloat(amount);

      // Calculate the difference for balance adjustment
      const oldAmount = transaction.amount;
      let balanceDifference = 0;

      if (transaction.type === "withdrawal") {
        balanceDifference = oldAmount; // Remove old withdrawal amount
      } else {
        balanceDifference = -oldAmount; // Remove old deposit amount
      }

      if (type === "withdrawal") {
        balanceDifference -= amountNum; // Subtract new withdrawal
      } else {
        balanceDifference += amountNum; // Add new deposit
      }

      // Update transaction
      const tagsArray = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          type,
          amount: amountNum,
          description,
          category: category || null,
          tags: tagsArray.length ? tagsArray : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .eq("user_id", user.id);

      if (updateError) {
        setError("Gagal memperbarui transaksi: " + updateError.message);
        setSaving(false);
        return;
      }

      // Update balance in user_profiles
      const { error: balanceError } = await supabase.rpc(
        "update_balance_after_edit",
        {
          balance_difference: balanceDifference,
          user_id: user.id,
        }
      ).catch(async () => {
        // Fallback if RPC doesn't exist
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("balance")
          .eq("id", user.id)
          .single();

        if (profile) {
          return await supabase
            .from("user_profiles")
            .update({ balance: profile.balance + balanceDifference })
            .eq("id", user.id);
        }
        return { error: null };
      });

      setSuccessMessage("Transaksi berhasil diperbarui!");
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setError("Terjadi kesalahan saat menyimpan transaksi");
      console.error(err);
    } finally {
      setSaving(false);
    }
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

  if (error && !transaction) {
    return (
      <div className="container">
        <div style={{ textAlign: "center", marginTop: "4rem" }}>
          <h2>{error}</h2>
          <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <nav className="nav">
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", color: "inherit" }}>
            <ArrowLeft size={24} />
            <span style={{ fontWeight: 700 }}>Kembali</span>
          </Link>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900 }}>Edit Transaksi</h1>
          <div></div>
        </nav>
      </header>

      <div className="container" style={{ maxWidth: "600px", margin: "2rem auto" }}>
        {successMessage && (
          <div style={{
            padding: "1rem",
            background: "var(--accent-success)",
            border: "3px solid var(--border)",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            fontWeight: 700
          }}>
            <CheckCircle size={24} />
            {successMessage}
          </div>
        )}

        {error && (
          <div style={{
            padding: "1rem",
            background: "var(--accent-danger)",
            border: "3px solid var(--border)",
            marginBottom: "1.5rem",
            color: "#d32f2f",
            fontWeight: 700
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card">
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "0.5rem" }}>
              Tipe Transaksi
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              {["qris", "transfer", "withdrawal"].map((t) => (
                <label
                  key={t}
                  style={{
                    padding: "1rem",
                    border: "3px solid " + (type === t ? "var(--border-active)" : "var(--border)"),
                    cursor: "pointer",
                    fontWeight: type === t ? 700 : 400,
                    textAlign: "center",
                  }}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t as any}
                    onChange={(e) => setType(e.target.value as any)}
                    style={{ display: "none" }}
                  />
                  {t === "qris" && "QRIS"}
                  {t === "transfer" && "Transfer"}
                  {t === "withdrawal" && "Penarikan"}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "0.5rem" }}>
              Jumlah (Rp)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Masukkan jumlah"
              step="100"
              min="0"
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "3px solid var(--border)",
                fontSize: "1rem",
                fontWeight: 700,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "0.5rem" }}>
              Deskripsi (Opsional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Masukkan deskripsi"
              rows={4}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "3px solid var(--border)",
                fontSize: "1rem",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: "0.5rem" }}>
              Kategori
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "3px solid var(--border)",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
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
            <label style={{ display: "block", fontWeight: 700, marginBottom: "0.5rem" }}>
              Tag (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="contoh: kerja, keluarga, promo"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "3px solid var(--border)",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "var(--accent-primary)",
                border: "3px solid var(--border)",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <Link
              to="/dashboard"
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                background: "var(--accent-secondary)",
                border: "3px solid var(--border)",
                fontWeight: 700,
                textAlign: "center",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              Batalkan
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
