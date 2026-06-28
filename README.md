# AI Dukaan Manager

Urdu-first shop management app for small Pakistani businesses. It supports Google login, Firebase Firestore sync, inventory, sales, credit records, reports, and AI-assisted voice/text commands.

## Run locally

```bash
npm install
npm run dev -- --port 3000
```

Open `http://127.0.0.1:3000/`.

## Required environment variables

Create `.env.local` for local development and add the same variables in Vercel before live deployment:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
GEMINI_API_KEY=
XAI_API_KEY=
```

`GEMINI_API_KEY` or `XAI_API_KEY` is used by the server API route for AI parsing. The app also has a local fallback parser for common shop commands.

## Deploy

The project includes `vercel.json` for Vercel deployment.

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add all environment variables in Vercel project settings.
4. Add your Vercel domain in Firebase Authentication authorized domains.
5. Deploy.

## Firebase

Publish `firestore.rules` in Firebase Console before production use.
