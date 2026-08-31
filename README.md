# 🌻 SFL Resource & Trade Calculator

A high-performance calculator, daily yield tracker, and trade ledger for **Sunflower Land**.

---

## ⚡ Key Features

1. **📊 Marketplace Trade Ledger & Calendar**
   - **4 Time-Horizon Views**: 📅 Day, 📊 Week (Mon–Sun), 🗓️ Month, 📈 3-Month Quarter.
   - **Responsive Trend Charts**: Pure SVG daily & weekly net profit visualizations.
   - **Exact Net Accounting**: Subtracts exact in-game marketplace tax (`trade.tax`) from sales.
   - **TiDB Cloud Archiving**: Permanently saves completed trades with duplicate prevention.

2. **🔄 4x Daily Background Auto-Sync**
   - **Schedule**: Automatically runs at **00:33, 06:33, 12:33, and 18:33 UTC**.
   - **Rate Limiting**: 13-second gap between farm requests and 3 retries on failures.
   - **Webhook Endpoint**: `GET /api/cron/sync-trades?key=YOUR_CRON_KEY`.

3. **🌾 Daily Crop Tracker & Multipliers**
   - Live average land yield multipliers from `sfl.world`.
   - Automated 21:50 UTC snapshots & 22:00 UTC daily yield calculations.

4. **🎁 NPC Gifts & Deliveries**
   - Friendship points milestone tracker & recurring reward loops.

---

## 🛠️ Environment Variables

| Variable | Description |
| :--- | :--- |
| `TIDB_DATABASE_URL` | TiDB Cloud connection string (`mysql://user:pass@host:4000/test?ssl={"rejectUnauthorized":false}`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public/service API key |
| `CRON_SECRET_KEY` | Secret key for cron trigger endpoints |
| `SFL_API_KEY` | *(Optional)* Sunflower Land VIP Community API Key |

---

## 🚀 Deployment

- **Frontend**: Deployed on **Vercel** (`sfl-resource-calculator.vercel.app`).
- **Backend & Cron Engine**: Deployed on **Render** (`sfl-calculator-backend.onrender.com`).
