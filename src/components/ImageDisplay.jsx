import React, { useEffect, useState } from 'react';

const ImageDisplay = ({ imageUrl }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setIsLoading(false);
      setHasError(false);
      return;
    }
    setIsLoading(true);
    setHasError(false);
  }, [imageUrl]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      {imageUrl && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-white text-xl font-extrabold">Loading image...</div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center text-white p-4">
            <div className="text-4xl mb-3 font-black">!</div>
            <div className="text-xl font-extrabold">Image failed to load</div>
            <div className="text-sm text-white/60 mt-2">Check the URL and try again</div>
          </div>
        </div>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Quiz question"
          className="w-full h-full object-cover"
          onLoad={handleLoad}
          onError={handleError}
          style={{ display: hasError ? 'none' : 'block' }}
        />
      )}

      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="text-white/80 text-xl font-extrabold">No image set</div>
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
