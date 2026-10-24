export type TimerMode = 'countdown' | 'stopwatch' | 'pomodoro';

export interface LapItem {
  id: string;
  timeMs: number;
  label: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  action: string;
  deviceName: string;
  timestamp: number;
}

export interface PomodoroConfig {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  roundsBeforeLongBreak: number;
}

export interface TimerSession {
  id: string;
  title: string;
  mode: TimerMode;
  isRunning: boolean;
  durationMs: number;
  remainingMs: number;
  elapsedMs: number;
  lastStartedAt: number | null;
  lastStartTrigger?: string;
  pomodoroConfig?: PomodoroConfig;
  pomodoroStage: 'work' | 'shortBreak' | 'longBreak';
  pomodoroRound: number;
  laps: LapItem[];
  history: HistoryItem[];
  connectedClients: number;
  createdAt: number;
}

export interface TimerRecord {
  id: string;
  roomId: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  mode: TimerMode;
  triggerStart: string;
  triggerStop: string;
  createdAt: number;
}

export interface ChartBarData {
  key: string;
  label: string;
  fullLabel: string;
  seconds: number;
  sessionsCount: number;
}

export interface AnalyticsSummary {
  period: 'day' | 'week' | 'month';
  totalSeconds: number;
  totalSessions: number;
  avgSecondsPerSession: number;
  longestSeconds: number;
  qrTriggerCount: number;
  bars: ChartBarData[];
  recentRecords: TimerRecord[];
}

export type ActionType =
  | 'toggle'
  | 'start'
  | 'pause'
  | 'stop'
  | 'reset'
  | 'addTime'
  | 'setDuration'
  | 'setMode'
  | 'lap'
  | 'setTitle';
