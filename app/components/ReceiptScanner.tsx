import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";

type ScanResult = {
  amount: number | null;
  type: "qris" | "transfer" | "withdrawal";
  description: string;
};

type ReceiptScannerProps = {
  onScanComplete: (result: ScanResult) => void;
};

export default function ReceiptScanner({ onScanComplete }: ReceiptScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async () => {
    if (!preview) return;

    setIsScanning(true);
    setProgress(0);
    setError("");

    try {
      const Tesseract = await import("tesseract.js");
      
      const result = await Tesseract.recognize(preview, "ind+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      console.log("OCR Result:", text);

      const parsedResult = parseReceiptText(text);
      onScanComplete(parsedResult);
      
      setPreview(null);
      setProgress(0);
    } catch (err: any) {
      console.error("OCR Error:", err);
      setError("Gagal membaca resi. Coba foto yang lebih jelas.");
    } finally {
      setIsScanning(false);
    }
  };

  // Helper function untuk parse angka dengan format Indonesia/Internasional
  const parseAmount = (amountStr: string): number | null => {
    if (!amountStr) return null;
    
    // Bersihkan spasi
    amountStr = amountStr.trim();
    
    // Deteksi format Indonesia (titik = ribuan, koma = desimal)
    // Contoh: "29.000,00" atau "29.000"
    const indonesianFormat = /^(\d{1,3}(?:\.\d{3})*)(?:,(\d{2}))?$/;
    const indonesianMatch = amountStr.match(indonesianFormat);
    
    if (indonesianMatch) {
      // Format Indonesia: hapus titik (ribuan), ganti koma dengan titik (desimal)
      const mainPart = indonesianMatch[1].replace(/\./g, ""); // Hapus titik ribuan
      const decimalPart = indonesianMatch[2] || "00";
      const numStr = mainPart + "." + decimalPart;
      const num = parseFloat(numStr);
      return Math.round(num); // Bulatkan karena biasanya Rupiah tidak pakai desimal
    }
    
    // Deteksi format internasional (koma = ribuan, titik = desimal)
    // Contoh: "29,000.00" atau "29,000"
    const internationalFormat = /^(\d{1,3}(?:,\d{3})*)(?:\.(\d{2}))?$/;
    const internationalMatch = amountStr.match(internationalFormat);
    
    if (internationalMatch) {
      // Format internasional: hapus koma (ribuan), titik sudah benar untuk desimal
      const mainPart = internationalMatch[1].replace(/,/g, ""); // Hapus koma ribuan
      const decimalPart = internationalMatch[2] || "00";
      const numStr = mainPart + "." + decimalPart;
      const num = parseFloat(numStr);
      return Math.round(num);
    }
    
    // Format tanpa separator atau hanya angka
    // Contoh: "29000" atau "29000.00"
    const simpleMatch = amountStr.match(/^(\d+)(?:[.,](\d{2}))?$/);
    if (simpleMatch) {
      const mainPart = simpleMatch[1];
      const decimalPart = simpleMatch[2] || "00";
      const numStr = mainPart + "." + decimalPart;
      const num = parseFloat(numStr);
      return Math.round(num);
    }
    
    return null;
  };

  const parseReceiptText = (text: string): ScanResult => {
    const lowerText = text.toLowerCase();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    
    let amount: number | null = null;
    
    // Pattern untuk berbagai format bank
    const amountPatterns = [
      // BCA format: "NOMINAL TRANSFER Rp 29.000,00" atau "Rp 29.000,00"
      /nominal\s*(?:transfer)?\s*rp\.?\s*([\d.,]+)/gi,
      // Mandiri format: "Rp 10.000" atau "Total Transaksi Rp10.000"
      /(?:total\s*transaksi|total)\s*rp\.?\s*([\d.,]+)/gi,
      // Generic Rp format (prioritas tinggi)
      /rp\.?\s*([\d.,]+)/gi,
      // IDR format
      /idr\.?\s*([\d.,]+)/gi,
      // Jumlah/Nominal tanpa Rp
      /(?:jumlah|nominal)[:\s]*([\d.,]+)/gi,
      // Angka dengan format ribuan (1.000 atau 1,000)
      /([\d]{1,3}(?:[.,][\d]{3})+(?:[.,]\d{2})?)/g,
    ];

    // Cari nominal terbesar yang masuk akal (bukan nomor rekening/referensi)
    const foundAmounts: Array<{ amount: number; priority: number }> = [];
    
    for (let i = 0; i < amountPatterns.length; i++) {
      const pattern = amountPatterns[i];
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        // Ambil grup pertama atau seluruh match
        const numStr = match[1] || match[0];
        const parsedAmount = parseAmount(numStr);
        
        // Filter: minimal 1000, maksimal 1 miliar, bukan nomor panjang (rekening/ref)
        if (parsedAmount && parsedAmount >= 1000 && parsedAmount <= 1000000000) {
          // Priority: pattern yang lebih spesifik (index lebih kecil) lebih tinggi
          foundAmounts.push({ amount: parsedAmount, priority: i });
        }
      }
    }

    // Untuk transfer BCA, ambil nominal transfer (biasanya yang terbesar)
    // Untuk QRIS Mandiri, ambil total transaksi
    if (foundAmounts.length > 0) {
      // Urutkan berdasarkan priority (lebih spesifik lebih tinggi), lalu jumlah terbesar
      foundAmounts.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // Priority lebih kecil = lebih spesifik
        }
        return b.amount - a.amount; // Jumlah terbesar
      });
      
      // Jika ada nominal transfer spesifik, prioritaskan
      const nominalMatch = text.match(/nominal\s*transfer\s*rp\.?\s*([\d.,]+)/i);
      if (nominalMatch) {
        const nominalNum = parseAmount(nominalMatch[1]);
        if (nominalNum && nominalNum >= 1000) {
          amount = nominalNum;
        }
      }
      
      // Jika tidak ada, ambil total transaksi
      if (!amount) {
        const totalMatch = text.match(/total\s*transaksi\s*rp\.?\s*([\d.,]+)/i);
        if (totalMatch) {
          const totalNum = parseAmount(totalMatch[1]);
          if (totalNum && totalNum >= 1000) {
            amount = totalNum;
          }
        }
      }
      
      // Fallback ke nominal dengan priority tertinggi
      if (!amount) {
        amount = foundAmounts[0].amount;
      }
    }

    // Deteksi tipe transaksi
    let type: "qris" | "transfer" | "withdrawal" = "qris";
    
    if (lowerText.includes("m-transfer") || lowerText.includes("transfer") || 
        lowerText.includes("bi fast") || lowerText.includes("bifast") ||
        lowerText.includes("ke rekening")) {
      type = "transfer";
    } else if (lowerText.includes("qris") || lowerText.includes("qr bayar") || 
               lowerText.includes("pembayaran berhasil") || lowerText.includes("merchant")) {
      type = "qris";
    } else if (lowerText.includes("tarik tunai") || lowerText.includes("withdraw") || 
               lowerText.includes("atm")) {
      type = "withdrawal";
    }

    // Ekstrak keterangan/merchant
    let description = "";
    
    // Pattern untuk berbagai format bank
    const descriptionPatterns = [
      // Mandiri QRIS: "Penerima" diikuti nama merchant
      /penerima\s*\n?\s*([^\n]+)/i,
      // BCA Transfer: "Ke Rekening Tujuan" diikuti bank dan nama
      /ke\s*rekening\s*tujuan\s*\n?\s*\w+\s*\n?\s*[\d]+\s*\n?\s*([^\n]+)/i,
      // Generic patterns
      /(?:merchant|toko|kepada|nama\s*penerima)[:\s]*\n?\s*([^\n]+)/i,
      /(?:tujuan\s*transaksi)[:\s]*\n?\s*([^\n]+)/i,
    ];
    
    for (const pattern of descriptionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const desc = match[1].trim();
        // Filter out angka-angka panjang (nomor rekening, dll)
        if (desc && !/^\d+$/.test(desc) && desc.length > 2) {
          description = desc.substring(0, 100);
          break;
        }
      }
    }

    // Fallback: cari nama yang terlihat seperti nama orang/toko
    if (!description) {
      for (const line of lines) {
        // Skip lines yang hanya angka atau terlalu pendek
        if (line.length > 3 && !/^\d+$/.test(line) && 
            !line.toLowerCase().includes("rp") &&
            !line.toLowerCase().includes("bank") &&
            !line.toLowerCase().includes("transaksi") &&
            /^[A-Z]/.test(line)) {
          // Kemungkinan nama merchant/penerima (huruf kapital di awal)
          description = line.substring(0, 100);
          break;
        }
      }
    }

    // Deteksi bank untuk info tambahan
    let bankInfo = "";
    if (lowerText.includes("mandiri") || lowerText.includes("livin")) {
      bankInfo = "Mandiri";
    } else if (lowerText.includes("bca") || lowerText.includes("bank central asia")) {
      bankInfo = "BCA";
    } else if (lowerText.includes("bni")) {
      bankInfo = "BNI";
    } else if (lowerText.includes("bri")) {
      bankInfo = "BRI";
    } else if (lowerText.includes("ovo")) {
      bankInfo = "OVO";
    } else if (lowerText.includes("gopay")) {
      bankInfo = "GoPay";
    } else if (lowerText.includes("dana")) {
      bankInfo = "DANA";
    }

    // Gabungkan bank info dengan description jika ada
    if (bankInfo && description) {
      description = `[${bankInfo}] ${description}`;
    } else if (bankInfo && !description) {
      description = `Transaksi ${bankInfo}`;
    }

    return { amount, type, description };
  };

  const clearPreview = () => {
    setPreview(null);
    setError("");
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label className="label">📸 Scan Resi Transaksi (Opsional)</label>
      
      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "3px dashed var(--border)",
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            background: "white",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "var(--bg-secondary)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "white";
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
            <Camera size={32} />
            <Upload size={32} />
          </div>
          <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
            Klik untuk upload foto resi
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Screenshot atau foto resi transaksi dari bank/e-wallet
          </p>
        </div>
      ) : (
        <div style={{ border: "3px solid var(--border)", background: "white" }}>
          <div style={{ position: "relative" }}>
            <img
              src={preview}
              alt="Preview resi"
              style={{
                width: "100%",
                maxHeight: "300px",
                objectFit: "contain",
                display: "block",
              }}
            />
            {!isScanning && (
              <button
                type="button"
                onClick={clearPreview}
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  right: "0.5rem",
                  background: "var(--accent-primary)",
                  border: "2px solid var(--border)",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {isScanning && (
            <div style={{ padding: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontWeight: 700 }}>Membaca resi... {progress}%</span>
              </div>
              <div
                style={{
                  height: "8px",
                  background: "var(--bg-secondary)",
                  border: "2px solid var(--border)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "var(--accent-tertiary)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          {!isScanning && (
            <div style={{ padding: "1rem", display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={processImage}
                className="btn btn-tertiary"
                style={{ flex: 1 }}
              >
                🔍 Scan & Baca Resi
              </button>
              <button
                type="button"
                onClick={clearPreview}
                className="btn"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
