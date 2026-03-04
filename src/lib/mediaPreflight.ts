const probeTimeout = 4500;

export const parseYouTubeId = (input: string) => {
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
      return /^[a-zA-Z0-9_-]{11}$/.test(parts[1]) ? parts[1] : null;
    }
  }

  return null;
};

const ready = (message: string | null = null) => ({
  state: 'ready',
  message,
  checkedAt: new Date().toISOString()
});

const warn = (message: string) => ({
  state: 'warn',
  message,
  checkedAt: new Date().toISOString()
});

const error = (message: string) => ({
  state: 'error',
  message,
  checkedAt: new Date().toISOString()
});

const raceWithTimeout = <T,>(promise: Promise<T>, message: string) =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), probeTimeout);
    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((reason) => {
        window.clearTimeout(timeoutId);
        reject(reason);
      });
  });

export const probeImage = async (src: string) => {
  if (!src) return error('Missing image URL.');

  try {
    await raceWithTimeout(
      new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Image failed to load.'));
        image.src = src;
      }),
      'Image timed out while loading.'
    );
    return ready(null);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Image probe failed.';
    return /timed out/i.test(message) ? warn(message) : error(message);
  }
};

export const probeDirectVideo = async (src: string) => {
  if (!src) return error('Missing video URL.');

  try {
    await raceWithTimeout(
      new Promise<void>((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Video metadata could not be loaded.'));
        video.src = src;
      }),
      'Video metadata timed out.'
    );
    return ready(null);
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Video probe failed.';
    return /timed out/i.test(message) ? warn(message) : error(message);
  }
};

export const probeYouTube = async (src: string) => {
  const ytId = parseYouTubeId(src);
  if (!ytId) return error('Invalid YouTube URL.');
  return probeImage(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
};

export const probeQuestionMedia = async (question: any) => {
  const media = question?.media;
  if (!media?.src) return error('Missing media URL.');
  if (media.kind === 'video') {
    if (parseYouTubeId(media.src)) return probeYouTube(media.src);
    if (!/^https?:\/\//i.test(media.src)) return error('Use a full video URL.');
    return probeDirectVideo(media.src);
  }
  if (!/^https?:\/\//i.test(media.src)) return error('Use a full image URL.');
  return probeImage(media.src);
};

export const preloadQuestionMedia = async (question: any) => {
  const media = question?.media;
  if (!media?.src) return;

  if (media.kind === 'image') {
    const image = new Image();
    image.src = media.src;
    return;
  }

  const ytId = parseYouTubeId(media.src);
  if (ytId) {
    const image = new Image();
    image.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    return;
  }

  const video = document.createElement('video');
  video.preload = 'metadata';
  video.src = media.src;
};
