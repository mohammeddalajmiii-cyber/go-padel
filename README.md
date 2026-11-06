# Go Padel

Booking site and front desk system for the padel court at Avenue Mall, Rehab City.

- **Booking site** (Arabic at `/ar`, English at `/en`): players pick a day, a length (30 minutes up to 8 hours) and a start time, enter their name and mobile, pay the deposit by InstaPay, upload the screenshot, and see their booking confirmed live.
- **Front desk** (`/admin`): the day's schedule from opening to closing, payments waiting to be checked (with the screenshot), confirm or reject, one-tap WhatsApp confirmation, collect the rest in cash or InstaPay, arrived / no-show, walk-ins, blocked time, reports and settings.

Built with Next.js, Tailwind CSS and PostgreSQL (Neon). Hosted on Vercel.

---

## Booking rules (all editable in Front desk → Settings)

| | 30 min | 60 min |
|---|---|---|
| Price | 200 EGP | 400 EGP |
| Deposit by InstaPay | 50 EGP | 100 EGP |

- Players choose how long with − / + buttons: it starts at 1 hour and moves by half an hour, from 30 minutes up to 8 hours, as long as the court is free for the whole time. Longer bookings are priced from the table: each hour at the 60-minute price, plus the 30-minute price for a half hour (1½ hours = 600 EGP, deposit 150).
- Open 3:00 PM to 1:00 AM. Bookings start on the hour or half hour.
- A slot is held for 15 minutes while the player pays. Uploading the screenshot stops the timer.
- No cancellations; deposits are non-refundable.
- Bookings after midnight belong to the evening before (12:30 AM Saturday is on Friday's schedule).

**Booking statuses:** waiting for deposit → check payment → confirmed → paid in full. A slot is released if the deposit isn't sent in time, the front desk rejects the payment, or the front desk cancels.

---

## First-time setup (about 30 minutes)

You need: a Mac with [Node.js](https://nodejs.org) (LTS) and [VS Code](https://code.visualstudio.com), plus free accounts on [GitHub](https://github.com), [Neon](https://neon.tech) and [Vercel](https://vercel.com).

### 1. Put the code on GitHub
1. Unzip `go-padel.zip` and open the `go-padel` folder in VS Code.
2. On GitHub, create a new **private** repository called `go-padel` (no README).
3. In VS Code open the terminal (**Terminal → New Terminal**) and run, replacing `YOUR-USERNAME`:
   ```bash
   git init
   git add .
   git commit -m "Go Padel first version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/go-padel.git
   git push -u origin main
   ```
4. Add Sheet and Omar as collaborators: repository **Settings → Collaborators**.

### 2. Create the database on Neon
1. In Neon, create a project called `go-padel`. Pick the region **Frankfurt (eu-central-1)**, the closest to Egypt.
2. Click **Connect**, turn on **Connection pooling**, and copy the connection string.
3. In the project folder, copy `.env.example` to a new file called `.env.local` and paste the string as `DATABASE_URL`.
4. In `.env.local`, also set `ADMIN_PASSWORD` (the front desk password) and `SESSION_SECRET` (run `openssl rand -hex 32` in the terminal and paste the result).
5. Install the packages:
   ```bash
   npm install
   ```
   The database tables are created automatically the first time the site connects, so there's no separate setup step.

### 3. Try it on your Mac
```bash
npm run dev
```
Open http://localhost:3000 for the booking site and http://localhost:3000/admin for the front desk.

First thing in the front desk: **Settings → InstaPay**, paste the venue's InstaPay payment link and address, then save.

### 4. Put it online with Vercel
1. In Vercel, click **Add New → Project** and import the `go-padel` repository from GitHub.
2. Before deploying, open **Environment Variables** and add the same three values from `.env.local`: `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
3. Set the **Function Region** (Project Settings → Functions) to **Frankfurt (fra1)** so it sits next to the database.
4. Click **Deploy**. You'll get a link like `go-padel.vercel.app`.
5. Later: connect your own domain under **Project Settings → Domains**.

From now on, every `git push` to `main` updates the live site automatically.

---

## How the code is organised

```
src/lib/bookings.ts           all booking rules: holding slots, payments, front desk actions
src/lib/time.ts               opening hours, half-hour slots, after-midnight handling (Cairo time)
src/lib/i18n.ts               all Arabic and English text on the booking site
src/lib/settings.ts           prices, deposits, hours, InstaPay details
src/lib/schema.ts             database tables (created automatically on first connection)
src/lib/setup.ts              plain-English messages for setup problems
src/app/(site)/[locale]/      booking site pages: home, /book, /booking/[code]
src/app/admin/                front desk pages: schedule, reports, settings, login
src/app/api/                  the server endpoints the pages talk to
src/components/               page pieces (booking flow, payment screen, admin schedule…)
```

**To change wording** on the booking site, edit `src/lib/i18n.ts` (English and Arabic are side by side).
**To change prices or hours**, use Front desk → Settings; no code change needed.

### How double bookings are prevented
Every booked half hour gets its own row in `booking_slots`, and the database refuses two rows for the same half hour. If two people press "Continue" for the same time at the same moment, exactly one gets it and the other is asked to pick another time.

### InstaPay screenshots
Screenshots are stored in the database (not on a public link) and only the front desk can see them. They're shrunk on the phone before upload and deleted automatically after 30 days.

### If the site shows "Setup isn't finished"
The site checks its own setup when a page fails and lists what's missing (for example `DATABASE_URL isn't set`). Fix it in Vercel → Settings → Environment Variables, then Deployments → Redeploy. You can also open `/api/setup-check` on your site at any time: `"ok": true` means everything is connected.

### Notes
- There's one shared front desk password. Change it any time in Vercel's environment variables (then redeploy).
- Customers don't create accounts: their booking page link is private to them. They keep it to see their status.
- The front desk page refreshes every 10 seconds and plays a short beep when a new payment arrives.
