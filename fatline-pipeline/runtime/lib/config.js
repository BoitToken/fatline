// Runtime config + safety gates for the live pipeline.
// Secrets come ONLY from env (Rule R9). Production (paid, destructive) calls are
// gated behind --allow-production so nothing fires against prod by accident.
export function loadConfig(argv = process.argv) {
  const has = (n) => argv.includes(`--${n}`);
  const opt = (n, d) => {
    const i = argv.indexOf(`--${n}`);
    if (i === -1) return d;
    const v = argv[i + 1];
    return v && !v.startsWith('--') ? v : true;
  };
  return {
    live: has('live'),
    probe: has('probe'),
    allowProduction: has('allow-production'), // explicit opt-in for the paid prod build
    apiBase: opt('api', process.env.PRODUSA_API_BASE || 'https://api.produsa.app'),
    token: process.env.PRODUSA_TOKEN || '',
    model: opt('model', process.env.FATLINE_MODEL || 'claude-opus-4-7'),
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    pollIntervalMs: Number(opt('poll-ms', 5000)),
    pollTimeoutMs: Number(opt('poll-timeout-ms', 1000 * 60 * 20)),
  };
}

// Throw early with a clear message if live prerequisites are missing.
export function assertLiveReady(cfg) {
  const missing = [];
  if (!cfg.anthropicKey) missing.push('ANTHROPIC_API_KEY');
  if (!cfg.token) missing.push('PRODUSA_TOKEN');
  if (missing.length) {
    throw new Error(`--live needs env: ${missing.join(', ')} (R9: secrets from env only). ` +
      `Set them and re-run, or omit --live for the offline MockGenerator.`);
  }
}
