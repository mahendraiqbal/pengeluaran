import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function ShareTarget() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/transactions/new?shared=true");
  }, [navigate]);

  return (
    <div className="container">
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <h2>Memproses resi...</h2>
        <p>Mohon tunggu sebentar</p>
      </div>
    </div>
  );
}
