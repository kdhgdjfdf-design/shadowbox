# ShadowBox Nox — Gemini AI Coach setup

## What this branch changes
- Keeps the existing ShadowBox Nox app and chat interface.
- Uses a Cloudflare Worker as the secure backend.
- Calls the native Gemini `generateContent` API, not the OpenAI Responses API.
- Enables Google Search grounding by default and returns sources from Gemini's grounding metadata.
- Keeps the Gemini API key only in Cloudflare Worker secrets.
- Gives clearer errors for quota/rate limits, invalid keys, and unavailable models.
- Optionally checks owner-approved answers in a D1 database first if a `DB` binding and the `coach_knowledge` table exist.

## Important: this is code, not a deployed service
The Worker must be deployed and configured before the chat can call it. The frontend's `COACH_API_URL` must then be set to the base URL of that deployed Worker. Do not put the Gemini API key in `script.js`, HTML, or GitHub.

## Configure the Cloudflare Worker
Create or open the Worker that serves this project and set its entry file to `worker/ai-coach.js`.

### 1. Add the secret
In the Cloudflare Worker settings, add a secret named:

- `AI_API_KEY`: your Gemini API key from Google AI Studio.

Do not paste the key into GitHub, this chat, or frontend files.

### 2. Add Worker variables
Set these variables:

- `AI_MODEL`: a Gemini model enabled for your Google AI Studio project, for example `gemini-2.5-flash` if available to your account.
- `ALLOWED_ORIGIN`: the exact origin of the page that will use the chat, without a path or trailing slash. For the GitHub Pages site it will look like `https://YOUR-USERNAME.github.io`. If you are using a raw.githack preview, its origin is different; use the origin shown by the browser.
- `WEB_SEARCH`: optional. Leave unset or use `on` to enable Google Search grounding; set to `off` to disable it.

Google Search grounding can consume quota and may have separate billing depending on the model and account. Check your current AI Studio usage and pricing before relying on it. A Gemini API key alone does not guarantee unlimited free use.

### 3. Deploy and test the Worker
Deploy the Worker and test it from the exact allowed website origin. The expected endpoint is:

`https://YOUR-WORKER.workers.dev/api/chat`

It accepts a POST JSON body like:

```json
{
  "message": "اشرح لي الجاب في الملاكمة",
  "language": "ar",
  "stats": null
}
```

A successful response contains `reply` and `sources`. If Gemini rejects the request, the Worker returns a short error message with a code such as `GEMINI_LIMIT`, `GEMINI_AUTH`, or `GEMINI_MODEL`. Check the Worker's logs and AI Studio usage if an error remains.

### 4. Connect the existing app
Only after the Worker is deployed, set `COACH_API_URL` near the top of `script.js` to the base URL only, for example:

```js
const COACH_API_URL = "https://YOUR-WORKER.workers.dev";
```

Do not add `/api/chat` to this variable; the frontend appends that path itself. Commit this frontend change to the testing branch, not `main`.

### 5. Verify
- Ask a simple boxing question in Arabic.
- Ask a different question in French or English.
- Confirm that the app shows an answer.
- Ask a current/factual question and confirm sources appear when Gemini uses Google Search grounding.
- If the app shows a quota error, inspect the project's usage and rate limits in Google AI Studio. Do not create repeated new keys as a workaround.

## Security notes
- The Gemini key must exist only as a Cloudflare Worker secret.
- Restrict `ALLOWED_ORIGIN` to the exact site origin, but remember CORS is not authentication.
- This basic Worker has no user login or per-user quotas. Add rate limiting before sharing widely.
- The Worker does not save chat transcripts. The Gemini service processes the request according to Google's applicable API terms and data policies.
- The camera video is not sent to Gemini; only the typed message and a small allowlisted numeric summary are sent.

## Scope
This change is limited to the AI coach backend and setup instructions. It does not alter camera punch detection, training modes, history, or the 3D learning section.
