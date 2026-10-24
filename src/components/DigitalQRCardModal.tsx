import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Smartphone, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { generateQRDataUrl, getActionUrl } from '../utils/qr';

interface DigitalQRCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const DigitalQRCardModal: React.FC<DigitalQRCardModalProps> = ({ isOpen, onClose, roomId }) => {
  const [activeCard, setActiveCard] = useState<'start' | 'stop' | 'reset'>('start');
  const [startQr, setStartQr] = useState<string>('');
  const [stopQr, setStopQr] = useState<string>('');
  const [resetQr, setResetQr] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const startUrl = getActionUrl(roomId, 'start');
    const stopUrl = getActionUrl(roomId, 'stop');
    const resetUrl = getActionUrl(roomId, 'reset');

    generateQRDataUrl(startUrl, '#047857').then(setStartQr);
    generateQRDataUrl(stopUrl, '#b91c1c').then(setStopQr);
    generateQRDataUrl(resetUrl, '#1d4ed8').then(setResetQr);
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-6 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-2 text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">
          <Smartphone className="w-4 h-4 text-indigo-400" />
          <span>デジタルQRカード</span>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          この画面をタイマー端末のカメラにかざしてください
        </p>

        {/* Card Selector Buttons */}
        <div className="grid grid-cols-3 gap-1.5 w-full bg-neutral-950 p-1 rounded-2xl mb-5 border border-neutral-800">
          <button
            onClick={() => setActiveCard('start')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center space-x-1 transition ${
              activeCard === 'start'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/50'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>START</span>
          </button>

          <button
            onClick={() => setActiveCard('stop')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center space-x-1 transition ${
              activeCard === 'stop'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/50'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>STOP</span>
          </button>

          <button
            onClick={() => setActiveCard('reset')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center space-x-1 transition ${
              activeCard === 'reset'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>

        {/* QR Display Frame */}
        <div
          className={`w-full aspect-square max-w-[280px] p-4 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
            activeCard === 'start'
              ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-950/40 border-2 border-emerald-500'
              : activeCard === 'stop'
              ? 'bg-gradient-to-b from-rose-500/20 to-rose-950/40 border-2 border-rose-500'
              : 'bg-gradient-to-b from-blue-500/20 to-blue-950/40 border-2 border-blue-500'
          }`}
        >
          {/* Card Badge */}
          <div className="mb-2">
            {activeCard === 'start' && (
              <span className="bg-emerald-500 text-black font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow">
                <Play className="w-3 h-3 fill-current" />
                START (タイマー開始)
              </span>
            )}
            {activeCard === 'stop' && (
              <span className="bg-rose-500 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow">
                <Pause className="w-3 h-3 fill-current" />
                STOP (タイマー停止)
              </span>
            )}
            {activeCard === 'reset' && (
              <span className="bg-blue-500 text-white font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow">
                <RotateCcw className="w-3 h-3" />
                RESET (初期化)
              </span>
            )}
          </div>

          {/* QR Image */}
          <div className="bg-white p-3 rounded-2xl shadow-xl">
            {activeCard === 'start' && startQr && (
              <img src={startQr} alt="START QR" className="w-48 h-48 object-contain" />
            )}
            {activeCard === 'stop' && stopQr && (
              <img src={stopQr} alt="STOP QR" className="w-48 h-48 object-contain" />
            )}
            {activeCard === 'reset' && resetQr && (
              <img src={resetQr} alt="RESET QR" className="w-48 h-48 object-contain" />
            )}
          </div>

          <span className="text-[11px] font-mono text-neutral-400 mt-2">
            ROOM: <strong className="text-white">{roomId}</strong>
          </span>
        </div>

        {/* Quick Flip CTA */}
        <div className="mt-5 w-full flex items-center justify-between gap-2">
          {activeCard !== 'start' ? (
            <button
              onClick={() => setActiveCard('start')}
              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START に切替</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveCard('stop')}
              className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>STOP に切替</span>
            </button>
          )}

          <button
            onClick={() => setActiveCard('reset')}
            className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-xl transition"
          >
            リセット
          </button>
        </div>
      </div>
    </div>
  );
};
