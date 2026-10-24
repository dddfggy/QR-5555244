import React, { useState } from 'react';
import { TimerSession } from '../types';
import {
  Timer,
  Users,
  QrCode,
  Maximize2,
  Minimize2,
  Edit3,
  Check,
  Radio,
  BarChart3,
  FileCode,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  session: TimerSession;
  currentRoomId: string;
  onSwitchRoom: (newRoomId: string) => void;
  onOpenQR: () => void;
  onOpenAnalytics: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  currentRoomId,
  onSwitchRoom,
  onOpenQR,
  onOpenAnalytics,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [roomInput, setRoomInput] = useState(currentRoomId);

  const handleSubmitRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomInput.trim()) {
      onSwitchRoom(roomInput.trim().toLowerCase());
      setIsEditingRoom(false);
    }
  };

  return (
    <header className="w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3 print:hidden">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Logo and App Title */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm sm:text-base tracking-tight leading-none flex items-center gap-1.5">
              <span>SyncTimer QR</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono px-1.5 py-0.5 rounded-full font-semibold">
                LIVE
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-neutral-400 mt-0.5 hidden xs:block">
              QR操作 & リアルタイム共有タイマー
            </p>
          </div>
        </div>

        {/* Center: Room Indicator / Switcher */}
        <div className="flex items-center">
          {isEditingRoom ? (
            <form onSubmit={handleSubmitRoom} className="flex items-center gap-1">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="ルーム名を入力"
                autoFocus
                className="bg-neutral-900 border border-indigo-500 text-white text-xs rounded-xl px-2.5 py-1.5 font-mono focus:outline-none w-32 sm:w-40"
              />
              <button
                type="submit"
                className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs"
              >
                <Check className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setRoomInput(currentRoomId);
                setIsEditingRoom(true);
              }}
              className="flex items-center space-x-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-full px-3 py-1.5 transition text-xs group"
              title="クリックしてルームを変更"
            >
              <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span className="text-neutral-400 text-[11px]">ルーム:</span>
              <span className="text-white font-mono font-bold">{currentRoomId}</span>
              <Edit3 className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 ml-0.5" />
            </button>
          )}
        </div>

        {/* Right Actions: Analytics & Connected Devices & Fullscreen */}
        <div className="flex items-center space-x-2">
          {/* Analytics Button */}
          <button
            onClick={onOpenAnalytics}
            className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl transition"
            title="統計グラフを表示 (日/週/月)"
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">統計グラフ</span>
          </button>

          {/* Standalone HTML download */}
          <a
            href="/download-html"
            download="SyncTimer_QR.html"
            className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl transition"
            title="単一HTMLファイルをダウンロード (オフライン稼働対応)"
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">HTML保存</span>
          </a>

          {/* Active Devices Badge */}
          <div
            className="flex items-center space-x-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs px-2.5 sm:px-3 py-1.5 rounded-xl"
            title="現在このタイマーに接続中の端末数"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-emerald-400">
              {Math.max(1, session.connectedClients || 1)}
            </span>
            <span className="text-neutral-400 text-[11px] hidden md:inline">台同期中</span>
          </div>

          {/* In-App PWA Install Button */}
          <PWAInstallButton />

          {/* Quick QR Share button */}
          <button
            onClick={onOpenQR}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl transition shadow-md shadow-indigo-600/30"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">共有・QR</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 text-neutral-400 hover:text-white rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition"
            title={isFullscreen ? '全画面解除' : '大画面表示 (プロジェクター/TV)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
