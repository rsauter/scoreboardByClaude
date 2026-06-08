# Matchuhr – Unihockey Scoreboard

Ein webbasiertes Echtzeit-Scoreboard für Unihockey, entwickelt als Open-Source-Alternative zu kommerziellen Anzeigesystemen (z.B. ScoreBoard-system.com).

## Features

- **Spielzeit** – Countdown mit Start/Stop, konfigurierbare Spieldauer
- **Spielmodi** – 1×24 min (E-Junioren), 2×20 min (Halbzeiten), 3×20 min (Dritteln)
- **Pausen** – 5 / 10 / 15 Minuten
- **Verlängerung** – Sudden Death 5 oder 10 Minuten
- **Penalty / Shootout** – manuell gesteuert
- **Spielstand** – Tore Heim & Gast mit Korrekturmöglichkeit
- **Strafen** – bis zu 2 gleichzeitige pro Team, 2 / 5 / 10 Minuten, laufen automatisch ab
- **Timeout** – 30 Sekunden, 1 pro Team
- **Zeitkorrektur** – [−] [+] Buttons zum Korrigieren wenn Schiri zu spät gestoppt hat (passt Spielzeit und aktive Strafen an)
- **Buzzer** – akustisches Signal bei Ablauf von Spielzeit, Pause, Timeout und Strafen
- **Echtzeit-Sync** – beliebig viele Anzeigegeräte (Beamer, LED-Wand, Tablets) via WebSocket
- **Crash Recovery** – Game State wird alle 5 Sekunden in DB gespeichert, beim Neustart automatisch wiederhergestellt
- **Stammdaten** – Teams (Name, Kürzel, Farbe, Organisation) via Manager verwalten
- **DB Health Status** – Verbindungsstatus Datenbank in allen Seiten sichtbar

## Architektur

```
┌─────────────────┐        WebSocket        ┌──────────────────┐
│  Operator       │ ──────────────────────► │  Server (Node.js)│
│  (operator.html)│ ◄────────────────────── │  Game State      │
└─────────────────┘     State Broadcasts    │  In-Memory + DB  │
                                            └────────┬─────────┘
┌─────────────────┐                                  │
│  Display 1      │ ◄────────────────────────────────┤
│  (display.html) │         WebSocket                │
└─────────────────┘                                  │
┌─────────────────┐                         ┌────────┴─────────┐
│  Display n      │ ◄────────────────────── │  PostgreSQL      │
│  (display.html) │                         │  (Docker)        │
└─────────────────┘                         └──────────────────┘
```

- **Backend:** Node.js + Express + WebSocket (`ws`) + Prisma ORM
- **Frontend:** Vanilla HTML/CSS/JavaScript, kein Framework
- **Datenbank:** PostgreSQL (via Docker)
- **State:** In-Memory (Echtzeit) + PostgreSQL (Persistenz / Crash Recovery)
- **Audio:** Web Audio API (kein externes Soundfile nötig)

## Technologie-Entscheide

### Vite + TypeScript (geplante Migration)

Das Projekt wird schrittweise auf **Vite** (Build-Tool) und **TypeScript** migriert.

**Warum Vite?**
- Hot Module Replacement (HMR) im Dev-Betrieb — Änderungen sofort im Browser, kein manueller Reload
- Echter ES-Modul-Import statt globaler `<script>`-Tags → saubere Abhängigkeiten zwischen Dateien
- Tailwind/DaisyUI wird lokal gebündelt statt via CDN geladen → zuverlässig auch ohne Internet in der Sporthalle
- `vite build` produziert optimierte statische Dateien in `/dist`, die Express weiterhin served
- Minimaler Konfigurations-Overhead (kein Webpack)

Das Backend (Express / WebSocket / Prisma) bleibt vollständig unverändert. Vite übernimmt ausschliesslich den Frontend-Dev-Workflow.

