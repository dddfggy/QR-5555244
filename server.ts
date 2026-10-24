import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TimerMode = 'countdown' | 'stopwatch' | 'pomodoro';

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
  laps: { id: string; timeMs: number; label: string; timestamp: number }[];
  history: { id: string; action: string; deviceName: string; timestamp: number }[];
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

// In-memory stores
const sessions = new Map<string, TimerSession>();
const roomRecords = new Map<string, TimerRecord[]>();

// Seed sample records for realistic analytics
function seedSampleRecords(roomId: string) {
  const records: TimerRecord[] = [];
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;

  // 1. Today records (spread across different hours of today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayHours = [9, 10, 11, 13, 14, 15, 16];
  todayHours.forEach((hour, idx) => {
    const sessionTime = new Date(todayStart.getTime() + hour * ONE_HOUR + idx * 12 * 60 * 1000).getTime();
    if (sessionTime < now) {
      const dur = [300, 1500, 600, 1800, 900, 1500, 1200][idx % 7];
      records.push({
        id: `seed_today_${idx}`,
        roomId,
        startTime: sessionTime - dur * 1000,
        endTime: sessionTime,
        durationSeconds: dur,
        mode: dur >= 1500 ? 'pomodoro' : 'countdown',
        triggerStart: idx % 2 === 0 ? 'QRコード (START)' : 'QRコード (TOGGLE)',
        triggerStop: 'QRコード (STOP)',
        createdAt: sessionTime,
      });
    }
  });

  // 2. Past 7 days records (for 1週間 view)
  for (let d = 1; d <= 6; d++) {
    const dayTimestamp = now - d * ONE_DAY;
    const sessionCount = 2 + (d % 4);
    for (let s = 0; s < sessionCount; s++) {
      const dur = [900, 1500, 1800, 600, 1200][(d + s) % 5];
      const endTime = dayTimestamp + (10 + s * 2) * ONE_HOUR;
      records.push({
        id: `seed_week_${d}_${s}`,
        roomId,
        startTime: endTime - dur * 1000,
        endTime,
        durationSeconds: dur,
        mode: s % 3 === 0 ? 'pomodoro' : s % 3 === 1 ? 'countdown' : 'stopwatch',
        triggerStart: 'QRコード (START)',
        triggerStop: 'QRコード (STOP)',
        createdAt: endTime,
      });
    }
  }

  // 3. Past 30 days records (for 1ヶ月 view)
  for (let d = 7; d <= 28; d += 2) {
    const dayTimestamp = now - d * ONE_DAY;
    const dur = 1200 + (d % 5) * 300;
    records.push({
      id: `seed_month_${d}`,
      roomId,
      startTime: dayTimestamp - dur * 1000,
      endTime: dayTimestamp,
      durationSeconds: dur,
      mode: 'countdown',
      triggerStart: 'QRコード (START)',
      triggerStop: 'QRコード (STOP)',
      createdAt: dayTimestamp,
    });
  }

  records.sort((a, b) => b.endTime - a.endTime);
  roomRecords.set(roomId, records);
  return records;
}

function getOrCreateSession(id: string): TimerSession {
  const cleanId = id.trim().toLowerCase() || 'default';
  let session = sessions.get(cleanId);
  if (!session) {
    session = {
      id: cleanId,
      title: cleanId === 'default' ? 'メインタイマー' : `ルーム: ${cleanId}`,
      mode: 'countdown',
      isRunning: false,
      durationMs: 3 * 60 * 1000,
      remainingMs: 3 * 60 * 1000,
      elapsedMs: 0,
      lastStartedAt: null,
      lastStartTrigger: '手動',
      pomodoroConfig: {
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        roundsBeforeLongBreak: 4,
      },
      pomodoroStage: 'work',
      pomodoroRound: 1,
      laps: [],
      history: [
        {
          id: Math.random().toString(36).substring(2, 9),
          action: 'ルーム作成',
          deviceName: 'System',
          timestamp: Date.now(),
        },
      ],
      connectedClients: 0,
      createdAt: Date.now(),
    };
    sessions.set(cleanId, session);

    // Initialize with seeded records if room is new
    if (!roomRecords.has(cleanId)) {
      seedSampleRecords(cleanId);
    }
  }
  return session;
}

