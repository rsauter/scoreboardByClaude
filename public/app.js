// public/app.js
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    return data.db === 'ok';
  } catch (e) {
    return false;
  }
}

async function updateStatusBar(wsStatus = null) {
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