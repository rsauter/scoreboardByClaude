interface MatchData {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  phase: string;
  scheduledAt: string;
  status: 'ok' | 'warn' | 'crash' | 'planned';
  lastUpdate: number;
}

// Helper für sicheres HTML (wie in manager.ts)
function esc(str: unknown): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadDashboard(): Promise<void> {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  try {
    const res = await fetch('/api/dashboard');
    if (!res.ok) throw new Error('Failed to fetch');
    const matches: MatchData[] = await res.json();

    if (matches.length === 0) {
      container.innerHTML = `
        <div class="card bg-base-200 shadow-xl p-10 text-center">
          <h2 class="text-xl font-bold mb-2">Keine Matches gefunden</h2>
          <p class="text-base-content/60 mb-4">Es sind keine geplanten oder laufenden Spiele erfasst.</p>
          <a href="manager.html" class="btn btn-primary">Zum Manager</a>
        </div>
      `;
      return;
    }

    // HTML generieren
    const html = matches.map(match => {
      // Status Logik für UI
      let statusLabel = 'UNBEKANNT';
      let statusClass = 'bg-gray-500';
      let badgeClass = 'badge-ghost';
      
      if (match.status === 'ok') {
        statusLabel = 'LIVE';
        statusClass = 'bg-live';
        badgeClass = 'badge-success';
      } else if (match.status === 'warn') {
        statusLabel = 'VERZÖGERT';
        statusClass = 'bg-warn';
        badgeClass = 'badge-warning';
      } else if (match.status === 'crash') {
        statusLabel = 'KEIN SIGNAL';
        statusClass = 'bg-crash';
        badgeClass = 'badge-error';
      } else if (match.status === 'planned') {
        statusLabel = 'GEPLANT';
        statusClass = 'bg-planned';
        badgeClass = 'badge-info';
      }

      const dateStr = new Date(match.scheduledAt).toLocaleString('de-CH', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });

      // Ziel-Links
      const targetOp = match.status === 'planned' ? 'gamestart.html' : 'operator.html';

      return `
        <div class="card bg-base-200 shadow-md hover:shadow-xl transition-all duration-200 border-l-4 ${match.status === 'ok' ? 'border-success' : match.status === 'warn' ? 'border-warning' : match.status === 'crash' ? 'border-error' : 'border-info'}">
          <div class="card-body p-5">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              <!-- Linke Seite: Teams & Status -->
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-1">
                  <span class="status-dot ${statusClass}"></span>
                  <h2 class="card-title text-xl">
                    ${esc(match.homeTeam)} <span class="text-base-content/40 mx-1">vs</span> ${esc(match.awayTeam)}
                  </h2>
                  <div class="badge ${badgeClass} badge-outline font-bold">${statusLabel}</div>
                </div>
                
                <div class="text-sm text-base-content/60 flex flex-wrap gap-4 mt-2">
                  <span>📅 ${dateStr}</span>
                  <span>🏆 Phase: <span class="font-mono">${esc(match.phase)}</span></span>
                  <span>🎯 Score: <span class="font-bold text-base-content">${match.homeScore}:${match.awayScore}</span></span>
                </div>
              </div>

              <!-- Rechte Seite: Aktionen -->
              <div class="flex gap-2 w-full md:w-auto">
                <a href="${targetOp}" class="btn btn-primary btn-sm flex-1 md:flex-none">
                  ${match.status === 'planned' ? 'Starten' : 'Steuerung'}
                </a>
                <a href="display.html" target="_blank" class="btn btn-secondary btn-sm flex-1 md:flex-none">Display</a>
                <a href="manager.html" class="btn btn-ghost btn-sm flex-1 md:flex-none">Manager</a>
              </div>

            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div class="alert alert-error shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>Fehler beim Laden der Dashboard-Daten. Server erreichbar?</span>
      </div>
    `;
  }
}

// Init
loadDashboard();
// Auto-Refresh alle 5 Sekunden
setInterval(loadDashboard, 5000);