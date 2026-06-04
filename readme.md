# Matchuhr – Unihockey Scoreboard

Ein webbasiertes Echtzeit-Scoreboard für Unihockey, entwickelt als Open-Source-Alternative zu kommerziellen Anzeigesystemen (z.B. Score Systems).

## Features

- **Spielzeit** – Countdown mit Start/Stop, konfigurierbare Spieldauer
- **Spielmodi** – 1×24 min (E-Junioren), 2×20 min (Halbzeiten), 3×20 min (Dritteln)
- **Pausen** – 5 / 10 / 15 Minuten
- **Verlängerung** – Sudden Death 5 oder 10 Minuten
- **Penalty / Shootout** – manuell gesteuert
- **Spielstand** – Tore Heim & Gast mit Korrekturmöglichkeit
- **Strafen** – bis zu 2 gleichzeitige pro Team, 2 / 5 / 10 Minuten, laufen automatisch ab
- **Timeout** – 30 Sekunden, 1 pro Team
- **Buzzer** – akustisches Signal bei Ablauf von Spielzeit, Pause, Timeout und Strafen
- **Echtzeit-Sync** – beliebig viele Anzeigegeräte (Beamer, LED-Wand, Tablets) via WebSocket

## Architektur

```
┌─────────────────┐        WebSocket        ┌──────────────────┐
│  Operator       │ ──────────────────────► │  Server (Node.js)│
│  (operator.html)│ ◄────────────────────── │  Game State      │
└─────────────────┘     State Broadcasts    │  In-Memory       │
                                            └────────┬─────────┘
┌─────────────────┐                                  │
│  Display 1      │ ◄────────────────────────────────┤
│  (display.html) │         WebSocket                │
└─────────────────┘                                  │
┌─────────────────┐                                  │
│  Display n      │ ◄────────────────────────────────┘
│  (display.html) │
└─────────────────┘
```

- **Backend:** Node.js + Express + WebSocket (`ws`)
- **Frontend:** Vanilla HTML/CSS/JavaScript, kein Framework
- **State:** In-Memory (MVP) – PostgreSQL-Anbindung vorbereitet
- **Audio:** Web Audio API (kein externes Soundfile nötig)

## Voraussetzungen

- Node.js >= 18

## Installation

## Installation

### Voraussetzungen
- Node.js 24+
- Docker

### Setup

```bash
git clone https://github.com/rsauter/scoreBoardByClaude.git
cd scoreBoardByClaude
```

**PostgreSQL via Docker starten:**
```bash
docker run -d --name scoreboard-db \
  -e POSTGRES_PASSWORD=geheim \
  -e POSTGRES_DB=scoreboard \
  -p 5432:5432 \
  postgres:16
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

### URLs
- Spielstart: http://localhost:3000/gamestart.html
- Operator:   http://localhost:3000/operator.html
- Display:    http://localhost:3000/display.html
- Manager:    http://localhost:3000/manager.html
- Prisma Studio (optional): `npx prisma studio` → http://localhost:5555

## Verwendung

| URL | Beschreibung |
|-----|-------------|
| `http://localhost:3000/operator.html` | Steuerung (1 Gerät) |
| `http://localhost:3000/display.html` | Anzeige (beliebig viele Geräte) |

Für den Einsatz im lokalen Netzwerk (z.B. Halle):
- Server läuft auf dem Operator-Laptop
- Display-URL: `http://192.168.x.x:3000/display.html`

## Roadmap

- [ ] PostgreSQL-Anbindung (Spielresultate, Statistiken)
- [ ] Authentifizierung Operator-View
- [ ] Mobile-optimierter Operator (Schiri-Tablet)
- [ ] Ligaverwaltung / Spielplan
- [ ] QR-Code auf Display für schnelle Verbindung
- [ ] Externer Buzzer / Soundfile-Unterstützung

## Lizenz

MIT

## Autor

Roger Sauter – [@rsauter](https://github.com/rsauter) - 2026
