import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Printer,
  Download,
  ExternalLink,
  Layers,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { generateQRDataUrl, getRoomUrl, getActionCards, QRActionCard } from '../utils/qr';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onActionTriggered?: (action: string, payload?: any) => void;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, roomId, onActionTriggered }) => {
  const [activeTab, setActiveTab] = useState<'share' | 'actions' | 'print'>('share');
  const [roomQrUrl, setRoomQrUrl] = useState<string>('');
  const [actionQrs, setActionQrs] = useState<{ [id: string]: string }>({});
  const [copied, setCopied] = useState(false);

  const roomUrl = getRoomUrl(roomId);
  const actionCards = getActionCards(roomId);

  useEffect(() => {
    if (!isOpen) return;

    // Generate room QR
    generateQRDataUrl(roomUrl, '#0f172a').then((data) => {
      setRoomQrUrl(data);
    });

    // Generate action cards QRs
    const loadActionQrs = async () => {
      const qrs: { [id: string]: string } = {};
      for (const card of actionCards) {
        qrs[card.id] = await generateQRDataUrl(card.url, '#000000');
      }
      setActionQrs(qrs);
    };

    loadActionQrs();
  }, [isOpen, roomId, roomUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadQR = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:border-none print:bg-white print:text-black">
        {/* Modal Header (hidden during print) */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900/95 sticky top-0 z-20 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white text-base font-bold">QRコード & 他デバイス共有</h2>
              <p className="text-xs text-neutral-400">
                ルーム: <span className="font-mono text-indigo-400 font-semibold">{roomId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition"
              title="カードを印刷"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">印刷</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (hidden during print) */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-1.5 px-5 gap-2 print:hidden">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 ${
              activeTab === 'share'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>スマホ同期 / リモコン</span>
          </button>

          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 ${
              activeTab === 'actions'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>操作用QRコード (ON/OFF)</span>
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 ${
              activeTab === 'print'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>印刷用カード (A4)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* TAB 1: SHARE & REMOTE CONTROLLER */}
          {activeTab === 'share' && (
            <div className="flex flex-col md:flex-row items-center gap-6 print:hidden">
              <div className="flex flex-col items-center bg-white p-5 rounded-2xl shadow-xl shrink-0">
                {roomQrUrl ? (
                  <img
                    src={roomQrUrl}
                    alt="Room QR Code"
                    className="w-56 h-56 rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-neutral-400 text-xs">
                    生成中...
                  </div>
                )}
                <span className="text-[11px] text-neutral-500 font-medium mt-2 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                  スマホの標準カメラでスキャン
                </span>
              </div>

              <div className="flex-1 space-y-4 text-left">
                <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4">
                  <h3 className="text-white text-sm font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    複数デバイスとリアルタイム連動
                  </h3>
                  <p className="text-xs text-indigo-200/80 mt-1.5 leading-relaxed">
                    スマホやタブレットでこのQRコードを読み取ると、同じタイマー画面が瞬時に開きます。
                    どのデバイスからでも<strong>開始・一時停止・リセット・時間調整</strong>が全デバイスにリアルタイム反映されます。
                  </p>
                </div>

                {/* Share Link Field */}
                <div>
                  <label className="text-xs text-neutral-400 font-medium mb-1.5 block">
                    共有リンク (URL)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={roomUrl}
                      className="flex-1 bg-neutral-950 border border-neutral-700 text-neutral-300 text-xs rounded-xl px-3.5 py-2.5 font-mono focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shrink-0 shadow-lg shadow-indigo-600/30"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? 'コピー完了' : 'コピー'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => downloadQR(roomQrUrl, `timer-room-${roomId}.png`)}
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>QR画像を保存</span>
                  </button>
                  <a
                    href={roomUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>別タブで開く</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INSTANT ACTION CARDS */}
          {activeTab === 'actions' && (
            <div className="space-y-4 print:hidden">
              <div className="bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800 text-xs text-neutral-300">
                💡 <strong>ワンタップQRアクション：</strong>
                スマホの標準カメラで各QRをスキャンすると、該当の操作（オン/オフ、開始、停止、リセット）が即座に実行されます！
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {actionCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 flex flex-col items-center text-center transition shadow-lg group"
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                      {onActionTriggered && (
                        <button
                          onClick={() => {
                            if (card.action === 'addTime') {
                              onActionTriggered('addTime', {
                                seconds: card.id === 'add5m' ? 300 : 60,
                              });
                            } else {
                              onActionTriggered(card.action);
                            }
                          }}
                          className="text-[11px] text-neutral-400 hover:text-white underline"
                        >
                          今すぐテスト
                        </button>
                      )}
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-3 rounded-xl mb-3 shadow">
                      {actionQrs[card.id] ? (
                        <img
                          src={actionQrs[card.id]}
                          alt={card.title}
                          className="w-32 h-32 object-contain"
                        />
                      ) : (
                        <div className="w-32 h-32 flex items-center justify-center text-neutral-400 text-xs">
                          生成中...
                        </div>
                      )}
                    </div>

                    <h4 className="text-white text-xs font-bold">{card.title}</h4>
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">{card.subtitle}</p>

                    <button
                      onClick={() =>
                        actionQrs[card.id] &&
                        downloadQR(actionQrs[card.id], `timer-action-${card.id}-${roomId}.png`)
                      }
                      className="mt-3 text-[11px] text-neutral-400 hover:text-indigo-400 flex items-center gap-1 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>画像保存</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3 / PRINT VIEW (Also visible during Print) */}
          {(activeTab === 'print' || typeof window !== 'undefined') && (
            <div className={`${activeTab !== 'print' ? 'hidden print:block' : 'block'} print:text-black`}>
              {/* Header on printed sheet */}
              <div className="text-center mb-6 pb-4 border-b border-neutral-700 print:border-black">
                <h1 className="text-xl font-black tracking-wide text-white print:text-black">
                  SyncTimer QR 操作カードシート
                </h1>
                <p className="text-xs text-neutral-400 print:text-neutral-700 mt-1">
                  ルーム名: <strong className="font-mono text-indigo-400 print:text-black">{roomId}</strong> | 
                  切り取って机や壁に貼り、スマホカメラでかざすだけでタイマーを操作できます。
                </p>
              </div>

              {/* Cards Grid formatted for printing */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 print:grid-cols-2 print:gap-6">
                {actionCards.map((card) => (
                  <div
                    key={card.id}
                    className="border-2 border-dashed border-neutral-700 print:border-neutral-400 rounded-2xl p-4 flex flex-col items-center text-center bg-neutral-950/50 print:bg-white print:shadow-none"
                  >
                    <div className="w-full flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 print:text-neutral-600">
                        ROOM: {roomId}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 print:bg-neutral-200 text-white print:text-black">
                        {card.badge}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl my-2 border border-neutral-300">
                      {actionQrs[card.id] ? (
                        <img
                          src={actionQrs[card.id]}
                          alt={card.title}
                          className="w-36 h-36 object-contain"
                        />
                      ) : (
                        <div className="w-36 h-36 flex items-center justify-center text-xs text-neutral-400">
                          生成中
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-white print:text-black mt-1">
                      {card.title}
                    </h4>
                    <p className="text-[10px] text-neutral-400 print:text-neutral-600 mt-0.5">
                      {card.subtitle}
                    </p>
                  </div>
                ))}

                {/* Also add room direct join controller card */}
                <div className="border-2 border-dashed border-neutral-700 print:border-neutral-400 rounded-2xl p-4 flex flex-col items-center text-center bg-neutral-950/50 print:bg-white">
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 print:text-neutral-600">
                      ROOM: {roomId}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white print:bg-black">
                      リモコン共有
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl my-2 border border-neutral-300">
                    {roomQrUrl ? (
                      <img
                        src={roomQrUrl}
                        alt="Join Room QR"
                        className="w-36 h-36 object-contain"
                      />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center text-xs text-neutral-400">
                        生成中
                      </div>
                    )}
                  </div>

                  <h4 className="text-sm font-black text-white print:text-black mt-1">
                    リモコン操作画面を開く
                  </h4>
                  <p className="text-[10px] text-neutral-400 print:text-neutral-600 mt-0.5">
                    スマホを手元リモコンとして使えます
                  </p>
                </div>
              </div>

              <div className="mt-6 text-center print:hidden">
                <button
                  onClick={handlePrint}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 mx-auto transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>このカードシートを印刷する (A4)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
