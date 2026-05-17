import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import StatusBadge from './StatusBadge';

const relayCopy = {
  local: {
    badge: 'Relay local',
    body: 'This controller can run the show here. For another screen, use cast or mirror unless the relay becomes live.'
  },
  connecting: {
    badge: 'Relay check',
    body: 'Trying to reach the relay. Displays may not follow this controller until it connects.'
  },
  live: {
    badge: 'Relay live',
    body: 'Relay is accepting updates. Remote displays should follow while this controller tab stays open.'
  },
  stale: {
    badge: 'Relay stale',
    body: 'The relay has not confirmed recent updates. Displays may hold the last good frame.'
  },
  error: {
    badge: 'Relay error',
    body: 'The relay is unavailable. Keep the display local and use cast or mirror as the fallback.'
  }
};

const DisplayJoinPanel = ({ link, syncStatus, displayCount, onCopy, onOpen }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const relayInfo = relayCopy[syncStatus] || relayCopy.local;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, {
      margin: 1,
      width: 220,
      color: {
        dark: '#111827',
        light: '#ffffff'
      }
    })
      .then((result) => {
        if (!cancelled) setQrCodeDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setQrCodeDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [link]);

  return (
    <div className="surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-white font-black text-base">Display Join</h3>
          <p className="text-white/60 text-sm">Scan the QR code or copy the display URL to another screen.</p>
        </div>
        <StatusBadge status={syncStatus}>{relayInfo.badge}</StatusBadge>
      </div>

      <div className="grid gap-4 md:grid-cols-[252px,1fr]">
        <div className="rounded-lg bg-white p-4 flex items-center justify-center min-h-[252px]">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="Display QR code" className="w-[220px] h-[220px]" />
          ) : (
            <div className="text-zinc-600 text-sm text-center">QR preview unavailable</div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-white/70 text-sm">
            Displays seen:
            {' '}
            <span className="text-white font-bold">{displayCount}</span>
          </div>
          <div className="field text-sm break-all">{link}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onCopy} className="btn-primary px-4 py-3 text-sm">
              Copy Link
            </button>
            <button type="button" onClick={onOpen} className="btn-secondary px-4 py-3 text-sm">
              Open Display
            </button>
          </div>

          <div className="surface-soft rounded-lg p-3 text-sm text-white/70">
            {relayInfo.body}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisplayJoinPanel;
