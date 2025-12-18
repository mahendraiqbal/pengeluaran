import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    
    if (!supabase) {
      setError("Supabase not initialized");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat login");
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
            <h2>Login</h2>
            
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
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
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", marginBottom: "1rem" }}
                disabled={loading}
              >
                {loading ? "Loading..." : "Login"}
              </button>

              <p style={{ textAlign: "center" }}>
                Belum punya akun?{" "}
                <Link to="/register" style={{ color: "var(--accent-primary)", fontWeight: 700 }}>
                  Daftar di sini
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
