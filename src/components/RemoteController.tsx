import React, { useState } from 'react';
import { TimerSession } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  Lock,
  Unlock,
  QrCode,
  Smartphone,
  Camera,
  Volume2,
  VolumeX,
  AlertTriangle,
} from 'lucide-react';
import { triggerHaptic } from '../utils/audio';

interface RemoteControllerProps {
  session: TimerSession;
  onAction: (action: string, payload?: any, deviceName?: string) => void;
  onOpenQR: () => void;
  onOpenDigitalCard: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  qrOnlyMode: boolean;
  onToggleQrOnlyMode: () => void;
}

export const RemoteController: React.FC<RemoteControllerProps> = ({
  session,
  onAction,
  onOpenQR,
  onOpenDigitalCard,
  soundEnabled,
  onToggleSound,
  qrOnlyMode,
  onToggleQrOnlyMode,
}) => {
  const [showQrNotice, setShowQrNotice] = useState(false);

  const handleManualToggleAttempt = () => {
    triggerHaptic();
    if (qrOnlyMode) {
      setShowQrNotice(true);
      setTimeout(() => setShowQrNotice(false), 3000);
      return;
    }
    onAction('toggle');
  };

  const handleReset = () => {
    triggerHaptic();
    onAction('reset', {}, '手動リセット');
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 mt-1 mb-4">
      {/* QR Only Mode Banner / Toggle */}
      <div className="flex items-center justify-between bg-neutral-900/60 border border-neutral-800 rounded-2xl px-4 py-2 mb-3 text-xs">
        <div className="flex items-center space-x-2">
          {qrOnlyMode ? (
            <Lock className="w-4 h-4 text-emerald-400" />
          ) : (
            <Unlock className="w-4 h-4 text-neutral-400" />
          )}
          <span className="font-bold text-neutral-200">
            {qrOnlyMode ? 'QRコード専用モード (推奨)' : '通常手動モード'}
          </span>
          <span className="text-[10px] text-neutral-400 hidden sm:inline">
            {qrOnlyMode ? 'スタート/ストップはQRコードでのみ操作可能' : '画面タップでも操作可能'}
          </span>
        </div>

        <button
          onClick={onToggleQrOnlyMode}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition border ${
            qrOnlyMode
              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
              : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
          }`}
        >
          {qrOnlyMode ? '🔒 QR専用中' : '🔓 手動操作可'}
        </button>
      </div>

      {/* Main Start / Stop Button Area */}
      <div className="relative">
        {/* QR Notice Tooltip */}
        {showQrNotice && (
          <div className="absolute -top-12 inset-x-0 mx-auto w-fit bg-amber-500 text-black font-bold text-xs py-1.5 px-4 rounded-full shadow-2xl flex items-center gap-1.5 animate-bounce z-20">
            <AlertTriangle className="w-4 h-4" />
            <span>QRコード専用モードです。START / STOP のQRコードをかざしてください！</span>
          </div>
        )}

        <button
          onClick={handleManualToggleAttempt}
          className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center space-x-3 transition-all duration-200 transform active:scale-[0.98] shadow-xl ${
            qrOnlyMode
              ? 'bg-neutral-800/80 border-2 border-dashed border-neutral-700 text-neutral-300 hover:border-emerald-500/50'
              : session.isRunning
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white shadow-rose-900/30'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-900/30'
          }`}
        >
          {qrOnlyMode ? (
            <>
              <Lock className="w-5 h-5 text-emerald-400" />
              <span>
                {session.isRunning
                  ? '動作中 (STOP のQRコードをかざして停止)'
                  : '停止中 (START のQRコードをかざして開始)'}
              </span>
            </>
          ) : session.isRunning ? (
            <>
              <Pause className="w-6 h-6 fill-current" />
              <span>タイマー停止 (OFF)</span>
            </>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current ml-1" />
              <span>タイマー開始 (ON)</span>
            </>
          )}
        </button>
      </div>

      {/* Fast QR Action Helpers */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <button
          onClick={onOpenDigitalCard}
          className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-xl transition"
        >
          <Smartphone className="w-4 h-4" />
          <span>スマホQRカード</span>
        </button>

        <button
          onClick={onOpenQR}
          className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition"
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>全QRコード表示</span>
        </button>

        <button
          onClick={handleReset}
          className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition"
        >
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span>リセット</span>
        </button>
      </div>
    </div>
  );
};
