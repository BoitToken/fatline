# Fatline Studio

Fresh standalone frontend shell for `fatline.produsa.dev`.

## What it is
- Left rail: project controls, API base, token, quick actions
- Center: live iframe preview from existing Produsa backend
- Right rail: activity feed + project chat

## Backend wiring reused
- `GET /api/projects/:id/status`
- `GET /api/projects/:id/messages`
- `POST /api/projects/:id/chat`
- `POST /api/projects/:id/build/instant`
- `POST /api/projects/:id/build/production`
- `POST /api/projects/:id/deploy`
- `WS /ws/projects/:id/build`
- `GET /api/projects/:id/preview`

## Local run
```bash
cd fatline-studio
npm install
npm run dev
```

## Build
```bash
npm run build
```

The app defaults to `https://api.produsa.dev` and accepts a pasted `af_token` for authenticated project actions.
