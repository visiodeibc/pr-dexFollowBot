// Minimal module declarations to keep TypeScript happy without installing packages yet.
declare module 'ai' {
  export const generateText: any;
  export const streamText: any;
  export const generateObject: any;
}

declare module '@ai-sdk/openai' {
  export const createOpenAI: any;
}

declare module 'instagram-url-direct' {
  export function getUrlLink(url: string): Promise<{ url_list?: string[] } | null>;
}

