import { env } from './env';
import { generateObject, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import fs from 'node:fs';

const openai = () => createOpenAI({ apiKey: env.OPENAI_API_KEY });

export interface FrameOverlayExtraction {
  timecode: string; // e.g., 00:00:05
  texts: string[];  // OCR-like text visible on frame
  placeMentions: string[]; // possible place names visible
}

export interface CandidatePlace {
  name: string;
  timecodes?: string[];
  from: Array<'transcript' | 'overlay' | 'caption' | 'vision'>;
}

export async function analyzeFramesForOverlays(
  framePaths: string[],
  timecodes: string[]
): Promise<FrameOverlayExtraction[]> {
  if (!env.OPENAI_API_KEY) return [];
  const model = openai()('gpt-4o-mini');

  const schema = z.object({
    frames: z.array(
      z.object({
        timecode: z.string(),
        texts: z.array(z.string()).default([]),
        placeMentions: z.array(z.string()).default([]),
      })
    ),
  });

  // Send up to 6 frames to keep prompt lightweight
  const parts: any[] = [{ type: 'text', text: 'Extract on-screen text and any place names per frame.' }];
  for (let i = 0; i < Math.min(framePaths.length, 6); i++) {
    const b64 = fs.readFileSync(framePaths[i]).toString('base64');
    parts.push({ type: 'text', text: `Frame ${i + 1} at ${timecodes[i] || ''}` });
    parts.push({ type: 'image', image: `data:image/png;base64,${b64}` });
  }

  const res = await generateObject({
    model,
    messages: [{ role: 'user', content: parts }],
    schema,
  });
  const data = (res.object as any)?.frames || [];
  return data as FrameOverlayExtraction[];
}

export async function extractPlacesFromTranscript(
  transcript: string,
  caption?: string
): Promise<CandidatePlace[]> {
  if (!env.OPENAI_API_KEY) return [];
  const model = openai()('gpt-4o-mini');
  const schema = z.object({
    candidates: z.array(
      z.object({
        name: z.string(),
        rationale: z.string().optional(),
      })
    ),
  });
  const prompt = `From the transcript and caption of a short food/travel reel, extract likely venue/place names mentioned. Be conservative and avoid generic words. Output 1-5 names.`;
  const res = await generateObject({
    model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Transcript:\n${transcript}\n\nCaption:\n${caption || ''}` },
    ],
    schema,
  });
  const items = (res.object as any)?.candidates || [];
  const out: CandidatePlace[] = items.map((i: any) => ({ name: String(i.name || '').trim(), from: ['transcript'] }));
  return out.filter((c) => c.name.length > 0);
}

