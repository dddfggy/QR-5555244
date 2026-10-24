import QRCode from 'qrcode';

export interface QRActionCard {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  action: string;
  url: string;
  qrPayload: string;
}

export async function generateQRDataUrl(text: string, color = '#000000'): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 400,
      margin: 2,
      color: {
        dark: color,
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

export function getRoomUrl(roomId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?room=${encodeURIComponent(roomId)}`;
}

export function getActionUrl(roomId: string, action: string, sec?: number): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let url = `${origin}/action?room=${encodeURIComponent(roomId)}&act=${encodeURIComponent(action)}`;
  if (sec) {
    url += `&sec=${sec}`;
  }
  return url;
}

export function getActionCards(roomId: string): QRActionCard[] {
  return [
    {
      id: 'toggle',
      title: 'オン / オフ切替 (TOGGLE)',
      subtitle: '動作中は停止、停止中は開始します',
      badge: '推奨: 1枚でOK',
      badgeColor: 'bg-indigo-600 text-white',
      action: 'toggle',
      url: getActionUrl(roomId, 'toggle'),
      qrPayload: `synctimer:action:toggle:${roomId}`,
    },
    {
      id: 'start',
      title: '開始 / 再開 (START)',
      subtitle: 'タイマーを確実にONにして走らせます',
      badge: 'ON専用',
      badgeColor: 'bg-emerald-600 text-white',
      action: 'start',
      url: getActionUrl(roomId, 'start'),
      qrPayload: `synctimer:action:start:${roomId}`,
    },
    {
      id: 'pause',
      title: '一時停止 / ストップ (STOP)',
      subtitle: 'タイマーを一時停止(OFF)にします',
      badge: 'OFF専用',
      badgeColor: 'bg-amber-600 text-white',
      action: 'pause',
      url: getActionUrl(roomId, 'pause'),
      qrPayload: `synctimer:action:pause:${roomId}`,
    },
    {
      id: 'reset',
      title: 'リセット (RESET)',
      subtitle: '初期設定の時間に戻します',
      badge: 'リセット',
      badgeColor: 'bg-rose-600 text-white',
      action: 'reset',
      url: getActionUrl(roomId, 'reset'),
      qrPayload: `synctimer:action:reset:${roomId}`,
    },
    {
      id: 'add1m',
      title: '+1分 延長 (+1 MIN)',
      subtitle: '残り時間を即座に1分追加します',
      badge: 'クイック延長',
      badgeColor: 'bg-cyan-600 text-white',
      action: 'addTime',
      url: getActionUrl(roomId, 'addTime', 60),
      qrPayload: `synctimer:action:addTime:${roomId}:60`,
    },
    {
      id: 'add5m',
      title: '+5分 延長 (+5 MIN)',
      subtitle: '残り時間を即座に5分追加します',
      badge: 'クイック延長',
      badgeColor: 'bg-blue-600 text-white',
      action: 'addTime',
      url: getActionUrl(roomId, 'addTime', 300),
      qrPayload: `synctimer:action:addTime:${roomId}:300`,
    },
  ];
}
