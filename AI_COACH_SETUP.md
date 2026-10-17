# ShadowBox Nox — AI Coach setup

## What this branch adds
- Keeps the existing on-device session analysis and training flow.
- Adds a chat panel inside the existing **AI Coach** section.
- Sends only the typed question, language, and a small allowlisted numeric summary to one backend endpoint.
- Never sends camera frames or stores chat transcripts.
- Provides a Cloudflare Worker that checks owner-approved D1 knowledge first, then calls the OpenAI **Responses API** with the hosted `web_search` tool.
- Answers open boxing questions in Arabic, French, or English (the language of the user's message), and shows web sources under the answer when the model cites them.
- Each question is answered on its own; the chat does not keep earlier messages as context.

## Important status
The chat is **not live yet**. In `script.js`, `COACH_API_URL` is intentionally an empty string until you deploy and test the backend. The old local analysis continues working without it.

## Deploy the backend
1. Create a Cloudflare Worker for this project.
2. Create a Cloudflare D1 database and execute `worker/schema.sql`.
3. Bind the D1 database to the Worker with binding name `DB`.
4. Configure Worker variables:
   - `AI_MODEL` (required): a model your OpenAI account can use with the Responses API and web search. Check availability in your account before deploying.
   - `ALLOWED_ORIGIN` (required): the exact published app origin, e.g. `https://kdhgdjfdf-design.github.io` (no path or trailing slash).
   - `AI_API_URL` (optional): defaults to `https://api.openai.com/v1/responses`.
   - `WEB_SEARCH` (optional): set to `off` to disable web search; any other value or no value keeps it on.
5. Add `AI_API_KEY` as a **Worker secret**, never as a public variable and never in `script.js`.
6. Deploy and test `POST https://YOUR-WORKER.workers.dev/api/chat` from the exact allowed origin. Confirm Arabic and English responses work and invalid origins are rejected.
7. Only after testing, set `COACH_API_URL` in `script.js` to the Worker base URL, e.g. `https://YOUR-WORKER.workers.dev`, then commit that change.

The Worker sends each request with `store: false`, so OpenAI should not keep the response. Still confirm the model name, usage limits, web-search pricing, and OpenAI's data policy before using it. The Worker is code only until you deploy it and test it with a real key; the tests in this branch use a mocked OpenAI response.

## Approved shared knowledge
Insert an entry into `coach_knowledge` only after a human owner has reviewed it. Example:

```sql
INSERT INTO coach_knowledge (question, answer, approved)
VALUES ('How do I practice jab-cross?', 'Practice slowly with balance and return each hand to guard. Stop if you feel pain.', 1);
```

The current lookup is intentionally simple keyword matching, not semantic search. Keep entries general, safe, and beginner-friendly. Do not automatically promote user questions or AI answers to approved knowledge. If several friends use the app, do not add names, emails, precise location, or private training logs to the knowledge base.

## Privacy and security checklist
- Keep the provider API key in Worker secrets only.
- Restrict `ALLOWED_ORIGIN` to the published app origin.
- Never accept arbitrary provider URLs or API keys from the client.
- The Worker does not persist message text or the numeric stats; the provider may process requests under its own policy, so disclose that clearly to users.
- Add provider-side budget limits and appropriate rate limiting before inviting friends to use it.
- This basic template does not provide user accounts or per-person access control. Do not treat CORS as authentication; it only limits browser origins.
- Review provider privacy, age rules, retention, and pricing with a trusted adult before public use.

## Scope guard
This change does not alter camera detection, punch counting, target timing, training modes, activity history, or the existing local coach analysis.
