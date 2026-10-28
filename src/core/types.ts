/**
 * Domain types for Uruguayan League Relegation & Average Simulator
 * (Calculadora Celeste - Foco en Miramar Misiones)
 */

export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string; // e.g. 'MIR', 'FEN', 'DEP'
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent?: string;
  };
  isNew: boolean; // True: 1 season divisor (recién ascendido / nuevo). False: 2 seasons (~60+ PJ divisor)
  seasonHistoryPoints: number; // Puntos temporada anterior (0 si isNew)
  seasonHistoryPlayed: number; // PJ temporada anterior (0 si isNew)
  seasonCurrentPoints: number; // Puntos temporada en curso
  seasonCurrentPlayed: number; // PJ temporada en curso
  gf: number; // Goles a favor temporada actual
  gc: number; // Goles en contra temporada actual
  recentForm: ('W' | 'D' | 'L')[]; // Últimos partidos
  isTarget?: boolean; // Miramar Misiones
}

export type RelegationStatus = 'safe' | 'danger' | 'relegated' | 'bubble';

export interface StandingRow {
  team: Team;
  totalPoints: number;
  totalPlayed: number;
  average: number; // promedio con 3 decimales
  goalDiff: number;
  gf: number;
  gc: number;
  annualPoints: number;
  annualPlayed: number;
  position: number;
  status: RelegationStatus;
  pointsToSafety: number; // cuántos puntos de promedio le faltan para salir de la zona roja
  pointsAboveDrop: number; // cuántos puntos de promedio tiene de ventaja sobre el 1º que desciende
}

export type MatchOutcome = 'HOME_WIN' | 'DRAW' | 'AWAY_WIN';

export interface Match {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number | null;
  awayScore?: number | null;
  played: boolean;
  simulatedOutcome?: MatchOutcome | null;
  dateLabel?: string;
}

export interface MonteCarloConfig {
  iterations: number;
  weighting: 'neutral' | 'form_weighted' | 'miramar_optimistic' | 'miramar_pessimistic';
}

export interface MonteCarloResult {
  iterations: number;
  relegationRate: number; // % descenso (0 - 100)
  safetyRate: number; // % salvación (0 - 100)
  positionDistribution: Record<number, number>; // Posición -> Conteo
  averageFinalPosition: number;
  bestScenarioPoints: number;
  worstScenarioPoints: number;
  executionTimeMs: number;
}

export interface MagicPointsAnalysis {
  targetTeam: Team;
  maxPointsAchievable: number;
  currentPoints: number;
  remainingMatches: number;
  magicPointsToGuaranteeSafety: number;
  isMathematicallySaved: boolean;
  isMathematicallyRelegated: boolean;
  rivalsInThreat: {
    team: Team;
    maxPossibleAverage: number;
    currentAverage: number;
  }[];
}
