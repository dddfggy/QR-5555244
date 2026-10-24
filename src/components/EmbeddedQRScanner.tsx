import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Maximize2,
  Minimize2,
  Play,
  Pause,
} from 'lucide-react';
import { triggerHaptic, playStartSound, playPauseSound, playResetSound } from '../utils/audio';

interface EmbeddedQRScannerProps {
  currentRoomId: string;
  onActionTriggered: (action: string, payload?: any, deviceName?: string) => void;
  isTimerRunning: boolean;
}

export const EmbeddedQRScanner: React.FC<EmbeddedQRScannerProps> = ({
  currentRoomId,
  onActionTriggered,
  isTimerRunning,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('user'); // default to user camera on laptops/tablets facing user
  const [lastScannedAction, setLastScannedAction] = useState<string | null>(null);
  const [lastScannedText, setLastScannedText] = useState<string | null>(null);
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
        throw new Error('お使いの環境ではカメラがサポートされていません。');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
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
      console.warn('Camera start error:', err);
      setHasPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'カメラアクセスが許可されていません。'
          : 'カメラを起動できませんでした。'
      );
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive, startCamera, stopCamera]);

  // Handle QR detected
  const handleQRDetected = useCallback(
    (codeText: string) => {
      if (isCooldown) return;

      const trimmed = codeText.trim();
      let triggeredAction = '';
      let targetRoom = currentRoomId;

      // 1. Check embedded custom protocol: synctimer:action:{action}:{roomId}
      if (trimmed.startsWith('synctimer:action:')) {
        const parts = trimmed.split(':');
        triggeredAction = parts[2] || '';
        if (parts[3]) targetRoom = parts[3];
      }
      // 2. Check URL containing /action?room=...&act=...
      else if (trimmed.includes('/action?') || trimmed.includes('&act=') || trimmed.includes('?act=')) {
        try {
          const urlObj = new URL(trimmed, window.location.origin);
          const act = urlObj.searchParams.get('act');
          const rId = urlObj.searchParams.get('room');
          if (act) {
            triggeredAction = act;
            if (rId) targetRoom = rId;
          }
        } catch {
          // ignore
        }
      }
      // 3. Simple text detection (e.g. if plain text QR was made)
      else if (trimmed.toLowerCase() === 'start') {
        triggeredAction = 'start';
      } else if (trimmed.toLowerCase() === 'stop' || trimmed.toLowerCase() === 'pause') {
        triggeredAction = 'pause';
      } else if (trimmed.toLowerCase() === 'reset') {
        triggeredAction = 'reset';
      }

      if (triggeredAction) {
        triggerHaptic();

        let deviceName = 'QRカメラ (認識)';
        let notificationMsg = '';

        if (triggeredAction === 'start') {
          playStartSound();
          deviceName = 'QRコード (START)';
          notificationMsg = '⚡ START QR検知: タイマー開始！';
          setLastScannedAction('start');
        } else if (triggeredAction === 'stop' || triggeredAction === 'pause') {
          playPauseSound();
          deviceName = 'QRコード (STOP)';
          notificationMsg = '🛑 STOP QR検知: タイマー停止！';
          setLastScannedAction('stop');
        } else if (triggeredAction === 'reset') {
          playResetSound();
          deviceName = 'QRコード (RESET)';
          notificationMsg = '🔄 RESET QR検知: タイマーリセット！';
          setLastScannedAction('reset');
        } else if (triggeredAction === 'toggle') {
          if (isTimerRunning) {
            playPauseSound();
            deviceName = 'QRコード (TOGGLE->STOP)';
            notificationMsg = '🛑 TOGGLE QR検知: タイマー停止！';
            setLastScannedAction('stop');
          } else {
            playStartSound();
            deviceName = 'QRコード (TOGGLE->START)';
            notificationMsg = '⚡ TOGGLE QR検知: タイマー開始！';
            setLastScannedAction('start');
          }
        }

        setLastScannedText(notificationMsg);
        setIsCooldown(true);

        onActionTriggered(triggeredAction, {}, deviceName);

        // Cooldown for 1.8 seconds to avoid continuous triggering
        setTimeout(() => {
          setIsCooldown(false);
          setLastScannedText(null);
          setLastScannedAction(null);
        }, 1800);
      }
    },
    [currentRoomId, isCooldown, isTimerRunning, onActionTriggered]
  );

  // Scanning loop using requestAnimationFrame + BarcodeDetector / jsQR
  useEffect(() => {
    if (!isActive || !hasPermission) return;

    let animId: number;
    let detector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        // @ts-expect-error BarcodeDetector experimental
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
            // next frame
          }
        } else if (canvas) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 240;
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
  }, [isActive, hasPermission, isCooldown, handleQRDetected]);

  return (
    <div className="w-full max-w-xl mx-auto px-4 mt-2 mb-4">
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 shadow-xl backdrop-blur-md">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isActive && hasPermission
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-neutral-600'
              }`}
            />
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>QR常時認識カメラ</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                START / STOP 待機中
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Flip camera */}
            {isActive && hasPermission && (
              <button
                onClick={() =>
                  setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
                }
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg bg-neutral-800 hover:bg-neutral-700 transition"
                title="インカメラ / アウトカメラ切替"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Toggle Camera On/Off */}
            <button
              onClick={() => setIsActive(!isActive)}
              className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                isActive
                  ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                  : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
              }`}
            >
              {isActive ? (
                <>
                  <CameraOff className="w-3 h-3 text-neutral-400" />
                  <span>カメラ停止</span>
                </>
              ) : (
                <>
                  <Camera className="w-3 h-3 text-indigo-400" />
                  <span>カメラ起動</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        {isActive ? (
          <div className="relative aspect-video sm:aspect-[21/9] w-full bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-neutral-800">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Reticle Graphic */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`relative w-44 h-32 sm:w-56 sm:h-36 border-2 rounded-2xl transition-all duration-300 ${
                  lastScannedAction === 'start'
                    ? 'border-emerald-400 shadow-[0_0_25px_#34d399] bg-emerald-500/10'
                    : lastScannedAction === 'stop'
                    ? 'border-rose-400 shadow-[0_0_25px_#f43f5e] bg-rose-500/10'
                    : 'border-white/40'
                }`}
              >
                {/* Scanning Laser Line */}
                {!isCooldown && (
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse relative top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {/* Success Overlay Banner */}
            {lastScannedText && (
              <div
                className={`absolute inset-x-4 top-3 py-2 px-3 rounded-xl text-xs font-bold text-white shadow-xl flex items-center justify-center space-x-2 animate-bounce ${
                  lastScannedAction === 'start' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{lastScannedText}</span>
              </div>
            )}

            {/* Permission / Error Prompt */}
            {errorMessage && (
              <div className="absolute inset-0 bg-neutral-900/90 p-4 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-7 h-7 text-amber-400 mb-1" />
                <p className="text-xs text-neutral-300 mb-2">{errorMessage}</p>
                <button
                  onClick={startCamera}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-semibold rounded-lg"
                >
                  カメラの許可を再試行
                </button>
              </div>
            )}

            {/* Helpful Subtitle */}
            <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none">
              <span className="bg-black/70 backdrop-blur-sm text-neutral-300 text-[10px] px-3 py-1 rounded-full font-medium">
                ここに「START」または「STOP」のQRコードをかざしてください
              </span>
            </div>
          </div>
        ) : (
          <div className="py-6 px-4 bg-neutral-950/60 rounded-2xl border border-neutral-800 text-center">
            <Camera className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">
              カメラ認識は一時停止中です。「カメラ起動」を押すとQRコードによるスタート/ストップ認識を再開します。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
