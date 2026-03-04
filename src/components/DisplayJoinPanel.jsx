import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import StatusBadge from './StatusBadge';

const DisplayJoinPanel = ({ link, syncStatus, displayCount, onCopy, onOpen }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, {
      margin: 1,
      width: 220,
      color: {
        dark: '#f8fafc',
        light: '#00000000'
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
          <p className="text-white/60 text-sm">Scan the QR code or copy the display URL to another device.</p>
        </div>
        <StatusBadge status={syncStatus} />
      </div>

      <div className="grid gap-4 md:grid-cols-[220px,1fr]">
        <div className="surface-soft rounded-2xl p-4 flex items-center justify-center min-h-[220px]">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="Display QR code" className="w-[220px] h-[220px]" />
          ) : (
            <div className="text-white/50 text-sm text-center">QR preview unavailable</div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-white/70 text-sm">
            Displays connected:
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

          {syncStatus !== 'live' && (
            <div className="surface-soft rounded-2xl p-3 text-sm text-white/70">
              If cross-device sync is flaky, keep the display on the same browser session and cast or mirror that tab.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisplayJoinPanel;
