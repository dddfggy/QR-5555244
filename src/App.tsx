import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TimerSession, TimerMode } from './types';
import { Navbar } from './components/Navbar';
import { DisplayTimer } from './components/DisplayTimer';
import { EmbeddedQRScanner } from './components/EmbeddedQRScanner';
import { QRCardStation } from './components/QRCardStation';
import { RemoteController } from './components/RemoteController';
import { HistoryAndLaps } from './components/HistoryAndLaps';
import { QRModal } from './components/QRModal';
import { DigitalQRCardModal } from './components/DigitalQRCardModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  setSoundEnabled,
  isSoundEnabled,
  playStartSound,
  playPauseSound,
  playResetSound,
  playAlarmSound,
  triggerHaptic,
} from './utils/audio';
import {
  QrCode,
  Camera,
  Smartphone,
  Lock,
  Printer,
  Sparkles,
  Share2,
  BarChart3,
  FileCode,
} from 'lucide-react';

const createInitialSession = (id: string): TimerSession => ({
  id,
  title: id === 'main' ? 'メインタイマー' : `ルーム: ${id}`,
  mode: 'countdown',
  isRunning: false,
  durationMs: 3 * 60 * 1000,
  remainingMs: 3 * 60 * 1000,
  elapsedMs: 0,
  lastStartedAt: null,
  pomodoroConfig: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    roundsBeforeLongBreak: 4,
  },
  pomodoroStage: 'work',
  pomodoroRound: 1,
  laps: [],
  history: [],
  connectedClients: 1,
  createdAt: Date.now(),
});

