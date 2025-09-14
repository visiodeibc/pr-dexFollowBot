import path from 'node:path';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { env } from './env';
import { normalizePermalink, shortcodeFromUrl, resolveMediaUrl, downloadToFile } from './instagram';
import { hasFfmpeg, extractAudio, extractFrames } from './ffmpeg';
import { analyzeFramesForOverlays, extractPlacesFromTranscript } from './ai';
import { coerceMatch, searchPlaces } from './places';

export interface ReelsPipelineResult {
  shortcode: string;
  bullets: string[];
}

export async function runReelsPipeline(rawUrl: string): Promise<ReelsPipelineResult> {
  const permalink = normalizePermalink(rawUrl);
  const code = shortcodeFromUrl(permalink);
  if (!code) throw new Error('Invalid Instagram URL (no shortcode)');

  // Resolve & download media
  const direct = await resolveMediaUrl(permalink);
  if (!direct) {
    throw new Error('Could not resolve media URL from Instagram. A logged-in approach or alternative resolver is required.');
  }

  const baseDir = path.resolve(process.cwd(), 'tmp', 'reels', code);
  await fsp.mkdir(baseDir, { recursive: true });
  const videoPath = path.join(baseDir, `${code}.mp4`);
  await downloadToFile(direct, videoPath);

  // Prepare analysis assets
  let transcript = '';
  const ffmpegOk = await hasFfmpeg();
  let framePaths: string[] = [];
  let timecodes: string[] = [];

  if (ffmpegOk) {
    // Extract audio
    const audioPath = path.join(baseDir, `${code}.mp3`);
    try {
      await extractAudio(videoPath, audioPath);
      if (env.OPENAI_API_KEY) {
        transcript = await transcribeAudio(audioPath);
      }
    } catch (e) {
      // ignore transcription failure
    }

    // Extract a few frames
    try {
      const framesDir = path.join(baseDir, 'frames');
      const res = await extractFrames(videoPath, framesDir, 1, 6);
      framePaths = res.frames;
      timecodes = res.timecodes;
    } catch (e) {
      // ignore frame extraction failure
    }
  }

  // Vision overlays → candidate places
  let overlayCandidates: string[] = [];
  try {
    if (framePaths.length > 0 && env.OPENAI_API_KEY) {
      const overlays = await analyzeFramesForOverlays(framePaths, timecodes);
      overlayCandidates = overlays.flatMap((o) => o.placeMentions || []);
    }
  } catch {}

  // Transcript → candidate places
  const transcriptCandidates = env.OPENAI_API_KEY && transcript
    ? (await extractPlacesFromTranscript(transcript)).map((c) => c.name)
    : [];

  // Merge candidates
  const allCandidates = dedupeStrings([...overlayCandidates, ...transcriptCandidates]).slice(0, 8);

  // Google Places mapping
  const bullets: string[] = [];
  for (const name of allCandidates) {
    try {
      const results = await searchPlaces(name, 'SG');
      const first = results?.[0];
      if (!first) continue;
      const m = coerceMatch(first);
      const line = `- ${m.displayName} — ${m.formattedAddress || ''} — ${m.mapsUrl}`;
      bullets.push(line.trim());
      // Keep list short for chat UX
      if (bullets.length >= 6) break;
    } catch {}
  }

  return { shortcode: code, bullets };
}

async function transcribeAudio(pathToFile: string): Promise<string> {
  // Use OpenAI transcription endpoint directly (Vercel AI SDK does not expose a simple wrapper yet for audio)
  if (!env.OPENAI_API_KEY) return '';
  const url = 'https://api.openai.com/v1/audio/transcriptions';
  const fd = new FormData();
  // Node FormData supports Readable streams
  fd.append('file', (fs as any).createReadStream(pathToFile) as any, 'audio.mp3');
  fd.append('model', 'gpt-4o-transcribe');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: fd as any,
  });
  if (!res.ok) return '';
  const data: any = await res.json();
  return String(data.text || '');
}

function dedupeStrings(items: string[]): string[] {
  const set = new Set<string>();
  for (const s of items) {
    const k = s.trim().toLowerCase();
    if (!k) continue;
    if (!set.has(k)) set.add(k);
  }
  return Array.from(set.values());
}
