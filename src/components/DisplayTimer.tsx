import React, { useState } from 'react';
import { TimerSession, TimerMode, PomodoroConfig } from '../types';
import {
  Flame,
  Coffee,
  Trophy,
  Clock,
  Sparkles,
  Settings,
  Check,
  Palmtree,
  Sliders,
} from 'lucide-react';

interface DisplayTimerProps {
  session: TimerSession;
  currentDisplayMs: number;
  showMilliseconds?: boolean;
  onSelectPreset?: (ms: number) => void;
  onSetMode?: (mode: TimerMode) => void;
  onSetPomodoroConfig?: (config: PomodoroConfig) => void;
  onSetPomodoroStage?: (stage: 'work' | 'shortBreak' | 'longBreak') => void;
}

export const DisplayTimer: React.FC<DisplayTimerProps> = ({
  session,
  currentDisplayMs,
  showMilliseconds = true,
  onSelectPreset,
  onSetMode,
  onSetPomodoroConfig,
  onSetPomodoroStage,
}) => {
  const [isEditingPomodoro, setIsEditingPomodoro] = useState(false);
  const [customWork, setCustomWork] = useState(session.pomodoroConfig?.workMinutes || 25);
  const [customShortBreak, setCustomShortBreak] = useState(session.pomodoroConfig?.shortBreakMinutes || 5);
  const [customLongBreak, setCustomLongBreak] = useState(session.pomodoroConfig?.longBreakMinutes || 15);
  const [customRounds, setCustomRounds] = useState(session.pomodoroConfig?.roundsBeforeLongBreak || 4);

  // Format milliseconds into HH:MM:SS.ms
  const totalSeconds = Math.floor(currentDisplayMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((currentDisplayMs % 1000) / 10);

  const pad = (n: number) => n.toString().padStart(2, '0');

  // Calculate percentage remaining
  let progressRatio = 1;
  if (session.mode !== 'stopwatch' && session.durationMs > 0) {
    progressRatio = Math.max(0, Math.min(1, currentDisplayMs / session.durationMs));
  } else if (session.mode === 'stopwatch') {
    progressRatio = (currentDisplayMs % 60000) / 60000;
  }

  // Presets list for countdown
  const countdownPresets = [
    { label: '1分', ms: 60 * 1000 },
    { label: '3分', ms: 3 * 60 * 1000 },
    { label: '5分', ms: 5 * 60 * 1000 },
    { label: '10分', ms: 10 * 60 * 1000 },
    { label: '15分', ms: 15 * 60 * 1000 },
    { label: '25分', ms: 25 * 60 * 1000 },
    { label: '45分', ms: 45 * 60 * 1000 },
  ];

  // Pomodoro preset combinations
  const pomodoroPresets = [
    { label: '25分 / 5分 (標準)', work: 25, shortBreak: 5, longBreak: 15, rounds: 4 },
    { label: '50分 / 10分 (じっくり集中)', work: 50, shortBreak: 10, longBreak: 20, rounds: 4 },
    { label: '15分 / 3分 (クイック)', work: 15, shortBreak: 3, longBreak: 10, rounds: 4 },
    { label: '45分 / 15分 (大学講義型)', work: 45, shortBreak: 15, longBreak: 30, rounds: 3 },
  ];

  const handleApplyPomodoroConfig = (config: PomodoroConfig) => {
    if (onSetPomodoroConfig) {
      onSetPomodoroConfig(config);
      setCustomWork(config.workMinutes);
      setCustomShortBreak(config.shortBreakMinutes);
      setCustomLongBreak(config.longBreakMinutes);
      setCustomRounds(config.roundsBeforeLongBreak);
      setIsEditingPomodoro(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleApplyPomodoroConfig({
      workMinutes: Math.max(1, Math.min(120, Number(customWork) || 25)),
      shortBreakMinutes: Math.max(1, Math.min(60, Number(customShortBreak) || 5)),
      longBreakMinutes: Math.max(1, Math.min(90, Number(customLongBreak) || 15)),
      roundsBeforeLongBreak: Math.max(1, Math.min(12, Number(customRounds) || 4)),
    });
  };

  const isFinished = session.mode !== 'stopwatch' && currentDisplayMs <= 0;
  const currentPomodoroConfig = session.pomodoroConfig || {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    roundsBeforeLongBreak: 4,
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 py-2">
      {/* Mode Switcher Tabs */}
      <div className="inline-flex items-center p-1 bg-neutral-900/90 border border-neutral-800 rounded-2xl shadow-inner mb-5 backdrop-blur-md">
        <button
          onClick={() => onSetMode && onSetMode('countdown')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            session.mode === 'countdown'
              ? 'bg-neutral-800 text-white shadow'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-400" />
          <span>カウントダウン</span>
        </button>

        <button
          onClick={() => onSetMode && onSetMode('stopwatch')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            session.mode === 'stopwatch'
              ? 'bg-neutral-800 text-white shadow'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span>ストップウォッチ</span>
        </button>

        <button
          onClick={() => onSetMode && onSetMode('pomodoro')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
            session.mode === 'pomodoro'
              ? 'bg-neutral-800 text-white shadow'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-400" />
          <span>ポモドーロ</span>
        </button>
      </div>

      {/* Pomodoro Interactive Phase Bar & Round Indicator */}
      {session.mode === 'pomodoro' && (
        <div className="flex flex-col items-center mb-4 space-y-2">
          {/* Phase Selector Pills */}
          <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 p-1 rounded-2xl">
            <button
              onClick={() => onSetPomodoroStage && onSetPomodoroStage('work')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                session.pomodoroStage === 'work'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>作業 ({currentPomodoroConfig.workMinutes}分)</span>
            </button>

            <button
              onClick={() => onSetPomodoroStage && onSetPomodoroStage('shortBreak')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                session.pomodoroStage === 'shortBreak'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>短休 ({currentPomodoroConfig.shortBreakMinutes}分)</span>
            </button>

            <button
              onClick={() => onSetPomodoroStage && onSetPomodoroStage('longBreak')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                session.pomodoroStage === 'longBreak'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              <span>長休 ({currentPomodoroConfig.longBreakMinutes}分)</span>
            </button>
          </div>

          {/* Round Indicator & Change Duration Link */}
          <div className="flex items-center space-x-3 text-xs text-neutral-400">
            <span className="font-semibold text-rose-300">
              ラウンド #{session.pomodoroRound || 1}
            </span>
            <span>•</span>
            <button
              onClick={() => setIsEditingPomodoro(!isEditingPomodoro)}
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline flex items-center gap-1"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>ポモドーロ時間を変更</span>
            </button>
          </div>
        </div>
      )}

      {/* Pomodoro Configuration Drawer/Modal */}
      {session.mode === 'pomodoro' && isEditingPomodoro && (
        <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-3xl p-5 mb-5 shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>ポモドーロ時間設定</span>
            </h4>
            <button
              onClick={() => setIsEditingPomodoro(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              閉じる
            </button>
          </div>

          {/* Quick Presets */}
          <div className="mb-4">
            <span className="text-[11px] text-neutral-400 font-medium block mb-2">
              定番プリセット:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {pomodoroPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() =>
                    handleApplyPomodoroConfig({
                      workMinutes: preset.work,
                      shortBreakMinutes: preset.shortBreak,
                      longBreakMinutes: preset.longBreak,
                      roundsBeforeLongBreak: preset.rounds,
                    })
                  }
                  className="p-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-left transition text-xs"
                >
                  <span className="font-bold text-neutral-200 block">{preset.label}</span>
                  <span className="text-[10px] text-neutral-500">
                    作業{preset.work}分 / 休憩{preset.shortBreak}分
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Numeric Inputs */}
          <form onSubmit={handleCustomSubmit} className="space-y-3 pt-2 border-t border-neutral-800">
            <span className="text-[11px] text-neutral-400 font-medium block">
              分数を自由にカスタマイズ:
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">作業時間 (分)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customWork}
                  onChange={(e) => setCustomWork(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white text-xs rounded-xl px-2.5 py-2 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">短い休憩 (分)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={customShortBreak}
                  onChange={(e) => setCustomShortBreak(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white text-xs rounded-xl px-2.5 py-2 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">長い休憩 (分)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={customLongBreak}
                  onChange={(e) => setCustomLongBreak(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white text-xs rounded-xl px-2.5 py-2 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1 shadow-lg shadow-indigo-600/30 mt-2"
            >
              <Check className="w-4 h-4" />
              <span>設定を保存してタイマーに適用</span>
            </button>
          </form>
        </div>
      )}

      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-4">
        {session.isRunning ? (
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>動作中 (ON)</span>
          </div>
        ) : isFinished ? (
          <div className="flex items-center space-x-2 bg-rose-500/20 border border-rose-500/40 text-rose-400 px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase animate-bounce">
            <Sparkles className="w-3.5 h-3.5" />
            <span>タイムアップ (FINISHED)</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 bg-neutral-800 border border-neutral-700 text-neutral-400 px-4 py-1 rounded-full text-xs font-medium tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>一時停止中 (OFF)</span>
          </div>
        )}
      </div>

      {/* Timer Circular Progress Frame & Digits */}
      <div className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] flex items-center justify-center select-none">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            className="stroke-neutral-800"
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="44"
            className={`transition-all duration-300 ${
              isFinished
                ? 'stroke-rose-500'
                : session.isRunning
                ? 'stroke-emerald-400'
                : session.mode === 'pomodoro'
                ? session.pomodoroStage === 'work'
                  ? 'stroke-rose-500'
                  : session.pomodoroStage === 'shortBreak'
                  ? 'stroke-emerald-400'
                  : 'stroke-cyan-400'
                : 'stroke-indigo-500'
            }`}
            strokeWidth="4.5"
            strokeDasharray={276.46}
            strokeDashoffset={276.46 * (1 - progressRatio)}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-baseline font-mono font-bold tracking-tight text-white drop-shadow-md">
            {hours > 0 && (
              <>
                <span className="text-4xl sm:text-6xl md:text-7xl">{pad(hours)}</span>
                <span className="text-2xl sm:text-4xl md:text-5xl text-neutral-500 mx-1">:</span>
              </>
            )}

            <span className="text-5xl sm:text-7xl md:text-8xl">{pad(minutes)}</span>
            <span className="text-3xl sm:text-5xl md:text-6xl text-neutral-500 mx-0.5 sm:mx-1">:</span>
            <span className="text-5xl sm:text-7xl md:text-8xl">{pad(seconds)}</span>

            {showMilliseconds && (
              <span className="text-xl sm:text-3xl md:text-4xl text-neutral-400 font-normal ml-1 w-9 sm:w-14 text-left">
                .{pad(milliseconds)}
              </span>
            )}
          </div>

          <div className="mt-3 text-xs sm:text-sm text-neutral-400 font-medium">
            {session.mode === 'stopwatch'
              ? '経過時間'
              : session.mode === 'pomodoro'
              ? `${
                  session.pomodoroStage === 'work'
                    ? '集中作業フェーズ'
                    : session.pomodoroStage === 'shortBreak'
                    ? '短い休憩フェーズ'
                    : '長い休憩フェーズ'
                } (${Math.round(session.durationMs / 60000)}分)`
              : `設定時間: ${Math.round(session.durationMs / 60000)}分`}
          </div>
        </div>
      </div>

      {/* Countdown Mode Quick Presets */}
      {session.mode === 'countdown' && !session.isRunning && onSelectPreset && (
        <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-xl">
          <span className="text-xs text-neutral-400 self-center mr-1">クイック設定:</span>
          {countdownPresets.map((p) => {
            const isSelected = session.durationMs === p.ms;
            return (
              <button
                key={p.ms}
                onClick={() => onSelectPreset(p.ms)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
