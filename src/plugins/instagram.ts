import type { ExtractorPlugin, InputRequest, ExtractionResult } from '../core/types';

function score(input: InputRequest): number {
  if (input.kind === 'instagram_message') return 0.9;
  if (input.kind === 'url' && /instagram\.com\//i.test(input.content)) return 0.8;
  return 0;
}

async function extract(_input: InputRequest): Promise<ExtractionResult> {
  return {
    places: [],
    summary: 'Instagram extraction is a work in progress.',
    warnings: ['Instagram plugin is scaffolded only'],
  };
}

const plugin: ExtractorPlugin = {
  name: 'instagram',
  canHandle: score,
  extract,
};

export default plugin;

