import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";
import { Eye, EyeOff } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    const supabaseUrl = (window as any).ENV?.SUPABASE_URL;
    const supabaseKey = (window as any).ENV?.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      setSupabase(createClient(supabaseUrl, supabaseKey));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!supabase) {
      setError("Supabase not initialized");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat registrasi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="header">
        <nav className="nav">
          <Link to="/" style={{ fontSize: "1.5rem", fontWeight: 900, textDecoration: "none", color: "var(--text-primary)" }}>
            💰 Pengeluaran Bulanan
          </Link>
        </nav>
      </header>

      <div className="container">
        <div style={{ maxWidth: "500px", margin: "4rem auto" }}>
          <div className="card">
            <h2>Daftar Akun Baru</h2>
            
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label className="label">Nama Lengkap</label>
                <input
                  type="text"
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="label">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{ paddingRight: "3rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                      color: "var(--text-secondary)"
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="label">Konfirmasi Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{ paddingRight: "3rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                      color: "var(--text-secondary)"
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginBottom: "1rem" }}
                disabled={loading}
              >
                {loading ? "Loading..." : "Daftar"}
              </button>

              <p style={{ textAlign: "center" }}>
                Sudah punya akun?{" "}
                <Link to="/login" style={{ color: "var(--accent-primary)", fontWeight: 700 }}>
                  Login di sini
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
