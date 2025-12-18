import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { Wallet, Plus, TrendingUp, TrendingDown, ArrowDownCircle, BarChart3, Settings } from "lucide-react";

type Transaction = {
  id: string;
  type: "qris" | "transfer" | "withdrawal";
  amount: number;
  description: string | null;
  created_at: string;
};

type UserProfile = {
  id: string;
  full_name: string | null;
  balance: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);

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
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ 
                    padding: "0.75rem", 
                    border: "3px solid var(--border)",
                    background: "var(--accent-primary)"
                  }}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                      <span className={`badge badge-${transaction.type}`} style={{ marginRight: "0.5rem" }}>
                        {getTransactionLabel(transaction.type)}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      {transaction.description || "Tidak ada deskripsi"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      {formatDate(transaction.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  fontSize: "1.5rem", 
                  fontWeight: 900,
                  color: "var(--accent-primary)"
                }}>
                  -{formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