**Warum TypeScript?**
- Das zentrale `state`-Objekt (`phase`, `penalties`, `timeRemaining` etc.) bekommt ein Interface → Tippfehler werden zur Compile-Zeit erkannt, nicht erst im Browser
- WebSocket-Nachrichten können mit Union Types modelliert werden → kein implizites `any` mehr
- Prisma generiert bereits TypeScript-Types aus dem Schema — diese können nun vollständig genutzt werden
- Deutlich besseres Autocomplete und Inline-Fehlerhinweise in VS Code
- Schrittweise Migration möglich: Datei für Datei von `.js` → `.ts`, kein Big-Bang-Rewrite

**Angestrebte Verzeichnisstruktur nach Migration:**

```
/src
  /client             ← Vite-Einstiegspunkte (bisher inline JS im HTML)
    gamestart.ts
    operator.ts
    manager.ts
    display.ts        ← bleibt CSS-framework-frei, nur TS statt JS
  /shared
    types.ts          ← GameState, WS-Message-Types (geteilt Client + Server)
/server
  server.ts
  app.ts
```

**Build-Flow:**

```bash
npm run dev     # Vite Dev-Server (HMR) + tsx für Backend
npm run build   # vite build → /dist (von Express als static served)
npm start       # node dist/server.js
```

> **Hinweis `display.html`:** Diese Seite bleibt bewusst frei von CSS-Frameworks. Die `vw`/`vh`-basierte Vollbild-Skalierung für TV/Beamer ist inkompatibel mit Utility-CSS-Frameworks (z.B. Tailwind). Diese Entscheidung ist architektonisch gesetzt und wird nicht rückgängig gemacht.

## Seiten

| URL | Beschreibung |
|-----|-------------|
| `/gamestart.html` | Spielkonfiguration – Teams wählen, Modus, Start |
| `/operator.html` | Spielsteuerung – Uhr, Tore, Strafen, Timeouts |
| `/display.html` | Anzeigetafel – für Beamer oder LED-Wand |
| `/manager.html` | Stammdaten – Teams verwalten |

## Voraussetzungen

- Node.js 24+
- Docker

## Installation

```bash
git clone https://github.com/rsauter/scoreBoardByClaude.git
cd scoreBoardByClaude
```

**PostgreSQL via Docker starten:**
```bash
docker run -d --name scoreboard-db -e POSTGRES_PASSWORD=geheim -e POSTGRES_DB=scoreboard -p 5432:5432  postgres:16
```

**Umgebungsvariablen konfigurieren:**
```bash
cp .env.example .env
# .env anpassen (DB-Passwort etc.)
```

**Dependencies installieren & DB migrieren:**
```bash
npm install
npx prisma migrate deploy
npm start
```

## URLs (lokal)

- Spielstart: http://localhost:3000/gamestart.html
- Operator:   http://localhost:3000/operator.html
- Display:    http://localhost:3000/display.html
- Manager:    http://localhost:3000/manager.html
- Prisma Studio (optional): `npx prisma studio` → http://localhost:5555

Für den Einsatz im lokalen Netzwerk (z.B. Sporthalle):
- Server läuft auf dem Operator-Laptop
- Display-URL: `http://192.168.x.x:3000/display.html`

## Roadmap

- [ ] Display: Verbindungs-/Spielstatus Dot (grün/gelb/rot)
- [ ] Spieler-CRUD im Manager
- [ ] Tore pro Spieler erfassen (Statistik)
- [ ] Match-History / Resultate
- [ ] Authentifizierung Operator-View
- [ ] Mobile-optimierter Operator (Schiri-Tablet)
- [ ] Ligaverwaltung / Spielplan
- [ ] QR-Code auf Display für schnelle Verbindung
- [ ] Externer Buzzer / Soundfile-Unterstützung
- [ ] RS485-Protokoll für physische LED-Anzeigetafeln

## Lizenz

MIT

## Autor

Roger Sauter – [@rsauter](https://github.com/rsauter) – 2026