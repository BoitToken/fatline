#!/usr/bin/env bash
# One-command Fatline engine test: build → FatJudge verdict → score → (optional) publish a clickable link.
#   ./fl-test.sh "<idea>" [type] [--publish]
#   type ∈ website|ecommerce|webapp|mobile  (default: website)
#   --publish  → push the build to the fatline showcase and print a https://fatline.produsa.dev/<slug>.html URL
set -euo pipefail
cd "$(dirname "$0")"

IDEA="${1:?usage: ./fl-test.sh \"<idea>\" [type] [--publish]}"
TYPE="website"; PUBLISH=0
for a in "${@:2}"; do
  case "$a" in
    --publish) PUBLISH=1 ;;
    website|ecommerce|webapp|mobile|landing) TYPE="$a" ;;
  esac
done
SLUG="fl-$(echo "$IDEA" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//' | cut -c1-32)"

export AWS_PROFILE="${AWS_PROFILE:-claudev2}" AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ap-south-1}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
# ANTHROPIC key: env → prod bundle (Secrets Manager) → OpenClaw .env
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  ANTHROPIC_API_KEY="$(aws secretsmanager get-secret-value --secret-id produsa/api/bundle --query SecretString --output text 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin).get("ANTHROPIC_API_KEY",""))' 2>/dev/null || true)"
  [ -z "$ANTHROPIC_API_KEY" ] && ANTHROPIC_API_KEY="$(grep -E '^ANTHROPIC_API_KEY=' /data/.openclaw/workspace/.env 2>/dev/null | head -1 | cut -d= -f2- || true)"
fi
export ANTHROPIC_API_KEY
[ -z "${ANTHROPIC_API_KEY:-}" ] && { echo "✗ no ANTHROPIC_API_KEY found"; exit 1; }

echo "▸ Building '$IDEA' ($TYPE) with FatJudge gates…"
node run.mjs --idea "$IDEA" --type "$TYPE" --label "$SLUG" --out ./out

echo ""; echo "▸ FatJudge verdict:"
python3 - "$SLUG" <<'PY'
import json,sys,glob,os
slug=sys.argv[1]; v=json.load(open(f"./out/{slug}/verification.json"))
s=v.get("summary",{})
print("  ship-ready:", s.get("shipReady"), "| brief:", s.get("briefPass"),
      "| pages all pass:", s.get("pagesAllPass"),
      "| runtime:", s.get("runtimePass"), "| min page score:", s.get("minPageScore"))
for pid,pv in (v.get("pages") or {}).items():
    flag="ok" if pv.get("pass") else "DEFECTS: "+"; ".join(pv.get("defects",[]))
    print(f"    page {pid}: {pv.get('score')}/10 [{flag}]")
if (v.get('runtime') or {}).get('defects'): print("  runtime defects:", v['runtime']['defects'])
PY

echo ""; echo "▸ Audit score:"
node audit.mjs --file "./out/$SLUG/index.html" --label "$SLUG" --out ./audits 2>&1 | grep '\[audit\]' | tail -2 || true

if [ "$PUBLISH" = "1" ]; then
  echo ""; echo "▸ Publishing to showcase…"
  WT=/tmp/fl-pub-$$
  git -C /root/fatline-build worktree add "$WT" showcase >/dev/null 2>&1
  git -C "$WT" pull --ff-only origin showcase >/dev/null 2>&1 || true
  PAGE="${SLUG#fl-}.html"
  cp "./out/$SLUG/index.html" "$WT/$PAGE"
  git -C "$WT" add "$PAGE" >/dev/null 2>&1
  git -C "$WT" -c user.email=admin@boitclub.com -c user.name=BoitToken commit -q -m "showcase: $SLUG" >/dev/null 2>&1
  git -C "$WT" push -q origin showcase >/dev/null 2>&1
  git -C /root/fatline-build worktree remove "$WT" --force >/dev/null 2>&1
  echo "  live in ~60s → https://fatline.produsa.dev/$PAGE"
else
  echo ""; echo "▸ Output: ./out/$SLUG/index.html   (add --publish for a https://fatline.produsa.dev/… link)"
fi
