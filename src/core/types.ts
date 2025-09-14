export type Platform = 'telegram' | 'api' | 'worker' | 'cli' | 'unknown';

export type InputKind =
  | 'text'
  | 'url'
  | 'instagram_message'
  | 'tiktok_message'
  | 'unknown';

export interface UserRef {
  id?: number | string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface ChatRef {
  id?: number | string;
  title?: string;
}

export interface InputRequest {
  id?: string;
  platform: Platform;
  kind: InputKind;
  content: string;
  user?: UserRef;
  chat?: ChatRef;
  metadata?: Record<string, any>;
}

export interface PlaceCandidate {
  name: string;
  from: string; // e.g., 'instagram', 'tiktok', 'text'
  confidence: number; // 0..1
  meta?: Record<string, any>;
}

export interface ExtractionResult {
  places: PlaceCandidate[];
  warnings?: string[];
  summary?: string;
  meta?: Record<string, any>;
}

export interface PluginLogger {
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

export interface PluginContext {
  logger: PluginLogger;
  startedAt: number;
}

export interface ExtractorPlugin {
  name: string;
  // Return confidence (0..1) that this plugin can handle the input
  canHandle: (input: InputRequest) => number;
  extract: (input: InputRequest, ctx: PluginContext) => Promise<ExtractionResult>;
}

