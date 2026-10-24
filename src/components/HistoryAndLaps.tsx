import React, { useState } from 'react';
import { TimerSession } from '../types';
import { History, Flag, Clock, Smartphone, Laptop, Trash2 } from 'lucide-react';

interface HistoryAndLapsProps {
  session: TimerSession;
}

export const HistoryAndLaps: React.FC<HistoryAndLapsProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'laps'>('history');

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const msRemainder = Math.floor((ms % 1000) / 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${msRemainder
      .toString()
      .padStart(2, '0')}`;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 mb-12">
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-5 backdrop-blur-md">
        {/* Sub-tabs */}
        <div className="flex border-b border-neutral-800 pb-3 mb-4 gap-2">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'history'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>同期ログ ({session.history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('laps')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'laps'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5 text-emerald-400" />
            <span>ラップタイム ({session.laps.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'history' ? (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
            {session.history.length === 0 ? (
              <div className="text-center py-6 text-neutral-500">まだ操作履歴はありません</div>
            ) : (
              session.history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300">
                      {item.deviceName.includes('QR') || item.deviceName.includes('リモート') ? (
                        <Smartphone className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Laptop className="w-3 h-3 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-200">{item.action}</span>
                      <span className="text-[10px] text-neutral-400 ml-2">({item.deviceName})</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
            {session.laps.length === 0 ? (
              <div className="text-center py-6 text-neutral-500">
                「ラップ記録」を押すとここにラップが保存されます
              </div>
            ) : (
              session.laps.map((lap, index) => (
                <div
                  key={lap.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-neutral-500 font-bold w-6">
                      #{session.laps.length - index}
                    </span>
                    <span className="text-neutral-300 font-medium">{lap.label}</span>
                  </div>
                  <span className="font-mono font-bold text-white">{formatMs(lap.timeMs)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
