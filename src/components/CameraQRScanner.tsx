import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { triggerHaptic, playStartSound, playPauseSound, playResetSound } from '../utils/audio';

interface CameraQRScannerProps {
  currentRoomId: string;
  isOpen: boolean;
  onClose: () => void;
  onActionTriggered: (action: string, payload?: any, roomId?: string) => void;
  onSwitchRoom?: (newRoomId: string) => void;
}

export const CameraQRScanner: React.FC<CameraQRScannerProps> = ({
  currentRoomId,
  isOpen,
  onClose,
  onActionTriggered,
  onSwitchRoom,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);
  const [isCooldown, setIsCooldown] = useState(false);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('お使いのブラウザはカメラアクセスに対応していません。');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasPermission(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'カメラのアクセス許可が拒否されました。ブラウザの設定でカメラを許可してください。'
          : `カメラを起動できませんでした: ${err.message || '不明なエラー'}`
      );
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setLastScannedResult(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // QR Code Processing
  const handleQRDetected = useCallback(
    (codeText: string) => {
      if (isCooldown) return;

      const trimmed = codeText.trim();
      let triggeredAction = '';
      let targetRoom = currentRoomId;
      let payload: any = {};

      // 1. Check embedded custom protocol: synctimer:action:{action}:{roomId}[:optionalParam]
      if (trimmed.startsWith('synctimer:action:')) {
        const parts = trimmed.split(':');
        const act = parts[2];
        const rId = parts[3];
        const extra = parts[4];

        if (rId) targetRoom = rId;
        triggeredAction = act;
        if (act === 'addTime' && extra) {
          payload = { seconds: Number(extra) || 60 };
        }
      }
      // 2. Check URL containing /action?room=...&act=...
      else if (trimmed.includes('/action?') || trimmed.includes('&act=')) {
        try {
          const urlObj = new URL(trimmed, window.location.origin);
          const act = urlObj.searchParams.get('act');
          const rId = urlObj.searchParams.get('room');
          const sec = urlObj.searchParams.get('sec');

          if (act) {
            triggeredAction = act;
            if (rId) targetRoom = rId;
            if (sec) payload = { seconds: Number(sec) };
          }
        } catch {
          // url parsing error fallback
        }
      }
      // 3. Check Room Join URL: e.g. /?room=XYZ
      else if (trimmed.includes('room=')) {
        try {
          const urlObj = new URL(trimmed, window.location.origin);
          const rId = urlObj.searchParams.get('room');
          if (rId && onSwitchRoom && rId !== currentRoomId) {
            triggerHaptic();
            onSwitchRoom(rId);
            setLastScannedResult(`ルーム「${rId}」に参加しました！`);
            setIsCooldown(true);
            setTimeout(() => setIsCooldown(false), 2500);
            return;
          } else {
            // Default action if scanning own room QR is toggle
            triggeredAction = 'toggle';
          }
        } catch {
          // ignore
        }
      } else {
        // Generic barcode or text - let's treat as toggle if it contains toggle or just toggle current
        triggeredAction = 'toggle';
      }

      if (triggeredAction) {
        triggerHaptic();
        if (triggeredAction === 'start' || triggeredAction === 'toggle') {
          playStartSound();
        } else if (triggeredAction === 'pause' || triggeredAction === 'stop') {
          playPauseSound();
        } else if (triggeredAction === 'reset') {
          playResetSound();
        }

        const actionLabels: Record<string, string> = {
          toggle: 'オン / オフ切替 (TOGGLE)',
          start: 'タイマー開始 (ON)',
          pause: '一時停止 (OFF)',
          stop: '停止 (OFF)',
          reset: 'タイマーリセット',
          addTime: `時間延長 (+${payload.seconds || 60}秒)`,
        };

        const label = actionLabels[triggeredAction] || triggeredAction;
        setLastScannedResult(`⚡ QR操作実行: ${label}`);
        setIsCooldown(true);

        onActionTriggered(triggeredAction, payload, targetRoom);

        // Reset cooldown after 2 seconds
        setTimeout(() => {
          setIsCooldown(false);
        }, 2200);
      }
    },
    [currentRoomId, isCooldown, onActionTriggered, onSwitchRoom]
  );

  // Scanning loop
  useEffect(() => {
    if (!isOpen || !hasPermission) return;

    let animId: number;
    let detector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        // @ts-expect-error BarcodeDetector browser experimental
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = null;
      }
    }

    const scanFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState >= 2 && !isCooldown) {
        if (detector) {
          try {
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                handleQRDetected(rawValue);
              }
            }
          } catch {
            // detector failed, will try next frame
          }
        } else if (canvas) {
          // jsQR fallback
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            try {
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(imgData.data, canvas.width, canvas.height, {
                inversionAttempts: 'dontInvert',
              });
              if (qr && qr.data) {
                handleQRDetected(qr.data);
              }
            } catch {
              // frame read error
            }
          }
        }
      }

      animId = requestAnimationFrame(scanFrame);
    };

    animId = requestAnimationFrame(scanFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, hasPermission, isCooldown, handleQRDetected]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/90 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">QRコードスキャン</h3>
              <p className="text-xs text-neutral-400">かざすと即座にオン/オフや操作を実行</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewfinder Area */}
        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder Target Graphic */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark vignette border */}
            <div className="relative w-64 h-64 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.3)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Scanning laser line animation */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse relative top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Success Notification Banner overlay */}
          {lastScannedResult && (
            <div className="absolute top-4 inset-x-4 bg-emerald-500/95 text-white text-sm font-medium py-3 px-4 rounded-xl shadow-lg flex items-center space-x-2 animate-bounce">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="flex-1">{lastScannedResult}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="absolute inset-4 bg-neutral-900/95 border border-red-500/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center text-red-200">
              <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
              <p className="text-sm font-medium mb-4">{errorMessage}</p>
              <button
                onClick={() => startCamera()}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg transition"
              >
                再試行する
              </button>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-neutral-900 flex items-center justify-between border-t border-neutral-800">
          <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>印刷カードや画面のQRにかざしてください</span>
          </div>

          <button
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 transition"
            title="カメラ切り替え"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>反転</span>
          </button>
        </div>
      </div>
    </div>
  );
};
