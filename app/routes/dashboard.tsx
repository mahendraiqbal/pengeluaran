import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { Wallet, Plus, TrendingUp, TrendingDown, ArrowDownCircle, BarChart3, Settings, Trash2, Edit2 } from "lucide-react";

type Transaction = {
  id: string;
  type: "qris" | "transfer" | "withdrawal";
  amount: number;
  description: string | null;
  category?: string | null;
  tags?: string[] | null;
  created_at: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  balance: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const supabaseUrl = (window as any).ENV?.SUPABASE_URL;
    const supabaseKey = (window as any).ENV?.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey);
      setSupabase(client);
      checkUser(client);
    }

    // Show success message if transaction was deleted
    if (searchParams.get("deleted") === "true") {
      setSuccessMessage("Transaksi berhasil dihapus!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  }, [searchParams]);

  const checkUser = async (client: any) => {
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);
    await loadProfile(client, user.id);
    await loadTransactions(client, user.id);
    setLoading(false);
  };

  const loadProfile = async (client: any, userId: string) => {
    const { data, error } = await client
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const loadTransactions = async (client: any, userId: string) => {
    const { data, error } = await client
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setTransactions(data);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "qris":
        return <TrendingUp size={24} />;
      case "transfer":
        return <TrendingUp size={24} />;
      case "withdrawal":
        return <ArrowDownCircle size={24} />;
      default:
        return <Wallet size={24} />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "qris":
        return "QRIS";
      case "transfer":
        return "Transfer";
      case "withdrawal":
        return "Penarikan";
      default:
        return type;
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!supabase || !user) return;
    
    setIsDeleting(true);
    try {
      // Get transaction details for balance adjustment
      const oldAmount = transaction.amount;
      let balanceDifference = 0;

      if (transaction.type === "withdrawal") {
        balanceDifference = oldAmount;
      } else {
        balanceDifference = -oldAmount;
      }

      // Delete transaction
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id)
        .eq("user_id", user.id);

      if (deleteError) {
        alert("Gagal menghapus transaksi");
        setIsDeleting(false);
        return;
      }

      // Update balance
      const { data: currentProfile } = await supabase
        .from("user_profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      if (currentProfile) {
        await supabase
          .from("user_profiles")
          .update({ balance: currentProfile.balance + balanceDifference })
          .eq("id", user.id);
      }

      // Update local state
      setTransactions(transactions.filter(t => t.id !== transaction.id));
      if (profile) {
        setProfile({
          ...profile,
          balance: (profile.balance || 0) + balanceDifference
        });
      }

      setDeleteConfirm(null);
      setSuccessMessage("Transaksi berhasil dihapus!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      alert("Terjadi kesalahan saat menghapus transaksi");
      console.error(err);
    } finally {
      setIsDeleting(false);
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

  return (
    <div>
      <header className="header">
        <nav className="nav">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900 }}>💰 Pengeluaran Bulanan</h1>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700 }}>
              Halo, {profile?.full_name || user?.email}
            </span>
            <Link to="/settings" className="btn" title="Pengaturan">
              <Settings size={18} />
            </Link>
            <Link to="/logout" className="btn">
              Logout
            </Link>
          </div>
        </nav>
      </header>

      <div className="container">
        <div style={{ marginBottom: "3rem" }}>
          <div className="stat-card" style={{ background: "var(--accent-secondary)" }}>
            <div className="stat-label">Pengeluaran Saat Ini</div>
            <div className="stat-value">{formatCurrency(profile?.balance || 0)}</div>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1rem", flexWrap: "wrap" }}>
              <Link to="/transactions/new" className="btn btn-primary">
                <Plus size={20} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.5rem" }} />
                Tambah Transaksi
              </Link>
              <Link to="/reports" className="btn btn-tertiary">
                <BarChart3 size={20} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.5rem" }} />
                Laporan Bulanan
              </Link>
            </div>
          </div>
        </div>

        {successMessage && (
          <div style={{
            padding: "1rem",
            background: "var(--accent-success)",
            border: "3px solid var(--border)",
            marginBottom: "1.5rem",
            fontWeight: 700
          }}>
            {successMessage}
          </div>
        )}

        <div style={{ marginBottom: "2rem" }}>
          <h2>Riwayat Transaksi</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <Wallet size={64} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
            <h3>Belum ada transaksi</h3>
            <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
              Mulai catat transaksi pertama Anda
            </p>
            <Link to="/transactions/new" className="btn btn-primary">
              Tambah Transaksi
            </Link>
          </div>
        ) : (
          <div>
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                  <div style={{ 
                    padding: "0.75rem", 
                    border: "3px solid var(--border)",
                    background: "var(--accent-primary)"
                  }}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                      <span className={`badge badge-${transaction.type}`} style={{ marginRight: "0.5rem" }}>
                        {getTransactionLabel(transaction.type)}
                      </span>
                      {transaction.category && (
                        <span className="badge" style={{ background: "var(--accent-tertiary)", marginRight: "0.5rem" }}>
                          {transaction.category}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      {transaction.description || "Tidak ada deskripsi"}
                    </div>
                    {transaction.tags && transaction.tags.length > 0 && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        Tag: {transaction.tags.join(", ")}
                      </div>
                    )}
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      {formatDate(transaction.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  fontSize: "1.5rem", 
                  fontWeight: 900,
                  color: "var(--accent-primary)",
                  marginRight: "1rem"
                }}>
                  -{formatCurrency(transaction.amount)}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <Link
                    to={`/transactions/edit/${transaction.id}`}
                    style={{
                      padding: "0.5rem",
                      background: "var(--accent-secondary)",
                      border: "3px solid var(--border)",
                      textDecoration: "none",
                      color: "inherit",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "40px",
                      minHeight: "40px",
                    }}
                    title="Edit transaksi"
                  >
                    <Edit2 size={18} />
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm(transaction)}
                    style={{
                      padding: "0.5rem",
                      background: "var(--accent-danger)",
                      border: "3px solid var(--border)",
                      textDecoration: "none",
                      color: "inherit",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "40px",
                      minHeight: "40px",
                      cursor: "pointer",
                    }}
                    title="Hapus transaksi"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}>
            <div style={{
              background: "white",
              border: "3px solid var(--border)",
              padding: "2rem",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "var(--shadow-hover)",
            }}>
              <h2 style={{ marginBottom: "1rem", color: "var(--accent-danger)" }}>
                Hapus Transaksi?
              </h2>
              <div style={{
                background: "var(--bg-secondary)",
                border: "3px solid var(--border)",
                padding: "1.5rem",
                marginBottom: "1.5rem",
              }}>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    Tipe Transaksi
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.125rem" }}>
                    {getTransactionLabel(deleteConfirm.type)}
                  </div>
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    Jumlah
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--accent-primary)" }}>
                    -{formatCurrency(deleteConfirm.amount)}
                  </div>
                </div>
                {deleteConfirm.description && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                      Deskripsi
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      {deleteConfirm.description}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    Tanggal
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                    {formatDate(deleteConfirm.created_at)}
                  </div>
                </div>
              </div>
              <p style={{ color: "var(--accent-danger)", fontWeight: 700, marginBottom: "1.5rem" }}>
                ⚠️ Tindakan ini tidak dapat dibatalkan. Data akan dihapus dari database.
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={() => handleDeleteTransaction(deleteConfirm)}
                  disabled={isDeleting}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    background: "var(--accent-danger)",
                    border: "3px solid var(--border)",
                    fontWeight: 700,
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    background: "var(--accent-secondary)",
                    border: "3px solid var(--border)",
                    fontWeight: 700,
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