function handleTimerExpiration(session: TimerSession, now = Date.now()) {
  const startTime = session.lastStartedAt || now;
  const recordedDuration = Math.round((session.durationMs || 0) / 1000);
  session.isRunning = false;
  session.lastStartedAt = null;

  recordTimerSession(
    session.id,
    startTime,
    now,
    recordedDuration,
    session.mode,
    session.lastStartTrigger || 'QRコード (START)',
    'タイムアップ'
  );

  if (session.mode === 'pomodoro') {
    const config = session.pomodoroConfig || {
      workMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      roundsBeforeLongBreak: 4,
    };

    if (session.pomodoroStage === 'work') {
      const isLong = (session.pomodoroRound || 1) % config.roundsBeforeLongBreak === 0;
      session.pomodoroStage = isLong ? 'longBreak' : 'shortBreak';
      const breakMins = isLong ? config.longBreakMinutes : config.shortBreakMinutes;
      session.durationMs = breakMins * 60 * 1000;
      session.remainingMs = session.durationMs;
      session.history.unshift({
        id: Math.random().toString(36).substring(2, 9),
        action: `作業完了 ☕ ${isLong ? '長い休憩' : '短い休憩'} (${breakMins}分) へ`,
        deviceName: 'ポモドーロ',
        timestamp: now,
      });
    } else {
      session.pomodoroStage = 'work';
      session.pomodoroRound = (session.pomodoroRound || 1) + 1;
      session.durationMs = config.workMinutes * 60 * 1000;
      session.remainingMs = session.durationMs;
      session.history.unshift({
        id: Math.random().toString(36).substring(2, 9),
        action: `休憩完了 🍅 作業ラウンド #${session.pomodoroRound} (${config.workMinutes}分) へ`,
        deviceName: 'ポモドーロ',
        timestamp: now,
      });
    }
  } else {
    session.remainingMs = 0;
    session.history.unshift({
      id: Math.random().toString(36).substring(2, 9),
      action: 'タイムアップ (時間終了)',
      deviceName: 'System',
      timestamp: now,
    });
  }
}

// Effective session calculation
function getEffectiveSession(session: TimerSession): TimerSession {
  if (!session.isRunning || !session.lastStartedAt) {
    return session;
  }

  const now = Date.now();
  const diff = now - session.lastStartedAt;

  if (session.mode === 'stopwatch') {
    return {
      ...session,
      elapsedMs: session.elapsedMs + diff,
    };
  }

  const remaining = session.remainingMs - diff;
  if (remaining <= 0) {
    handleTimerExpiration(session, now);
    return session;
  }

  return {
    ...session,
    remainingMs: remaining,
  };
}

// Record a completed timer run
function recordTimerSession(
  roomId: string,
  startTime: number,
  endTime: number,
  durationSeconds: number,
  mode: TimerMode,
  triggerStart: string,
  triggerStop: string
) {
  if (durationSeconds < 2) return; // ignore accidental micro-toggles

  let list = roomRecords.get(roomId);
  if (!list) {
    list = [];
    roomRecords.set(roomId, list);
  }

  const record: TimerRecord = {
    id: Math.random().toString(36).substring(2, 9),
    roomId,
    startTime,
    endTime,
    durationSeconds,
    mode,
    triggerStart,
    triggerStop,
    createdAt: endTime,
  };

  list.unshift(record);
  if (list.length > 500) list.pop();
}

