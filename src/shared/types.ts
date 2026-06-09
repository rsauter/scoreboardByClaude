export interface Penalty {
  id: number;
  team: 'home' | 'away';
  player: string;
  duration: number;
  remaining: number;
}

export type GamePhase =
  | 'pregame'
  | 'period'
  | 'break'
  | 'overtime'
  | 'shootout'
  | 'ended';

export type GameMode = '1x24' | '2x20' | '3x20';

export interface GameState {
  gameMode: GameMode;
  periodDuration: number;
  breakDuration: number;
  otDuration: number;
  homeTeam: string;
  awayTeam: string;
  homeColor: string;
  awayColor: string;
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
  phase: GamePhase;
  currentPeriod: number | 'OT' | 'OT_PENDING' | 'SO';
  timeRemaining: number;
  running: boolean;
  penalties: Penalty[];
  homeTimeouts: number;
  awayTimeouts: number;
  timeoutActive: 'home' | 'away' | null;
  timeoutRemaining: number;
  homeShootout: number;
  awayShootout: number;
  lastTick: number | null;
}

// WebSocket Messages Server → Client
export type ServerMessage =
  | { type: 'STATE'; state: GameState }
  | { type: 'BUZZER'; reason: 'period' | 'timeout' | 'penalty'; id?: number };

// WebSocket Commands Client → Server
export type ClientCommand =
  | { cmd: 'SET_CONFIG'; homeTeam: string; awayTeam: string; gameMode: GameMode; breakDuration: number; otDuration: number; matchId?: number }
  | { cmd: 'START' }
  | { cmd: 'STOP' }
  | { cmd: 'NEXT_PHASE' }
  | { cmd: 'RESET' }
  | { cmd: 'GOAL_HOME' }
  | { cmd: 'GOAL_AWAY' }
  | { cmd: 'UNDO_HOME' }
  | { cmd: 'UNDO_AWAY' }
  | { cmd: 'SO_HOME' }
  | { cmd: 'SO_AWAY' }
  | { cmd: 'ADD_PENALTY'; team: 'home' | 'away'; player: string; duration: number }
  | { cmd: 'REMOVE_PENALTY'; id: number }
  | { cmd: 'TIMEOUT'; team: 'home' | 'away' }
  | { cmd: 'ADJUST_TIME'; delta: number };