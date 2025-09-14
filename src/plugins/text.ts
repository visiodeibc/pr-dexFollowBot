import type { ExtractorPlugin, InputRequest, ExtractionResult } from '../core/types';

function score(input: InputRequest): number {
  return input.kind === 'text' ? 0.5 : 0;
}

async function extract(_input: InputRequest): Promise<ExtractionResult> {
  return {
    places: [],
    summary: 'Text extraction is not implemented yet.',
    warnings: ['Text plugin is scaffolded only'],
  };
}

const plugin: ExtractorPlugin = {
  name: 'text',
  canHandle: score,
  extract,
};

export default plugin;