export default function App() {
  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      if (r && r.trim()) return r.trim().toLowerCase();
    }
    return 'main';
  });

  const [session, setSession] = useState<TimerSession>(() => createInitialSession(roomId));
  const [currentDisplayMs, setCurrentDisplayMs] = useState<number>(session.remainingMs);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isDigitalCardOpen, setIsDigitalCardOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [qrOnlyMode, setQrOnlyMode] = useState<boolean>(true); // Defaults to QR-only operation
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundActive, setSoundActive] = useState(true);

  const [deviceLabel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      return isMobile ? 'スマホ端末' : 'タイマー端末';
    }
    return 'タイマー端末';
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const sessionRef = useRef<TimerSession>(session);
  sessionRef.current = session;

  // Sound toggle
  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Connect WebSocket
  const connectWebSocket = useCallback((targetRoomId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', roomId: targetRoomId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sync' && data.session) {
            const newSession = data.session as TimerSession;
            const prev = sessionRef.current;

            if (data.event === 'timer:finished') {
              playAlarmSound();
              triggerHaptic();
            } else if (data.event === 'timer:started' && !prev.isRunning) {
              playStartSound();
            } else if (data.event === 'timer:paused' && prev.isRunning) {
              playPauseSound();
            } else if (data.event === 'timer:reset') {
              playResetSound();
            }

            setSession(newSession);
          }
        } catch (e) {
          console.error('WS parse error', e);
        }
      };

      ws.onclose = () => {
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWebSocket(targetRoomId);
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
    }
  }, []);

  // Dispatch action to server
  const sendAction = useCallback(
    async (action: string, payload: any = {}, customDeviceName?: string) => {
      const devName = customDeviceName || deviceLabel;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'action',
            roomId,
            action,
            payload,
            deviceName: devName,
          })
        );
        return;
      }

      // HTTP fallback
      try {
        const res = await fetch(`/api/room/${encodeURIComponent(roomId)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            payload,
            deviceName: devName,
          }),
        });
        const data = await res.json();
        if (data.session) {
          setSession(data.session);
        }
      } catch (err) {
        console.error('HTTP action fallback error:', err);
      }
    },
    [roomId, deviceLabel]
  );

  // Switch Room
  const handleSwitchRoom = (newRoom: string) => {
    const clean = newRoom.trim().toLowerCase();
    if (!clean || clean === roomId) return;

    setRoomId(clean);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', clean);
      window.history.pushState({}, '', url.toString());
    }

    setSession(createInitialSession(clean));
    connectWebSocket(clean);
  };

  useEffect(() => {
    connectWebSocket(roomId);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const actionParam = params.get('action') || params.get('actionResult');
      if (actionParam) {
        params.delete('action');
        params.delete('actionResult');
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
      }
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [roomId, connectWebSocket]);

  // Display loop
  useEffect(() => {
    let animId: number;

    const updateDisplay = () => {
      const current = sessionRef.current;
      const now = Date.now();

      if (current.isRunning && current.lastStartedAt) {
        const diff = now - current.lastStartedAt;
        if (current.mode === 'stopwatch') {
          setCurrentDisplayMs(current.elapsedMs + diff);
        } else {
          const remaining = Math.max(0, current.remainingMs - diff);
          setCurrentDisplayMs(remaining);
        }
      } else {
        if (current.mode === 'stopwatch') {
          setCurrentDisplayMs(current.elapsedMs);
        } else {
          setCurrentDisplayMs(current.remainingMs);
        }
      }

      animId = requestAnimationFrame(updateDisplay);
    };

    animId = requestAnimationFrame(updateDisplay);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSelectPreset = (ms: number) => {
    sendAction('setDuration', { durationMs: ms });
  };

  const handleSetMode = (mode: TimerMode) => {
    sendAction('setMode', { mode });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        session={session}
        currentRoomId={roomId}
        onSwitchRoom={handleSwitchRoom}
        onOpenQR={() => setIsQRModalOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* QR Only Mode Callout Banner */}
      <div className="w-full bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-neutral-950 border-b border-neutral-800/80 py-2.5 px-4 print:hidden">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between text-xs text-neutral-300 gap-2">
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-white">
              QRコード制御対応: START &amp; STOP はQRコード認識で動作中
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={() => setIsAnalyticsOpen(true)}
              className="text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>統計グラフ (1日/1週/1ヶ月)</span>
            </button>
            <span className="text-neutral-700">|</span>
            <button
              onClick={() => setIsDigitalCardOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>スマホQRカード</span>
            </button>
            <span className="text-neutral-700">|</span>
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 font-bold underline flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>印刷用カード</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center py-6 sm:py-8">
        {/* Big Display Timer */}
        <DisplayTimer
          session={session}
          currentDisplayMs={currentDisplayMs}
          showMilliseconds={true}
          onSelectPreset={handleSelectPreset}
          onSetMode={handleSetMode}
          onSetPomodoroConfig={(config) => sendAction('setPomodoroConfig', config)}
          onSetPomodoroStage={(stage) => sendAction('setPomodoroStage', { stage })}
        />

        {/* Integrated Always-Listening Camera Scanner */}
        <EmbeddedQRScanner
          currentRoomId={roomId}
          onActionTriggered={sendAction}
          isTimerRunning={session.isRunning}
        />

        {/* Dedicated QR Card Station (START / STOP / RESET) */}
        <QRCardStation
          roomId={roomId}
          onOpenDigitalCard={() => setIsDigitalCardOpen(true)}
          onOpenPrintCards={() => setIsQRModalOpen(true)}
        />

        {/* Remote Controller (with QR-only lock) */}
        <RemoteController
          session={session}
          onAction={sendAction}
          onOpenQR={() => setIsQRModalOpen(true)}
          onOpenDigitalCard={() => setIsDigitalCardOpen(true)}
          soundEnabled={soundActive}
          onToggleSound={handleToggleSound}
          qrOnlyMode={qrOnlyMode}
          onToggleQrOnlyMode={() => setQrOnlyMode(!qrOnlyMode)}
        />

        {/* History and Laps Sync Log */}
        <HistoryAndLaps session={session} />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-800/80 py-4 px-4 text-center text-xs text-neutral-500 print:hidden">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span>SyncTimer QR</span>
            <span>•</span>
            <span>QRコードスタート / ストップ専用 &amp; リアルタイム同期</span>
          </div>
          <div className="flex items-center space-x-4 text-neutral-400">
            <button
              onClick={() => setIsAnalyticsOpen(true)}
              className="hover:text-amber-400 transition flex items-center gap-1 font-semibold"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>1日/1週間/1ヶ月 統計グラフ</span>
            </button>
            <button
              onClick={() => setIsDigitalCardOpen(true)}
              className="hover:text-emerald-400 transition flex items-center gap-1 font-semibold"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>スマホQRカード</span>
            </button>
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="hover:text-indigo-400 transition flex items-center gap-1 font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>印刷シート</span>
            </button>
            <a
              href="/download-html"
              download="SyncTimer_QR.html"
              className="hover:text-cyan-400 transition flex items-center gap-1 font-semibold text-neutral-400 hover:text-white"
              title="オフラインでも動作する単一HTMLファイルを保存"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>HTML版DL</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Full QR Modal & Printable Sheet */}
      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        roomId={roomId}
        onActionTriggered={sendAction}
      />

      {/* Digital QR Card Screen (for holding phone up to timer camera) */}
      <DigitalQRCardModal
        isOpen={isDigitalCardOpen}
        onClose={() => setIsDigitalCardOpen(false)}
        roomId={roomId}
      />

      {/* Analytics Modal (1 Day / 1 Week / 1 Month statistics & charts) */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        roomId={roomId}
      />

      {/* Offline PWA Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
