import type { ExtractorPlugin, InputRequest, ExtractionResult } from '../core/types';

function score(input: InputRequest): number {
  if (input.kind === 'tiktok_message') return 0.8;
  if (input.kind === 'url' && /tiktok\.com\//i.test(input.content)) return 0.7;
  return 0;
}

async function extract(_input: InputRequest): Promise<ExtractionResult> {
  return {
    places: [],
    summary: 'TikTok extraction is a work in progress.',
    warnings: ['TikTok plugin is scaffolded only'],
  };
}

const plugin: ExtractorPlugin = {
  name: 'tiktok',
  canHandle: score,
  extract,
};

export default plugin;

