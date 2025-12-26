import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { createClient } from "@supabase/supabase-js";

export default function DeleteTransaction() {
  const navigate = useNavigate();
  const { transactionId } = useParams();
  const [error, setError] = useState("");
  const [supabase, setSupabase] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabaseUrl = (window as any).ENV?.SUPABASE_URL;
    const supabaseKey = (window as any).ENV?.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey);
      setSupabase(client);
      checkUserAndDelete(client);
    }
  }, [transactionId]);

  const checkUserAndDelete = async (client: any) => {
    const { data: { user } } = await client.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    setUser(user);
    await deleteTransaction(client, user.id, transactionId);
  };

  const deleteTransaction = async (client: any, userId: string, txId: string | undefined) => {
    if (!txId) {
      setError("ID transaksi tidak valid");
      return;
    }

    try {
      // Get transaction details first
      const { data: transaction, error: fetchError } = await client
        .from("transactions")
        .select("*")
        .eq("id", txId)
        .eq("user_id", userId)
        .single();

      if (fetchError || !transaction) {
        setError("Transaksi tidak ditemukan");
        return;
      }

      // Calculate balance adjustment
      let balanceDifference = 0;
      if (transaction.type === "withdrawal") {
        balanceDifference = transaction.amount; // Add back withdrawn amount
      } else {
        balanceDifference = -transaction.amount; // Remove deposited amount
      }

      // Delete transaction
      const { error: deleteError } = await client
        .from("transactions")
        .delete()
        .eq("id", txId)
        .eq("user_id", userId);

      if (deleteError) {
        setError("Gagal menghapus transaksi");
        return;
      }

      // Update balance
      const { data: profile } = await client
        .from("user_profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      if (profile) {
        await client
          .from("user_profiles")
          .update({ balance: profile.balance + balanceDifference })
          .eq("id", userId);
      }

      // Redirect back to dashboard
      navigate("/dashboard?deleted=true");
    } catch (err) {
      setError("Terjadi kesalahan saat menghapus transaksi");
      console.error(err);
    }
  };

  if (error) {
    return (
      <div className="container">
        <div style={{ textAlign: "center", marginTop: "4rem" }}>
          <h2 style={{ color: "var(--accent-danger)" }}>{error}</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn btn-primary"
            style={{ marginTop: "1rem" }}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <h2>Menghapus transaksi...</h2>
      </div>
    </div>
  );
}
