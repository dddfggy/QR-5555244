import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function useOnlineStatus() {
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

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowToast(true);
    } else {
      // Temporarily show back online toast
      const t = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  if (isOnline && !showToast) return null;

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-semibold shadow-2xl transition-all duration-300 ${
        isOnline
          ? 'bg-emerald-600 text-white'
          : 'bg-amber-600 text-white border border-amber-400/40 animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>オンライン復帰 — リアルタイム同期中</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>オフラインモード — キャッシュで稼働中</span>
        </>
      )}
    </div>
  );
};
