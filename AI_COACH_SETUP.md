# ShadowBox Nox — Offline Coach

## The simplest setup

The coach now runs locally in the app using a small built-in answer guide. It does **not** need:
- an API key
- Gemini, OpenAI, or another AI account
- a Cloudflare Worker or backend
- a billing setup

The chat interface and the rest of the app stay in place. The local guide can answer common questions about warm-ups, general fitness, camera setup, recovery, progress tracking, and safety. It is a small offline guide, **not** a live generative AI model, so answers are limited to the topics built into the app.

## Privacy

The local coach processes the question in the browser and does not send the chat message to an external AI server. The camera tracking already runs in the browser as well; the coach does not receive camera images.

## If you want live AI later

That can be considered separately, only if you want it and after choosing a service with clear usage limits. Do not put API keys in frontend JavaScript or commit them to GitHub. For now, no external service is required.
