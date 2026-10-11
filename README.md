# MeiAI Website

The public MeiAI portfolio and reference platform. It contains the shared navigation and presentation layer, security recommendation articles, Azure and Microsoft 365 security journey, AI security lab interface, and synthetic SOC and multicloud demonstrations.

## Run locally

Requirements: Node.js 20 or later.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Validate

```sh
npm run lint
npm test
npx tsc --noEmit
npm run build
```

The AI lab calls the separate MeiAI API. Set `NEXT_PUBLIC_API_URL` in `.env.local`; use the Render API URL for the online demo or a local API URL for development. Never put API credentials in frontend environment variables.

## Key routes

- `/` — portfolio and project index
- `/labs/azure-security-journey` — interactive Azure/Microsoft 365 security journey
- `/lab` and `/assess` — AI security lab and assessment experience
- `/security-recommendations` — evidence-linked articles
- `/detection-soc` and `/multicloud` — synthetic reference walkthroughs

## Deployment

Render builds from the repository root with `npm ci && npm run build` and starts with `npm start`. `render.yaml` documents the frontend service configuration. The current production website remains on `https://www.meiai.in`.

## Related MeiAI repositories

- [MeiAI AI Security](https://github.com/praveen2728/meiai-ai-security) — assessment API and tests
- [MeiAI Azure Security](https://github.com/praveen2728/meiai-azure-security) — extracted Azure project workspace
- [MeiAI Website](https://github.com/praveen2728/meiai-website) — this repository

The Azure journey and AI lab are being separated from the former `meiai-v1` integration repository in stages. The production website remains intact during the transition.
