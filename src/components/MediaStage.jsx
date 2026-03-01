import React from 'react';
import ImageDisplay from './ImageDisplay';
import VideoDisplay from './VideoDisplay';

const MediaStage = ({ media, alt }) => {
  if (!media) return null;
  if (media.kind === 'video') {
    return (
      <VideoDisplay
        url={media.src}
        startTime={media.startTime}
        duration={media.duration}
        fitMode={media.fitMode}
      />
    );
  }
  return <ImageDisplay imageUrl={media.src} alt={alt} fitMode={media.fitMode} />;
};

export default MediaStage;
