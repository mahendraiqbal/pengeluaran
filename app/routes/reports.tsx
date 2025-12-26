import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Download } from "lucide-react";

type Transaction = {
  id: string;
  type: "qris" | "transfer" | "withdrawal";
  amount: number;
  description: string | null;
  category?: string | null;
  tags?: string[] | null;
  created_at: string;
};

type MonthlyReport = {
  month: string;
  year: number;
  income: number;
  expense: number;
  balance: number;
  transactions: Transaction[];
};

export default function Reports() {
  const navigate = useNavigate();
  const [supabase, setSupabase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(new Date().getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);

  useEffect(() => {
    const supabaseUrl = (window as any).ENV?.SUPABASE_URL;
    const supabaseKey = (window as any).ENV?.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey);
      setSupabase(client);
      checkUser(client);
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      loadReport();
    }
  }, [selectedYear, selectedMonthNum, supabase]);

  const checkUser = async (client: any) => {
    const { data: { user } } = await client.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    loadReportWithClient(client);
  };

  const loadReport = async () => {
    if (!supabase) return;
    await loadReportWithClient(supabase);
  };

  const loadReportWithClient = async (client: any) => {
    setLoading(true);

    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const year = selectedYear;
    const month = selectedMonthNum;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const { data, error } = await client
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (data) {
      // Semua transaksi adalah pengeluaran
      const expense = data
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0);

      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];

      setReport({
        month: monthNames[month - 1],
        year,
        income: 0, // Tidak ada pemasukan
        expense,
        balance: expense, // Total pengeluaran
        transactions: data,
      });
    }

    setLoading(false);
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
    });
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "qris": return "QRIS";
      case "transfer": return "Transfer";
      case "withdrawal": return "Penarikan";
      default: return type;
    }
  };

  const exportToCSV = () => {
    if (!report) return;

    // UTF-8 BOM agar Excel membaca karakter Indonesia dengan benar
    const BOM = "\uFEFF";

    // Escape agar nilai aman untuk CSV
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const lines: string[] = [];

    // Judul
    lines.push(`Laporan Pengeluaran - ${report.month} ${report.year}`);
    lines.push("");

    // Setiap transaksi ditulis vertikal (key, value) seperti contoh
    report.transactions.forEach((t, i) => {
      const labelType = "Tipe Transaksi";
      const labelAmount = "Jumlah";
      const labelDesc = "Deskripsi";
      const labelDate = "Tanggal";

      const datePart = new Date(t.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const timePart = new Date(t.created_at).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Header kecil opsional untuk memisahkan transaksi
      lines.push(esc(`Transaksi #${i + 1}`));
      // Baris-baris key/value
      lines.push(`${esc(labelType)},${esc(getTransactionLabel(t.type))}`);
      lines.push(`${esc("Kategori")},${esc(t.category || "-")}`);
      lines.push(`${esc(labelAmount)},${esc("-" + formatCurrency(t.amount))}`);
      lines.push(`${esc("Tag")},${esc(Array.isArray(t.tags) && t.tags.length ? t.tags.join(", ") : "-")}`);
      lines.push(`${esc(labelDesc)},${esc(t.description || "-")}`);
      lines.push(`${esc(labelDate)},${esc(`${datePart}, ${timePart}`)}`);
      lines.push(""); // spasi antar transaksi
    });

    const csvContent = BOM + lines.join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const ym = `${selectedYear}-${String(selectedMonthNum).padStart(2, "0")}`;
    link.download = `Laporan-Pengeluaran-${ym}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  };

  const generateMonthOptions = () => {
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return monthNames.map((label, idx) => ({ value: idx + 1, label }));
  };

  const generateYearOptions = () => {
    const options: { value: number; label: string }[] = [];
    for (let y = 2025; y <= 2030; y++) {
      options.push({ value: y, label: String(y) });
    }
    return options;
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
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <Link to="/dashboard" className="btn" style={{ marginBottom: "2rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <ArrowLeft size={20} />
            Kembali
          </Link>

          <div className="card" style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Calendar size={28} />
                Laporan Bulanan
              </h2>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <select
                  className="input"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ width: "auto", minWidth: "140px" }}
                >
                  {generateYearOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={selectedMonthNum}
                  onChange={(e) => setSelectedMonthNum(Number(e.target.value))}
                  style={{ width: "auto", minWidth: "160px" }}
                >
                  {generateMonthOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={exportToCSV}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <Download size={18} />
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {report && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="stat-card" style={{ background: "var(--accent-primary)" }}>
                  <TrendingDown size={32} style={{ margin: "0 auto" }} />
                  <div className="stat-label">Total Pengeluaran</div>
                  <div className="stat-value" style={{ color: "white" }}>
                    {formatCurrency(report.expense)}
                  </div>
                </div>

                <div className="stat-card" style={{ background: "var(--accent-tertiary)" }}>
                  <div className="stat-label">Pengeluaran Bulan Ini</div>
                  <div className="stat-value">
                    {formatCurrency(report.balance)}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: "1.5rem" }}>
                  Transaksi {report.month} {report.year}
                  <span style={{ fontWeight: 400, fontSize: "1rem", marginLeft: "0.5rem" }}>
                    ({report.transactions.length} transaksi)
                  </span>
                </h3>

                {report.transactions.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                    Tidak ada transaksi di bulan ini
                  </div>
                ) : (
                  <div>
                    {report.transactions.map((transaction) => (
                      <div key={transaction.id} className="transaction-item">
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                            <span className={`badge badge-${transaction.type}`}>
                              {getTransactionLabel(transaction.type)}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                            {transaction.description || "Tidak ada deskripsi"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {formatDate(transaction.created_at)}
                          </div>
                        </div>
                        <div style={{
                          fontSize: "1.25rem",
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
