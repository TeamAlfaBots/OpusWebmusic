'use client';

/** Share through the phone's share sheet when available, otherwise copy the link. Returns a message to toast. */
export async function shareOrCopy(data: { title: string; text?: string; url?: string }): Promise<string> {
  const url = data.url || window.location.href;
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: data.title, text: data.text, url });
      return '';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return ''; // user closed the share sheet
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'Link copied';
  } catch {
    return 'Could not share right now';
  }
}
