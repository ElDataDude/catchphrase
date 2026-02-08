import React, { useEffect, useMemo, useRef, useState } from 'react';

const parseYouTubeId = (input) => {
  if (!input) return null;

  let url;
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
    const head = parts[0];
    const id = parts[1];
    if ((head === 'embed' || head === 'shorts' || head === 'live' || head === 'v') && id) {
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
  }

  return null;
};

const clampInt = (value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
};

const VideoDisplay = ({ url, startTime = 0, duration = 10 }) => {
  const ytId = useMemo(() => parseYouTubeId(url), [url]);
  const videoRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const start = clampInt(startTime, { min: 0 });
  const dur = clampInt(duration, { min: 0, max: 600 });
  const end = dur > 0 ? start + dur : null;

  useEffect(() => {
    setIsLoading(Boolean(url));
    setError(null);
  }, [url, start, dur]);

  // Loop a clipped segment for direct video files.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || ytId) return;
    if (!url) return;

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      try {
        if (start > 0 && video.duration && start < video.duration) {
          video.currentTime = start;
        }
        // Autoplay is most reliable when muted.
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch {
        // ignore
      }
    };

    const handleTimeUpdate = () => {
      if (!end) return;
      if (video.currentTime >= end) {
        video.currentTime = start;
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [url, ytId, start, end]);

  if (!url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-white/80">
        <div className="text-center">
          <div className="text-xl font-bold">No video set</div>
          <div className="text-sm text-white/50 mt-2">Add a YouTube or MP4 URL in Setup</div>
        </div>
      </div>
    );
  }

  if (!ytId && !/^https?:\/\//i.test(url)) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-white/80 p-4">
        <div className="text-center">
          <div className="text-red-400 font-bold mb-1">Invalid video URL</div>
          <div className="text-sm text-white/50">Use a full https:// URL.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {ytId ? (
        <iframe
          title="Quiz video"
          className="w-full h-full"
          referrerPolicy="origin-when-cross-origin"
          allow="autoplay; encrypted-media; picture-in-picture"
          // Muted autoplay is the most reliable cross-platform approach.
          src={(() => {
            const params = new URLSearchParams({
              autoplay: '1',
              mute: '1',
              controls: '0',
              rel: '0',
              playsinline: '1',
              modestbranding: '1',
              iv_load_policy: '3',
              disablekb: '1',
              fs: '0',
              start: String(start)
            });
            if (end !== null) params.set('end', String(end));
            return `https://www.youtube-nocookie.com/embed/${ytId}?${params.toString()}`;
          })()}
          onLoad={() => setIsLoading(false)}
        />
      ) : (
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-contain"
          controls={false}
          playsInline
          muted
          autoPlay
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onError={() => {
            setError('Failed to load video');
            setIsLoading(false);
          }}
        />
      )}

      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
          <div className="text-red-400 font-bold mb-2">Video Error</div>
          <div className="text-sm text-white/60 text-center max-w-md">{error}</div>
        </div>
      )}
    </div>
  );
};

export default VideoDisplay;

