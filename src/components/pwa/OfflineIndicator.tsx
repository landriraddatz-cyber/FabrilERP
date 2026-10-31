import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500/95 dark:bg-amber-600/95 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm animate-pulse">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Modo Offline — Dados salvos no aparelho</span>
    </div>
  );
};
