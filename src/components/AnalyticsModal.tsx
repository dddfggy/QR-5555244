import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
  Download,
  RotateCcw,
  Sparkles,
  Zap,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { AnalyticsSummary, ChartBarData, TimerRecord } from '../types';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, roomId }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<ChartBarData | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (p: 'day' | 'week' | 'month') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${encodeURIComponent(roomId)}/analytics?period=${p}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics(period);
    }
  }, [isOpen, period, fetchAnalytics]);

  const handleSeedData = async () => {
    try {
      await fetch(`/api/room/${encodeURIComponent(roomId)}/records/seed`, { method: 'POST' });
      await fetchAnalytics(period);
      setNotification('サンプルデータを投入しました');
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('すべての計測履歴をクリアしますか？')) return;
    try {
      await fetch(`/api/room/${encodeURIComponent(roomId)}/records`, { method: 'DELETE' });
      await fetchAnalytics(period);
      setNotification('履歴をクリアしました');
      setTimeout(() => setNotification(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadCSV = () => {
    if (!data || !data.recentRecords || data.recentRecords.length === 0) return;

    const headers = ['ID', '開始時刻', '終了時刻', '計測時間(秒)', '計測時間(表記)', 'モード', '開始トリガー', '停止トリガー'];
    const rows = data.recentRecords.map((r) => [
      r.id,
      new Date(r.startTime).toLocaleString(),
      new Date(r.endTime).toLocaleString(),
      r.durationSeconds,
      formatDuration(r.durationSeconds),
      r.mode,
      r.triggerStart,
      r.triggerStop,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `timer-analytics-${roomId}-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDuration = (totalSec: number) => {
    if (!totalSec || totalSec <= 0) return '0分';
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (hours > 0) {
      return `${hours}時間${mins}分`;
    }
    if (mins > 0) {
      return `${mins}分${secs > 0 ? `${secs}秒` : ''}`;
    }
    return `${secs}秒`;
  };

  const formatClock = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (!isOpen) return null;

  // Max value for bar scaling
  const maxBarSeconds = data?.bars?.reduce((max, b) => Math.max(max, b.seconds), 0) || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900/95 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white text-base font-bold flex items-center gap-2">
                <span>タイマー計測統計 ＆ グラフ</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  QRコード集計
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                ルーム: <span className="font-mono text-indigo-400 font-semibold">{roomId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadCSV}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition"
              title="CSV形式でエクスポート"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV出力</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Period Tabs: 1日 | 1週間 | 1ヶ月 */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/70 p-2 sm:px-6">
          <div className="flex bg-neutral-900 p-1 rounded-2xl border border-neutral-800 space-x-1">
            <button
              onClick={() => setPeriod('day')}
              className={`py-1.5 px-3 sm:px-4 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
                period === 'day'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>1日 (24時間)</span>
            </button>

            <button
              onClick={() => setPeriod('week')}
              className={`py-1.5 px-3 sm:px-4 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
                period === 'week'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>1週間 (直近7日)</span>
            </button>

            <button
              onClick={() => setPeriod('month')}
              className={`py-1.5 px-3 sm:px-4 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
                period === 'month'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>1ヶ月 (30日間)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSeedData}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 px-2.5 py-1 bg-indigo-950/40 border border-indigo-500/30 rounded-lg transition"
              title="デモ用のサンプル履歴データを追加"
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden xs:inline">サンプル投入</span>
            </button>

            <button
              onClick={handleClearData}
              className="text-[11px] text-neutral-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-neutral-800 transition"
              title="履歴クリア"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {notification && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs py-2 px-4 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{notification}</span>
            </div>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                合計稼働時間
              </span>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                {formatDuration(data?.totalSeconds || 0)}
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                総セッション数
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                {data?.totalSessions || 0} <span className="text-xs text-neutral-400">回</span>
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                平均セッション
              </span>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                {formatDuration(data?.avgSecondsPerSession || 0)}
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5">
              <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                QRトリガー
              </span>
              <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                {data?.qrTriggerCount || 0} <span className="text-xs text-neutral-400">回</span>
              </p>
            </div>
          </div>

          {/* Interactive Bar Chart Section */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {period === 'day' && '今日の時間帯別 計測推移 (24時間)'}
                  {period === 'week' && '曜日別・直近7日間の計測推移'}
                  {period === 'month' && '日別・直近30日間の計測推移'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  バーにカーソルを合わせると詳細情報が表示されます
                </p>
              </div>

              {hoveredBar && (
                <div className="bg-neutral-800 border border-neutral-700 px-3 py-1.5 rounded-xl text-xs text-right">
                  <span className="text-neutral-300 font-bold">{hoveredBar.fullLabel}</span>:
                  <span className="text-emerald-400 font-bold ml-1.5">
                    {formatDuration(hoveredBar.seconds)}
                  </span>
                  <span className="text-neutral-400 text-[10px] ml-1">
                    ({hoveredBar.sessionsCount}回)
                  </span>
                </div>
              )}
            </div>

            {/* Chart Area */}
            <div className="h-56 w-full flex items-end gap-1 sm:gap-2 pt-6 pb-2 px-2 border-b border-neutral-800">
              {data?.bars?.map((bar, index) => {
                const heightPercent = maxBarSeconds > 0 ? (bar.seconds / maxBarSeconds) * 100 : 0;
                const isHovered = hoveredBar?.key === bar.key;

                return (
                  <div
                    key={bar.key || index}
                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    onMouseEnter={() => setHoveredBar(bar)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip on mobile/hover */}
                    {isHovered && (
                      <div className="absolute -top-10 bg-neutral-800 border border-neutral-600 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap shadow-xl z-30 pointer-events-none">
                        <div>{formatDuration(bar.seconds)}</div>
                        <div className="text-[9px] text-neutral-400">{bar.sessionsCount}回</div>
                      </div>
                    )}

                    {/* Bar graphic */}
                    <div
                      style={{ height: `${Math.max(4, heightPercent)}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        bar.seconds === 0
                          ? 'bg-neutral-800/40 hover:bg-neutral-700/60'
                          : isHovered
                          ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                          : 'bg-gradient-to-t from-indigo-600 to-emerald-400 group-hover:from-indigo-500 group-hover:to-emerald-300'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-2 px-1 font-mono">
              {data?.bars?.map((bar, index) => (
                <div key={bar.key || index} className="flex-1 text-center truncate">
                  {bar.label}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Records Table */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                計測セッション一覧 ({data?.recentRecords?.length || 0}件)
              </h4>
            </div>

            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[11px]">
                    <th className="pb-2 font-medium">日時</th>
                    <th className="pb-2 font-medium">計測時間</th>
                    <th className="pb-2 font-medium">モード</th>
                    <th className="pb-2 font-medium">開始トリガー</th>
                    <th className="pb-2 font-medium">停止トリガー</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {data?.recentRecords && data.recentRecords.length > 0 ? (
                    data.recentRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-neutral-900/50 transition">
                        <td className="py-2.5 text-neutral-300 font-mono">
                          {formatDate(r.endTime)} {formatClock(r.startTime)} -{' '}
                          {formatClock(r.endTime)}
                        </td>
                        <td className="py-2.5 font-bold text-white">
                          {formatDuration(r.durationSeconds)}
                        </td>
                        <td className="py-2.5 text-neutral-400">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-300">
                            {r.mode}
                          </span>
                        </td>
                        <td className="py-2.5 text-neutral-300">
                          <span className="text-emerald-400 font-medium">{r.triggerStart}</span>
                        </td>
                        <td className="py-2.5 text-neutral-400">
                          <span className="text-rose-400 font-medium">{r.triggerStop}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-500">
                        この期間の計測記録はまだありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
