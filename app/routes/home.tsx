import { Link } from "react-router";
import { Wallet, TrendingUp, Shield } from "lucide-react";

export default function Home() {
  return (
    <div>
      <header className="header">
        <nav className="nav">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 900 }}>💰 Pengeluaran Bulanan</h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            <Link to="/login" className="btn">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Daftar
            </Link>
          </div>
        </nav>
      </header>

      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h1 style={{ fontSize: "4rem", marginBottom: "1rem" }}>
            Kelola Tabungan dengan Mudah
          </h1>
          <p style={{ fontSize: "1.25rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
            Catat setiap transaksi QRIS, transfer, dan penarikan dana dalam satu aplikasi
          </p>
          <Link to="/register" className="btn btn-primary" style={{ fontSize: "1.25rem", padding: "1rem 2rem" }}>
            Mulai Sekarang
          </Link>
        </div>

        <div className="grid grid-3">
          <div className="card">
            <div style={{ textAlign: "center" }}>
              <Wallet size={48} style={{ margin: "0 auto 1rem" }} />
              <h3>Tracking Otomatis</h3>
              <p>Catat semua transaksi QRIS, transfer, dan penarikan dana secara otomatis</p>
            </div>
          </div>

          <div className="card">
            <div style={{ textAlign: "center" }}>
              <TrendingUp size={48} style={{ margin: "0 auto 1rem" }} />
              <h3>Dashboard Lengkap</h3>
              <p>Lihat saldo dan riwayat transaksi dalam dashboard yang mudah dipahami</p>
            </div>
          </div>

          <div className="card">
            <div style={{ textAlign: "center" }}>
              <Shield size={48} style={{ margin: "0 auto 1rem" }} />
              <h3>Aman & Terpercaya</h3>
              <p>Data Anda dilindungi dengan enkripsi dan authentication yang kuat</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
