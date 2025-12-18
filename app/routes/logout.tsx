import { useEffect } from "react";
import { useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const logout = async () => {
      const supabaseUrl = (window as any).ENV?.SUPABASE_URL;
      const supabaseKey = (window as any).ENV?.SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.auth.signOut();
      }
      navigate("/");
    };
    logout();
  }, [navigate]);

  return (
    <div className="container">
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <h2>Logging out...</h2>
      </div>
    </div>
  );
}
