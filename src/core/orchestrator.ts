import { getPlugins, registerPlugin } from './registry';
import type { ExtractorPlugin, InputRequest, PluginContext, ExtractionResult } from './types';

// Lazy register built-in plugins when orchestrator is imported
let builtinsRegistered = false;
function registerBuiltins() {
  if (builtinsRegistered) return;
  builtinsRegistered = true;
  try {
    // These modules export a default plugin
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ig = require('../plugins/instagram').default as ExtractorPlugin | undefined;
    if (ig) registerPlugin(ig);
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tt = require('../plugins/tiktok').default as ExtractorPlugin | undefined;
    if (tt) registerPlugin(tt);
  } catch {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tx = require('../plugins/text').default as ExtractorPlugin | undefined;
    if (tx) registerPlugin(tx);
  } catch {}
}

export async function routeAndExtract(input: InputRequest, ctx?: Partial<PluginContext>): Promise<ExtractionResult> {
  registerBuiltins();
  const logger = ctx?.logger || console;
  const context: PluginContext = {
    logger,
    startedAt: Date.now(),
  };

  const plugins = getPlugins();
  if (plugins.length === 0) {
    return { places: [], warnings: ['No plugins registered'] };
  }

  // Select the plugin with highest score
  const scored = plugins
    .map((p) => ({ p, score: safeScore(() => p.canHandle(input)) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score <= 0) {
    return { places: [], warnings: ['No plugin can handle this input'] };
  }

  try {
    return await best.p.extract(input, context);
  } catch (e) {
    logger.error('extractor failed:', e);
    return { places: [], warnings: ['Extractor failed: ' + (e instanceof Error ? e.message : String(e))] };
  }
}

function safeScore(fn: () => number): number {
  try {
    const v = fn();
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  } catch {
    return 0;
  }
}

