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
- **Stammdaten** – Teams (Name, Kürzel, Farbe, Organisation) und Matches via Manager verwalten
- **DB Health Status** – Verbindungsstatus Datenbank in allen Seiten sichtbar

## Architektur

```
┌─────────────────┐        WebSocket        ┌──────────────────┐
│  Operator       │ ──────────────────────► │  Server (Node.js)│
│  /operator      │ ◄────────────────────── │  Game State      │
└─────────────────┘     State Broadcasts    │  In-Memory + DB  │
                                            └────────┬─────────┘
┌─────────────────┐                                  │
│  Display        │ ◄────────────────────────────────┤
│  /display.html  │         WebSocket                │
└─────────────────┘                                  │
┌─────────────────┐                         ┌────────┴─────────┐
│  Display n      │ ◄────────────────────── │  PostgreSQL      │
│  /display.html  │                         │  (Docker)        │
└─────────────────┘                         └──────────────────┘
```

- **Backend:** Node.js + Express + WebSocket (`ws`) + Prisma ORM
- **Frontend:** Vue 3 (Composition API) + Vue Router + Pinia, gebündelt via Vite
- **Styling:** Tailwind CSS + DaisyUI (lokal, kein CDN)
- **Sprache:** TypeScript (Client + Server)
- **Datenbank:** PostgreSQL (via Docker)
- **State:** In-Memory (Echtzeit) + PostgreSQL (Persistenz / Crash Recovery)
- **Audio:** Web Audio API (kein externes Soundfile nötig)

## Seiten

| URL | Beschreibung |
|-----|-------------|
| `/` | Dashboard – Spielübersicht, Status laufender Matches |
| `/gamestart` | Spielkonfiguration – Teams wählen, Modus, Start |
| `/operator` | Spielsteuerung – Uhr, Tore, Strafen, Timeouts |
| `/manager` | Stammdaten – Teams und Matches verwalten |
| `/display.html` | Anzeigetafel – für Beamer oder LED-Wand (separater Entry Point, kein CSS-Framework) |

> **Hinweis `display.html`:** Diese Seite ist bewusst ausserhalb der Vue SPA gehalten. Die `vw`/`vh`-basierte Vollbild-Skalierung für TV/Beamer ist inkompatibel mit Utility-CSS-Frameworks. Diese Entscheidung ist architektonisch gesetzt und wird nicht rückgängig gemacht.

## Technologie-Stack

### Frontend
- **Vue 3** (Composition API, `<script setup>`) als Single Page Application
- **Vue Router** mit `createWebHistory()` für saubere URLs (`/operator`, `/manager` etc.)
- **Pinia** für State Management
- **Vite** als Build-Tool mit Hot Module Replacement (HMR) im Dev-Betrieb
- **Tailwind CSS + DaisyUI** lokal gebündelt → zuverlässig auch ohne Internet in der Sporthalle

### Backend
- **Express** served die SPA (`dist/public/index.html`) via Catch-all-Route
- **WebSocket** (`ws`) für Echtzeit-Kommunikation
- **Prisma ORM** mit TypeScript-generierten Types aus dem Schema
- **tsx watch** für Hot Reload des TypeScript-Backends im Dev-Betrieb

### Verzeichnisstruktur

```
/src
  /client
    /components       ← Gemeinsame Vue-Komponenten (z.B. TopNav)
    /pages            ← Vue-Seiten (Dashboard, ManagerApp, GameStart, OperatorApp, DisplayApp)
    /router           ← Vue Router Konfiguration
    shared.ts         ← Gemeinsame Hilfsfunktionen (fmt, phaseLabel, updateStatusBar)
    index.html        ← SPA Entry Point
    display.html      ← Display Entry Point (separater Vite Entry)
  /shared
    types.ts          ← GameState, WS-Message-Types (geteilt Client + Server)
/prisma
  schema.prisma
server.ts             ← Express + WebSocket Backend
```

### Build-Flow

```bash
npm run dev     # Vite Dev-Server (Port 5173, HMR) + tsx watch Backend (Port 3000)
npm run build   # vite build → /dist/public + tsc Backend → /dist
npm start       # node dist/server.js (Production)
```

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
docker run -d --name scoreboard-db \
  -e POSTGRES_PASSWORD=geheim \
  -e POSTGRES_DB=scoreboard \
  -p 5432:5432 postgres:16
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
npm run dev
```

## URLs (lokal)

| Seite | Dev (Vite) | Production |
|-------|-----------|------------|
| Dashboard | http://localhost:5173/ | http://localhost:3000/ |
| Spielstart | http://localhost:5173/gamestart | http://localhost:3000/gamestart |
| Operator | http://localhost:5173/operator | http://localhost:3000/operator |
| Manager | http://localhost:5173/manager | http://localhost:3000/manager |
| Display | http://localhost:5173/display.html | http://localhost:3000/display.html |
| Prisma Studio | `npx prisma studio` → http://localhost:5555 (manuell starten) |

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