# FORCE

> You don't need more learning. You need one real conversation.

One daily execution move. One forced conversation. No motivation. No content. Just action.

---

## Deploy in 15 Minutes

### Step 1: Set Up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to your users)
3. Go to **SQL Editor** and paste the contents of `supabase-schema.sql`. Run it.
4. Go to **Project Settings → API**
5. Copy:
   - `Project URL` → this is your `VITE_SUPABASE_URL`
   - `anon/public` key → this is your `VITE_SUPABASE_ANON_KEY`

---

### Step 2: Deploy to Vercel (5 minutes)

1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and import the repo
3. In Vercel project settings → **Environment Variables**, add:
   ```
   VITE_SUPABASE_URL = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   ```
4. Deploy. Vercel gives you a public URL instantly.

---

### Step 3: Test

1. Open the deployed URL
2. Enter an email
3. Connect a free API key (Gemini recommended)
4. Complete onboarding
5. See your first move generate

---

## Local Development

```bash
# Install
npm install

# Create env file
cp .env.example .env
# Fill in your Supabase credentials

# Run
npm run dev
```

---

## API Key Options for Users

| Provider | Cost | Limit | Get Key |
|---|---|---|---|
| Gemini Flash | Free | 1,500 req/day | aistudio.google.com |
| Groq | Free | 14,400 req/day | console.groq.com |
| OpenRouter | Free tier | Varies | openrouter.ai |
| Anthropic | ~₹0.25/session | Unlimited | console.anthropic.com |

---

## Tech Stack

- **React + Vite** hosted on Vercel (free)
- **Supabase** for user emails + streaks + session logs (free)
- **User-owned AI API key** stored locally, never on your servers
- **No password. No magic link. Email only.**

---

## Lead Capture

Every email that signs up is stored in your Supabase `users` table. Export anytime from:
Supabase Dashboard → Table Editor → users → Export CSV

These are your warm leads for upsell.

---

## Important Notes

- The RLS policy in `supabase-schema.sql` is open (allows all). This is fine for MVP. Tighten it before scaling.
- API keys are stored in localStorage only. Never sent to Supabase. Never logged.
- If Supabase env vars are missing, the app runs in localStorage-only mode (no lead capture, but still functional for testing).

---

## Streak Unlocks

| Day | Unlock |
|---|---|
| Day 3 | Better conversation openings |
| Day 7 | Objection layer |
| Day 11 | User can choose Today's Move |
| Day 14 | Scenario simulations |
| Day 21 | Free 1:1 call (₹5000 value) |
