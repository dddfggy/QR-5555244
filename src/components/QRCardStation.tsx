import React, { useState, useEffect } from 'react';
import { generateQRDataUrl, getActionUrl } from '../utils/qr';
import { Play, Pause, RotateCcw, Smartphone, Printer, ExternalLink, Sparkles } from 'lucide-react';

interface QRCardStationProps {
  roomId: string;
  onOpenDigitalCard: () => void;
  onOpenPrintCards: () => void;
}

export const QRCardStation: React.FC<QRCardStationProps> = ({
  roomId,
  onOpenDigitalCard,
  onOpenPrintCards,
}) => {
  const [startQr, setStartQr] = useState<string>('');
  const [stopQr, setStopQr] = useState<string>('');
  const [resetQr, setResetQr] = useState<string>('');

  useEffect(() => {
    const startUrl = getActionUrl(roomId, 'start');
    const stopUrl = getActionUrl(roomId, 'stop');
    const resetUrl = getActionUrl(roomId, 'reset');

    generateQRDataUrl(startUrl, '#047857').then(setStartQr);
    generateQRDataUrl(stopUrl, '#b91c1c').then(setStopQr);
    generateQRDataUrl(resetUrl, '#1d4ed8').then(setResetQr);
  }, [roomId]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 mt-2 mb-6">
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 shadow-xl backdrop-blur-md">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-neutral-800 mb-4 gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>操作用 QRコードカード</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              スマホの標準カメラでスキャンするか、タイマー画面のカメラにかざして操作します
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenDigitalCard}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>スマホをQRカード化</span>
            </button>

            <button
              onClick={onOpenPrintCards}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>印刷用シート</span>
            </button>
          </div>
        </div>

        {/* QR Code Cards Grid: START, STOP, RESET */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* START CARD */}
          <div className="bg-neutral-950 border border-emerald-900/50 hover:border-emerald-500/60 rounded-2xl p-3.5 flex flex-col items-center text-center transition shadow-lg group">
            <div className="flex items-center space-x-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider mb-2.5">
              <Play className="w-3 h-3 fill-current" />
              <span>START (開始)</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl mb-2.5 shadow-md">
              {startQr ? (
                <img src={startQr} alt="START QR" className="w-32 h-32 object-contain" />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-xs text-neutral-400">
                  生成中...
                </div>
              )}
            </div>

            <span className="text-[11px] text-neutral-300 font-bold">タイマーをスタート</span>
            <span className="text-[10px] text-neutral-500 mt-0.5">かざす または スマホでスキャン</span>
          </div>

          {/* STOP CARD */}
          <div className="bg-neutral-950 border border-rose-900/50 hover:border-rose-500/60 rounded-2xl p-3.5 flex flex-col items-center text-center transition shadow-lg group">
            <div className="flex items-center space-x-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider mb-2.5">
              <Pause className="w-3 h-3 fill-current" />
              <span>STOP (停止)</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl mb-2.5 shadow-md">
              {stopQr ? (
                <img src={stopQr} alt="STOP QR" className="w-32 h-32 object-contain" />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-xs text-neutral-400">
                  生成中...
                </div>
              )}
            </div>

            <span className="text-[11px] text-neutral-300 font-bold">タイマーをストップ</span>
            <span className="text-[10px] text-neutral-500 mt-0.5">かざす または スマホでスキャン</span>
          </div>

          {/* RESET CARD */}
          <div className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-3.5 flex flex-col items-center text-center transition shadow-lg group">
            <div className="flex items-center space-x-1.5 bg-neutral-800 text-neutral-300 border border-neutral-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5">
              <RotateCcw className="w-3 h-3" />
              <span>RESET (リセット)</span>
            </div>

            <div className="bg-white p-2.5 rounded-xl mb-2.5 shadow-md">
              {resetQr ? (
                <img src={resetQr} alt="RESET QR" className="w-32 h-32 object-contain" />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center text-xs text-neutral-400">
                  生成中...
                </div>
              )}
            </div>

            <span className="text-[11px] text-neutral-300 font-bold">初期状態に戻す</span>
            <span className="text-[10px] text-neutral-500 mt-0.5">かざす または スマホでスキャン</span>
          </div>
        </div>
      </div>
    </div>
  );
};
