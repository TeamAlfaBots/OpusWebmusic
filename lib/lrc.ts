export type LrcLine = { time: number; text: string };

/** Parse LRC text ("[01:23.45] words") into sorted timed lines. */
export function parseLrc(text: string): LrcLine[] {
  const lines: LrcLine[] = [];
  let offset = 0;
  for (const raw of text.split(/\r?\n/)) {
    const off = raw.match(/^\s*\[offset:\s*(-?\d+)\s*\]/i);
    if (off) { offset = parseInt(off[1], 10) / 1000; continue; }
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const words = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const s of stamps) {
      const frac = s[3] ? parseInt(s[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0;
      lines.push({ time: parseInt(s[1], 10) * 60 + parseInt(s[2], 10) + frac - offset, text: words });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** Index of the line that should be highlighted at time t (-1 before the first line). */
export function activeLine(lines: LrcLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/** Saavn lyrics come back as HTML with <br> tags. */
export function htmlToPlain(html: string): string {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").trim();
}