// Execute action on session
function applyAction(
  session: TimerSession,
  action: string,
  payload: any = {},
  deviceName = 'リモート端末'
): { updated: boolean; event: string } {
  const now = Date.now();

  switch (action) {
    case 'toggle': {
      if (session.isRunning) {
        return applyAction(session, 'pause', payload, deviceName);
      } else {
        return applyAction(session, 'start', payload, deviceName);
      }
    }

    case 'start': {
      if (session.isRunning) return { updated: false, event: 'no_change' };

      if (session.mode !== 'stopwatch' && session.remainingMs <= 0) {
        session.remainingMs = session.durationMs > 0 ? session.durationMs : 3 * 60 * 1000;
      }

      session.isRunning = true;
      session.lastStartedAt = now;
      session.lastStartTrigger = deviceName;
      session.history.unshift({
        id: Math.random().toString(36).substring(2, 9),
        action: '開始 (ON)',
        deviceName,
        timestamp: now,
      });
      if (session.history.length > 30) session.history.pop();
      return { updated: true, event: 'timer:started' };
    }

    case 'pause':
    case 'stop': {
      if (!session.isRunning) return { updated: false, event: 'no_change' };

      const diff = session.lastStartedAt ? now - session.lastStartedAt : 0;
      const durationSeconds = Math.round(diff / 1000);

      if (session.mode === 'stopwatch') {
        session.elapsedMs += diff;
      } else {
        session.remainingMs = Math.max(0, session.remainingMs - diff);
      }
      session.isRunning = false;
      const startTime = session.lastStartedAt || now;
      session.lastStartedAt = null;

      session.history.unshift({
        id: Math.random().toString(36).substring(2, 9),
        action: '停止 (OFF)',
        deviceName,
        timestamp: now,
      });
      if (session.history.length > 30) session.history.pop();

      // Record completed session for stats
      recordTimerSession(
        session.id,
        startTime,
        now,
        durationSeconds,
        session.mode,
        session.lastStartTrigger || 'QRコード (START)',
        deviceName
      );

      return { updated: true, event: 'timer:paused' };
    }

    case 'reset': {
      session.isRunning = false;
      session.lastStartedAt = null;
      session.remainingMs = session.durationMs;
      session.elapsedMs = 0;
      session.laps = [];
      session.history.unshift({
        id: Math.random().toString(36).substring(2, 9),
        action: 'リセット',
        deviceName,
        timestamp: now,
      });
      if (session.history.length > 30) session.history.pop();
      return { updated: true, event: 'timer:reset' };
    }

    case 'addTime': {
      const deltaMs = (payload.seconds || 60) * 1000;
      if (session.mode === 'stopwatch') {
        session.elapsedMs = Math.max(0, session.elapsedMs + deltaMs);
      } else {
        session.remainingMs = Math.max(0, session.remainingMs + deltaMs);
        session.durationMs = Math.max(session.durationMs, session.remainingMs);
      }
      session.history.unshift({
        id: Math.random().toString(36).substring(2, 9),
        action: `${payload.seconds > 0 ? '+' : ''}${payload.seconds}秒 調整`,
        deviceName,
        timestamp: now,
      });
      if (session.history.length > 30) session.history.pop();
      return { updated: true, event: 'timer:adjusted' };
    }

    case 'setDuration': {
      const ms = Math.max(1000, Number(payload.durationMs) || 60000);
      session.durationMs = ms;
      if (!session.isRunning) {
        session.remainingMs = ms;
      }
      session.history.unshift({
        id: Math.random().toString(36).substring(2, 9),
        action: `時間設定: ${Math.round(ms / 1000)}秒`,
        deviceName,
        timestamp: now,
      });
      return { updated: true, event: 'timer:duration_updated' };
    }

    case 'setMode': {
      const newMode = payload.mode as TimerMode;
      if (newMode && ['countdown', 'stopwatch', 'pomodoro'].includes(newMode)) {
        session.mode = newMode;
        session.isRunning = false;
        session.lastStartedAt = null;
        if (newMode === 'stopwatch') {
          session.elapsedMs = 0;
        } else if (newMode === 'pomodoro') {
          session.pomodoroStage = 'work';
          const workMins = session.pomodoroConfig?.workMinutes || 25;
          session.durationMs = workMins * 60 * 1000;
          session.remainingMs = session.durationMs;
        } else {
          session.remainingMs = session.durationMs;
        }
        session.history.unshift({
          id: Math.random().toString(36).substring(2, 9),
          action: `モード変更: ${newMode}`,
          deviceName,
          timestamp: now,
        });
        return { updated: true, event: 'timer:mode_changed' };
      }
      return { updated: false, event: 'invalid_mode' };
    }

    case 'setPomodoroConfig': {
      const work = Math.max(1, Math.min(120, Number(payload.workMinutes) || 25));
      const shortBreak = Math.max(1, Math.min(60, Number(payload.shortBreakMinutes) || 5));
      const longBreak = Math.max(1, Math.min(90, Number(payload.longBreakMinutes) || 15));
      const rounds = Math.max(1, Math.min(12, Number(payload.roundsBeforeLongBreak) || 4));

      session.pomodoroConfig = {
        workMinutes: work,
        shortBreakMinutes: shortBreak,
        longBreakMinutes: longBreak,
        roundsBeforeLongBreak: rounds,
      };

      if (session.mode === 'pomodoro' && !session.isRunning) {
        let mins = work;
        if (session.pomodoroStage === 'shortBreak') mins = shortBreak;
        else if (session.pomodoroStage === 'longBreak') mins = longBreak;
        session.durationMs = mins * 60 * 1000;
        session.remainingMs = session.durationMs;
      }

      session.history.unshift({
        id: Math.random().toString(36).substring(2, 9),
        action: `ポモドーロ時間設定: 作業${work}分 / 短休${shortBreak}分 / 長休${longBreak}分`,
        deviceName,
        timestamp: now,
      });
      return { updated: true, event: 'timer:pomodoro_config_updated' };
    }

    case 'setPomodoroStage': {
      const stage = payload.stage as 'work' | 'shortBreak' | 'longBreak';
      if (['work', 'shortBreak', 'longBreak'].includes(stage)) {
        session.pomodoroStage = stage;
        session.isRunning = false;
        session.lastStartedAt = null;

        const config = session.pomodoroConfig || {
          workMinutes: 25,
          shortBreakMinutes: 5,
          longBreakMinutes: 15,
          roundsBeforeLongBreak: 4,
        };

        let mins = config.workMinutes;
        if (stage === 'shortBreak') mins = config.shortBreakMinutes;
        else if (stage === 'longBreak') mins = config.longBreakMinutes;

        session.durationMs = mins * 60 * 1000;
        session.remainingMs = session.durationMs;

        session.history.unshift({
          id: Math.random().toString(36).substring(2, 9),
          action: `フェーズ変更: ${stage === 'work' ? '作業' : stage === 'shortBreak' ? '短い休憩' : '長い休憩'} (${mins}分)`,
          deviceName,
          timestamp: now,
        });
        return { updated: true, event: 'timer:pomodoro_stage_changed' };
      }
      return { updated: false, event: 'invalid_stage' };
    }

    case 'lap': {
      const currentMs =
        session.mode === 'stopwatch'
          ? session.elapsedMs + (session.isRunning && session.lastStartedAt ? now - session.lastStartedAt : 0)
          : session.remainingMs - (session.isRunning && session.lastStartedAt ? now - session.lastStartedAt : 0);

      session.laps.unshift({
        id: Math.random().toString(36).substring(2, 9),
        timeMs: Math.max(0, currentMs),
        label: payload.label || `Lap ${session.laps.length + 1}`,
        timestamp: now,
      });
      if (session.laps.length > 50) session.laps.pop();
      session.history.unshift({
        id: Math.random().toString(36).substring(2, 9),
        action: `ラップ記録 (#${session.laps.length})`,
        deviceName,
        timestamp: now,
      });
      return { updated: true, event: 'timer:lap' };
    }

    default:
      return { updated: false, event: 'unknown_action' };
  }
}

