import { useEffect, useState } from 'react';

export const useInstallPrompt = () => {
  const [promptEvent, setPromptEvent] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptToInstall = async () => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    setPromptEvent(null);
    return true;
  };

  return {
    canInstall: Boolean(promptEvent),
    promptToInstall
  };
};
