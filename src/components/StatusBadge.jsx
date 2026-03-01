import React from 'react';
import { statusLabelMap } from '../lib/syncClient';

const toneMap = {
  idle: 'badge-muted',
  ready: 'badge-success',
  warn: 'badge-warning',
  error: 'badge-danger',
  local: 'badge-muted',
  connecting: 'badge-warning',
  live: 'badge-success',
  stale: 'badge-warning'
};

const StatusBadge = ({ status, children }) => {
  const label = children || statusLabelMap[status] || status;
  return <span className={`badge ${toneMap[status] || 'badge-muted'}`}>{label}</span>;
};

export default StatusBadge;
