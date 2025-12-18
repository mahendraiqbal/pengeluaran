# Aplikasi Tabungan

Aplikasi tabungan dengan tracking transaksi QRIS, transfer, dan penarikan dana.

## Tech Stack

- **Framework**: React Router v7 (formerly Remix)
- **Authentication**: Supabase
- **UI Style**: Neobrutalism
- **Deployment**: Vercel

## Setup

1. Install dependencies:
```bash
npm install
```

2. Setup Environment Variables:
   - Buat file `.env` di root directory
   - Tambahkan variabel berikut:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ```
   - Untuk mendapatkan Telegram Bot Token:
     1. Buka [@BotFather](https://t.me/botfather) di Telegram
     2. Kirim `/newbot` dan ikuti instruksi
     3. Salin token yang diberikan

3. Setup database schema di Supabase SQL Editor:
   - Jalankan script SQL yang ada di `supabase/schema.sql`

4. Run development server:
```bash
npm run dev
```

## Deployment ke Vercel

1. Push code ke GitHub
2. Import project di Vercel
3. Tambahkan environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `TELEGRAM_BOT_TOKEN`
4. Deploy!

## Fitur

- ✅ Authentication (Login/Register)
- ✅ Dashboard dengan overview saldo
- ✅ Tracking transaksi (QRIS, Transfer, Penarikan)
- ✅ History transaksi
- ✅ UI Neobrutalism yang modern
# pengeluaran
