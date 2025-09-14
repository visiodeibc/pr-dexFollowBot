import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

export function normalizePermalink(url: string): string {
  const u = new URL(url);
  let pathname = u.pathname || '/';
  if (!pathname.endsWith('/')) pathname += '/';
  u.hash = '';
  u.search = '';
  u.pathname = pathname;
  return u.toString();
}

export function shortcodeFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^\/(?:reel|p)\/([A-Za-z0-9_-]+)(?:\/|$)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export async function resolveMediaUrl(url: string): Promise<string | null> {
  // Strategy 1: try instagram-url-direct (if installed)
  try {
    const mod = await import('instagram-url-direct');
    const res = await mod.getUrlLink(url);
    const direct = res?.url_list?.[0];
    if (direct) return direct;
  } catch {}

  // Strategy 2: try to parse og:video from HTML (may fail due to login wall)
  try {
    const html = await (await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })).text();
    const ogVideo = /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
    if (ogVideo) return ogVideo;
  } catch {}

  return null;
}

export async function downloadToFile(url: string, outPath: string): Promise<void> {
  await fsp.mkdir(path.dirname(outPath), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download media: HTTP ${res.status}`);
  const file = await fsp.open(outPath, 'w');
  try {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Readable stream not available');
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) await file.write(value);
    }
  } finally {
    await file.close();
  }
}

export function mapsUrlForPlace(placeId: string): string {
  return `https://maps.google.com/?q=place_id:${encodeURIComponent(placeId)}`;
}

