# Fatline

Fatline is **Bolt.new / v0 / Lovable for India** — type what you want to build,
watch a real clickable prototype appear in seconds, then refine it by chatting.

Live: https://fatline.produsa.dev

## Structure
| Dir | What |
|---|---|
| [`fatline-studio/`](fatline-studio/) | The 3-panel builder frontend (React + Vite). **Chat · Live preview · Build/Code.** Talks to the live Produsa V2 API at `api.produsa.app`. |
| [`fatline-engine/`](fatline-engine/) | The **FatBots** — a fatline-native instant-prototype generator + audit harness + test-dev loop, built to beat V2 quality. |
| [`fatline-pipeline/`](fatline-pipeline/) | FatPipeline spec + agent (FatBot) skill definitions. |
| `fatline-wa-bot/` | WhatsApp bot variant. |

## fatline-studio (the 3-panel studio)
Lovable-style layout: **left** an Opus-style build chat, **center** a live
multi-page iframe preview (device toggles + page nav) that covers the whole
build, **right** a Build/Code/Deploy panel (activity stream, agent pipeline,
real source files, deploy to `*.produsa.app`).

- Auth: email/password + Google, on `api.produsa.app/api/auth` (token under `af_token`).
- Chat brain: `POST /api/projects/:id/chat` — the web-native server-side LLM that
  generates and refines the prototype and streams `project:*` socket events.
  (V2's internal `/orchestrator/message` Opus brain is flag-gated/internal-only;
  the project chat endpoint is the reachable equivalent the V2 Studio itself uses.)
- Preview: public iframe `GET /api/projects/:id/preview` (multi-page via `postMessage`).
- Realtime: Socket.IO (`studio:join`, `project:*`, `build:instant_*`, `deploy:step`).

```bash
cd fatline-studio && npm install && npm run dev   # http://localhost:4174
npm run build                                     # -> dist/ (deploy to CF Pages)
```
The deployed origin `fatline.produsa.dev` is CORS-allowlisted by the V2 API.

## fatline-engine (the FatBots)
A clean re-implementation of the V2 instant generator with a deterministic shell,
real photography, a shared design brief for cross-page coherence, and prompt
caching — see [`fatline-engine/README.md`](fatline-engine/README.md). Ships with a
Playwright audit harness and a test-dev loop that drives builds to N consecutive
passes above the V2 quality bar.

> No V2.5 code (Produsa-ai / produsa-wa) is modified — the engine is a from-scratch clone-and-improve.
