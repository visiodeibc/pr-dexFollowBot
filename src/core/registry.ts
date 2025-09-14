import type { ExtractorPlugin } from './types';

const registry: ExtractorPlugin[] = [];

export function registerPlugin(plugin: ExtractorPlugin) {
  const exists = registry.some((p) => p.name === plugin.name);
  if (!exists) registry.push(plugin);
}

export function getPlugins(): ExtractorPlugin[] {
  return [...registry];
}

export function clearPlugins() {
  registry.splice(0, registry.length);
}

