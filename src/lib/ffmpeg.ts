import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';

export async function hasFfmpeg(): Promise<boolean> {
  try {
    await run(['-version']);
    return true;
  } catch {
    return false;
  }
}

export async function extractAudio(inputPath: string, outPath: string): Promise<void> {
  await fsp.mkdir(path.dirname(outPath), { recursive: true });
  await run(['-y', '-i', inputPath, '-vn', '-acodec', 'mp3', outPath]);
}

export async function extractFrames(
  inputPath: string,
  outDir: string,
  fps = 1,
  maxFrames = 12
): Promise<{ frames: string[]; timecodes: string[] }> {
  await fsp.mkdir(outDir, { recursive: true });
  const outPattern = path.join(outDir, 'frame_%03d.png');
  // Limit frames using -frames:v
  await run(['-y', '-i', inputPath, '-vf', `fps=${fps}`, '-frames:v', String(maxFrames), outPattern]);
  const files = (await fsp.readdir(outDir))
    .filter((f) => f.startsWith('frame_') && f.endsWith('.png'))
    .map((f) => path.join(outDir, f))
    .sort();
  // Approximate timecodes based on index and fps
  const timecodes = files.map((_, i) => secondsToTimecode(i / fps));
  return { frames: files, timecodes };
}

function secondsToTimecode(sec: number): string {
  const h = Math.floor(sec / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((sec % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function run(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += String(d)));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with ${code}: ${stderr}`));
    });
  });
}

