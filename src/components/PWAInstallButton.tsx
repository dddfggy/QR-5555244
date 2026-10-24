import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, Check } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'banner' | 'footer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already installed and running in standalone mode, don't show prompt
  if (isInstalled) {
    return (
      <span className="inline-flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-xl font-semibold">
        <Check className="w-3 h-3" />
        <span className="hidden sm:inline">PWAアプリ起動中</span>
      </span>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={
          className ||
          'flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md shadow-emerald-900/30 transition'
        }
        title="ホーム画面に追加してアプリとしてインストール"
      >
        <Download className="w-3.5 h-3.5" />
        <span>アプリをインストール</span>
      </button>

      {/* Installation Guide Modal (for iOS or browsers requiring manual add) */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-center shadow-2xl">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              ホーム画面に追加してアプリ化
            </h3>

            {isIOS ? (
              <div className="text-left bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-xs space-y-2.5 text-neutral-300">
                <p className="font-semibold text-white">iPhone / iPad でのインストール手順:</p>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span>
                  <span>Safari下部の <strong>共有ボタン</strong>（四角から矢印のアイコン <Share className="w-3.5 h-3.5 inline text-indigo-400" />）をタップします。</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span>
                  <span>メニューをスクロールし、<strong>「ホーム画面に追加」</strong>（<PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" />）をタップします。</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span>
                  <span>右上の<strong>「追加」</strong>をタップすると、アプリアイコンから単体アプリとして起動できます。</span>
                </div>
              </div>
            ) : (
              <div className="text-left bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-xs space-y-2 text-neutral-300">
                <p className="font-semibold text-white">ブラウザでのインストール:</p>
                <p>アドレスバー右端の <strong>「インストール」アイコン</strong> またはブラウザメニューの <strong>「アプリをインストール」</strong> を選択してください。</p>
                <p className="text-neutral-400 text-[11px]">全画面・オフライン対応のネイティブアプリ感覚で起動できるようになります。</p>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl transition"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
};
