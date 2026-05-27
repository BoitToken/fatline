# Fatline Pipeline

The verification-first pipeline that turns a one-line idea into a verified prototype, then into a deployable product — with 6 consolidated FatBots instead of a 35-agent farm.

## Map

| Thing | Where | Status |
|-------|-------|--------|
| **Canonical spec** | [FATPIPELINE-v3.md](./FATPIPELINE-v3.md) | authoritative |
| **Rules (single source of truth)** | [FATBOT-RULES.md](./FATBOT-RULES.md) | authoritative |
| **Agent skills** | [agents/](./agents/) — 6 `SKILL.md` + `manifest.json` | authoritative |
| **Runnable orchestrator** | [runtime/](./runtime/) | runs the 6 stages + gates |
| FATPIPELINE.md, FATPIPELINE-v2.md | historical | superseded by v3 |

## The 6 FatBots

| Codename | Agent | Stage |
|----------|-------|-------|
| FatScout | discovery-director | discovery |
| FatArchitect | concept-architect | concept |
| FatProto | prototype-builder | prototype |
| FatJudge | verification-orchestrator | verifying |
| FatMender | repair-engineer | repairing (conditional) |
| FatForge | production-forge | production (+deploy) |

## Run the pipeline (dry-run)
```bash
cd runtime && node run.mjs --idea "an ecommerce store for handmade goods" --promote
node --test
```

## Validate the definitions
```bash
node scripts/validate-fatbots.mjs   # frontmatter + rule-reference integrity (run from repo root)
```