// Compute Analytics for day / week / month
function calculateAnalytics(roomId: string, period: 'day' | 'week' | 'month'): AnalyticsSummary {
  const records = roomRecords.get(roomId) || [];
  const now = new Date();

  let filteredRecords: TimerRecord[] = [];
  const bars: ChartBarData[] = [];

  if (period === 'day') {
    // 1日 (Today: 24 hours 00:00 - 23:00)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    filteredRecords = records.filter((r) => r.endTime >= startOfDay && r.endTime < endOfDay);

    // Initialize 24 hourly bins
    for (let h = 0; h < 24; h++) {
      const label = `${h.toString().padStart(2, '0')}:00`;
      bars.push({
        key: `hour_${h}`,
        label: h % 3 === 0 ? `${h}時` : '',
        fullLabel: `${label} - ${h}:59`,
        seconds: 0,
        sessionsCount: 0,
      });
    }

    filteredRecords.forEach((r) => {
      const d = new Date(r.endTime);
      const hour = d.getHours();
      if (bars[hour]) {
        bars[hour].seconds += r.durationSeconds;
        bars[hour].sessionsCount += 1;
      }
    });
  } else if (period === 'week') {
    // 1週間 (Past 7 days)
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Build 7 day bins from 6 days ago up to today
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * ONE_DAY_MS);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const d = targetDate.getDate();
      const dateStart = new Date(y, m, d).getTime();
      const dateEnd = dateStart + ONE_DAY_MS;
      const dayOfWeek = dayNames[targetDate.getDay()];
      const key = `${m + 1}/${d}`;

      const dayRecords = records.filter((r) => r.endTime >= dateStart && r.endTime < dateEnd);
      const totalSec = dayRecords.reduce((acc, curr) => acc + curr.durationSeconds, 0);

      filteredRecords.push(...dayRecords);

      bars.push({
        key,
        label: `${key} (${dayOfWeek})`,
        fullLabel: `${y}年${m + 1}月${d}日 (${dayOfWeek})`,
        seconds: totalSec,
        sessionsCount: dayRecords.length,
      });
    }
  } else if (period === 'month') {
    // 1ヶ月 (Past 30 days)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * ONE_DAY_MS);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const d = targetDate.getDate();
      const dateStart = new Date(y, m, d).getTime();
      const dateEnd = dateStart + ONE_DAY_MS;
      const key = `${m + 1}/${d}`;

      const dayRecords = records.filter((r) => r.endTime >= dateStart && r.endTime < dateEnd);
      const totalSec = dayRecords.reduce((acc, curr) => acc + curr.durationSeconds, 0);

      filteredRecords.push(...dayRecords);

      bars.push({
        key,
        label: i % 5 === 0 || i === 0 ? key : '',
        fullLabel: `${y}年${m + 1}月${d}日`,
        seconds: totalSec,
        sessionsCount: dayRecords.length,
      });
    }
  }

  const totalSeconds = filteredRecords.reduce((sum, r) => sum + r.durationSeconds, 0);
  const totalSessions = filteredRecords.length;
  const avgSecondsPerSession = totalSessions > 0 ? Math.round(totalSeconds / totalSessions) : 0;
  const longestSeconds = filteredRecords.reduce((max, r) => Math.max(max, r.durationSeconds), 0);
  const qrTriggerCount = filteredRecords.filter(
    (r) => r.triggerStart.includes('QR') || r.triggerStop.includes('QR')
  ).length;

  return {
    period,
    totalSeconds,
    totalSessions,
    avgSecondsPerSession,
    longestSeconds,
    qrTriggerCount,
    bars,
    recentRecords: filteredRecords.slice(0, 20),
  };
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  app.use(express.json());

  const roomSockets = new Map<string, Set<WebSocket>>();
  const socketRooms = new Map<WebSocket, string>();

  function broadcastRoomState(roomId: string, extraEvent?: string) {
    const session = sessions.get(roomId);
    if (!session) return;

    const sockets = roomSockets.get(roomId);
    if (!sockets || sockets.size === 0) {
      session.connectedClients = 0;
      return;
    }

    session.connectedClients = sockets.size;
    const effective = getEffectiveSession(session);
    const message = JSON.stringify({
      type: 'sync',
      event: extraEvent,
      serverTime: Date.now(),
      session: effective,
    });

    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  // Periodic heartbeat
  setInterval(() => {
    for (const [roomId, session] of sessions.entries()) {
      if (session.isRunning && session.mode !== 'stopwatch' && session.lastStartedAt) {
        const remaining = session.remainingMs - (Date.now() - session.lastStartedAt);
        if (remaining <= 0) {
          handleTimerExpiration(session, Date.now());
          broadcastRoomState(roomId, 'timer:finished');
        }
      }
    }
  }, 500);

  // WebSocket Connection Handling
  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId = 'default';

    ws.on('message', (data: string) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'join') {
          const newRoomId = (msg.roomId || 'default').trim().toLowerCase();

          if (currentRoomId && roomSockets.has(currentRoomId)) {
            const oldSet = roomSockets.get(currentRoomId);
            oldSet?.delete(ws);
            broadcastRoomState(currentRoomId, 'user:left');
          }

          currentRoomId = newRoomId;
          socketRooms.set(ws, newRoomId);

          if (!roomSockets.has(newRoomId)) {
            roomSockets.set(newRoomId, new Set());
          }
          roomSockets.get(newRoomId)!.add(ws);

          const session = getOrCreateSession(newRoomId);
          session.connectedClients = roomSockets.get(newRoomId)!.size;

          ws.send(
            JSON.stringify({
              type: 'sync',
              event: 'user:joined',
              serverTime: Date.now(),
              session: getEffectiveSession(session),
            })
          );

          broadcastRoomState(newRoomId, 'presence:update');
        } else if (msg.type === 'action') {
          const roomId = (msg.roomId || currentRoomId).trim().toLowerCase();
          const session = getOrCreateSession(roomId);
          const result = applyAction(session, msg.action, msg.payload, msg.deviceName || 'リモート端末');

          if (result.updated) {
            broadcastRoomState(roomId, result.event);
          }
        }
      } catch (err) {
        console.error('WS error:', err);
      }
    });

    ws.on('close', () => {
      const roomId = socketRooms.get(ws);
      if (roomId && roomSockets.has(roomId)) {
        roomSockets.get(roomId)!.delete(ws);
        const session = sessions.get(roomId);
        if (session) {
          session.connectedClients = roomSockets.get(roomId)!.size;
        }
        broadcastRoomState(roomId, 'user:left');
      }
      socketRooms.delete(ws);
    });
  });

  // REST API Endpoints
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  app.get('/api/room/:roomId', (req: Request, res: Response) => {
    const roomId = req.params.roomId.trim().toLowerCase();
    const session = getOrCreateSession(roomId);
    res.json({
      serverTime: Date.now(),
      session: getEffectiveSession(session),
    });
  });

  app.post('/api/room/:roomId/action', (req: Request, res: Response) => {
    const roomId = req.params.roomId.trim().toLowerCase();
    const { action, payload, deviceName } = req.body;
    const session = getOrCreateSession(roomId);

    const result = applyAction(session, action, payload, deviceName || 'QRスキャン');
    if (result.updated) {
      broadcastRoomState(roomId, result.event);
    }

    res.json({
      success: true,
      event: result.event,
      serverTime: Date.now(),
      session: getEffectiveSession(session),
    });
  });

  // Analytics endpoint (Day / Week / Month)
  app.get('/api/room/:roomId/analytics', (req: Request, res: Response) => {
    const roomId = req.params.roomId.trim().toLowerCase();
    getOrCreateSession(roomId); // ensures room initialized
    const period = ((req.query.period as string) || 'day') as 'day' | 'week' | 'month';
    const validPeriod = ['day', 'week', 'month'].includes(period) ? period : 'day';

    const analytics = calculateAnalytics(roomId, validPeriod);
    res.json(analytics);
  });

  // Seed sample data for room
  app.post('/api/room/:roomId/records/seed', (req: Request, res: Response) => {
    const roomId = req.params.roomId.trim().toLowerCase();
    const records = seedSampleRecords(roomId);
    res.json({ success: true, count: records.length });
  });

  // Clear records for room
  app.delete('/api/room/:roomId/records', (req: Request, res: Response) => {
    const roomId = req.params.roomId.trim().toLowerCase();
    roomRecords.set(roomId, []);
    res.json({ success: true });
  });

  // Quick Action GET endpoint
  app.get('/action', (req: Request, res: Response) => {
    const roomId = ((req.query.room as string) || 'default').trim().toLowerCase();
    const action = (req.query.act as string) || 'toggle';
    const session = getOrCreateSession(roomId);

    const deviceTag =
      action === 'start'
        ? 'QRコード (START)'
        : action === 'stop' || action === 'pause'
        ? 'QRコード (STOP)'
        : action === 'reset'
        ? 'QRコード (RESET)'
        : 'QRコード (TOGGLE)';

    applyAction(session, action, {}, deviceTag);
    broadcastRoomState(roomId, `action:${action}`);

    res.redirect(`/?room=${encodeURIComponent(roomId)}&actionResult=${encodeURIComponent(action)}`);
  });

  // Standalone HTML routes
  app.get('/download-html', (_req: Request, res: Response) => {
    res.download(path.resolve(__dirname, 'public', 'standalone.html'), 'SyncTimer_QR.html');
  });

  app.get('/standalone', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'public', 'standalone.html'));
  });

  // Explicit PWA manifest and service worker routes for GitHub PWA
  app.get('/manifest.json', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'public', 'manifest.json'));
  });

  app.get('/sw.js', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.resolve(__dirname, 'public', 'sw.js'));
  });

  app.get('/download-pwa-bundle', (_req: Request, res: Response) => {
    res.download(path.resolve(__dirname, 'public', 'github-pwa.tar.gz'), 'SyncTimer_GitHub_PWA.tar.gz');
  });

  // Vite Integration
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
