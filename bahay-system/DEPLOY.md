# Deploying the system

Three services, in this order. The order matters: each one needs a URL from
the step before it.

```
MongoDB Atlas  ──▶  Render (Express API)  ──▶  Vercel (Angular portal)
   database            bahay-pagibig-api        the public site
```

Budget about 30 minutes the first time. Everything below is on a free tier.

---

## Before you start

Push this project to GitHub. Both Render and Vercel deploy by connecting to a
repository, and neither takes a zip file.

```bash
cd bahay-system
git init
git add .
git commit -m "Bahay Pag-ibig operations management system"
git branch -M main
git remote add origin https://github.com/<your-username>/bahay-pagibig.git
git push -u origin main
```

`.gitignore` already keeps `node_modules`, `dist` and `.env` out, so no
secrets go up with it.

---

## 1. MongoDB Atlas — the database

1. Sign up at **mongodb.com/atlas** and create a free **M0** cluster. Pick the
   region closest to Pampanga (Singapore or Hong Kong).
2. **Database Access** → Add New Database User. Give it a username and a
   generated password, and **copy the password now** — Atlas will not show it
   again. Role: *Read and write to any database*.
3. **Network Access** → Add IP Address → **Allow access from anywhere**
   (`0.0.0.0/0`).

   Render does not publish fixed outbound addresses on the free plan, so
   restricting by IP will simply block your own API. The database user's
   password is what protects the data.
4. **Database** → Connect → Drivers, and copy the connection string. It looks
   like:

   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

5. Edit it before using it: replace `<password>` with the real password, and
   insert the database name before the `?`:

   ```
   mongodb+srv://bahayadmin:realpassword@cluster0.xxxxx.mongodb.net/bahay_pagibig?retryWrites=true&w=majority
   ```

   If the password contains `@`, `/`, `:` or `#`, percent-encode it
   (`@` → `%40`), or the string will not parse. Generating a password with
   letters and digits only avoids this.

Keep that string. It is `MONGODB_URI` in the next step.

---

## 2. Render — the API

1. Sign up at **render.com** and connect your GitHub account.
2. **New** → **Blueprint**, pick the repository. Render finds
   `server/render.yaml` and proposes a service called `bahay-pagibig-api`.
3. It will ask for the values marked `sync: false`:

   | Variable | Value |
   |----------|-------|
   | `MONGODB_URI` | the Atlas string from step 1 |
   | `CLIENT_ORIGIN` | leave blank for now — you fill it in after step 3 |
   | `SMTP_USER` | `bahaypagibig1988@gmail.com` |
   | `SMTP_PASS` | a Gmail **App Password**, or blank |

   `JWT_SECRET` is generated for you.

   About `SMTP_PASS`: Gmail rejects your ordinary account password. You need an
   App Password, which requires 2FA on that Google account
   (myaccount.google.com → Security → App passwords). **Leaving it blank is
   fine** — every email is then written to the Render log instead of being
   sent, and nothing else changes. That is enough to demonstrate the feature.

4. Deploy. The first build takes a few minutes. When it finishes, open
   `https://<your-service>.onrender.com/api/health` — you should see:

   ```json
   { "status": "ok", "database": "connected", "time": "..." }
   ```

   If it says `"database": "disconnected"`, the Atlas string is wrong — check
   the password and the Network Access rule.

5. **Seed the sample data.** In Render, open the service → **Shell** and run:

   ```bash
   npm run seed
   ```

   It prints the staff sign-in password when it finishes. Change it after the
   defence.

Copy your Render URL. It is `API_URL` in the next step.

---

## 3. Vercel — the portal

1. Sign up at **vercel.com** and import the same repository.
2. **Set the Root Directory to `client`.** This is the step people miss — left
   at the repository root, the build fails because there is no `package.json`
   there.
3. Vercel reads `client/vercel.json`, so the build command and output
   directory are already correct. Leave them alone.
4. Add one environment variable:

   | Name | Value |
   |------|-------|
   | `API_URL` | `https://<your-service>.onrender.com` |

   The build script appends `/api` for you, so either form works.

5. Deploy. You get a URL like `https://bahay-pagibig.vercel.app`.

---

## 4. Close the loop

Go back to Render → your service → Environment, and set:

| Variable | Value |
|----------|-------|
| `CLIENT_ORIGIN` | `https://bahay-pagibig.vercel.app` |

Save. Render restarts the service. Until you do this the API accepts requests
from anywhere; afterwards it accepts only your portal and its Vercel preview
URLs.

Then open the Vercel URL and check:

- the home page lists wishlist items — the frontend is reaching the API
- `/admin/login` signs you in with the seeded account
- the dashboard shows real counts

---

## The one thing to know before the defence

**Render's free plan sleeps after 15 minutes of inactivity.** The next request
wakes it, which takes **about 50 seconds**, and during that time the portal
looks broken — empty wishlist, a sign-in that hangs.

Open the site five minutes before you present and click through a page or two.
The service then stays awake for the whole defence.

If that risk is not acceptable, Render's paid Starter plan removes the sleep.

---

## Troubleshooting

**The portal loads but every list is empty.**
The frontend cannot reach the API. Open the browser console (F12). A CORS
error means `CLIENT_ORIGIN` on Render does not match your Vercel URL exactly —
check for a trailing slash or `http` instead of `https`. A 404 or a failed
request to `localhost:5000` means `API_URL` was not set on Vercel, or was
added after the build; redeploy from Vercel's Deployments tab.

**Sign-in says the email or password is wrong, and you are sure it is not.**
The database was never seeded. Run `npm run seed` in the Render shell.

**Uploaded receipts and generated PDFs vanish.**
Render's free disk is wiped on every deploy. Certificates and monthly reports
can be regenerated; proof-of-payment images cannot. For real use these belong
in object storage — note it as a limitation rather than fixing it before the
defence.

**The Vercel build fails with "Could not read package.json".**
Root Directory is not set to `client`. Project Settings → General → Root
Directory.
