export function fmt(s: number): string {
  const c = Math.ceil(s);
  return `${Math.floor(c / 60)}:${String(c % 60).padStart(2, '0')}`;
}

export function phaseLabel(s: { phase: string; gameMode: string; currentPeriod: number | string }): string {
  const map: Record<string, string> = {
    pregame:  'Vor dem Spiel',
    break:    'Pause',
    overtime: 'Verlängerung (Sudden Death)',
    shootout: 'Penalty / Shootout',
    ended:    'Spiel beendet',
  };
  if (map[s.phase]) return map[s.phase];
  const p = s.currentPeriod;
  if (s.gameMode === '2x20') return p === 1 ? '1. Halbzeit' : '2. Halbzeit';
  return `${p}. Drittel`;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    return data.db === 'ok';
  } catch {
    return false;
  }
}

export async function updateStatusBar(wsStatus: string | null = null): Promise<void> {
  const el = document.getElementById('conn-status');
  if (!el) return;
  const dbOk = await checkHealth();
  const dbPart = dbOk ? '🟢 DB online' : '🔴 DB offline';
  if (wsStatus !== null) {
    el.textContent = `${wsStatus} | ${dbPart}`;
  } else {
    el.textContent = dbPart;
  }
}