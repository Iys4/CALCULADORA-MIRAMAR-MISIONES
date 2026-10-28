import { Team, Match, StandingRow, MagicPointsAnalysis } from './types';

/**
 * Calculates Promedio (Points / Matches Played) with 4-decimal precision
 */
export function calculateAverage(points: number, played: number): number {
  if (played <= 0) return 0;
  return Number((points / played).toFixed(4));
}

/**
 * Computes the complete Promedios and Anual standings including simulated matches
 * with exact dynamic goal difference calculations (assumes 1-0 or custom scores)
 */
export function computeStandings(
  teams: Team[],
  matches: Match[] = [],
  relegationZoneCount: number = 2 // 2 descensos en Segunda División AUF
): StandingRow[] {
  // Map to track simulated additions
  const simulatedStats = new Map<
    string,
    { points: number; played: number; gf: number; gc: number }
  >();

  teams.forEach((t) => {
    simulatedStats.set(t.id, { points: 0, played: 0, gf: 0, gc: 0 });
  });

  matches.forEach((m) => {
    if (m.simulatedOutcome === null || m.simulatedOutcome === undefined) return;

    const homeStats = simulatedStats.get(m.homeTeamId);
    const awayStats = simulatedStats.get(m.awayTeamId);
    if (!homeStats || !awayStats) return;

    homeStats.played += 1;
    awayStats.played += 1;

    // Use exact score if present, else default to 1-0 or 0-0 or 0-1
    let hScore = typeof m.homeScore === 'number' ? m.homeScore : 0;
    let aScore = typeof m.awayScore === 'number' ? m.awayScore : 0;

    if (m.homeScore === null || m.homeScore === undefined) {
      if (m.simulatedOutcome === 'HOME_WIN') {
        hScore = 1;
        aScore = 0;
      } else if (m.simulatedOutcome === 'DRAW') {
        hScore = 0;
        aScore = 0;
      } else if (m.simulatedOutcome === 'AWAY_WIN') {
        hScore = 0;
        aScore = 1;
      }
    }

    homeStats.gf += hScore;
    homeStats.gc += aScore;
    awayStats.gf += aScore;
    awayStats.gc += hScore;

    if (hScore > aScore) {
      homeStats.points += 3;
    } else if (hScore === aScore) {
      homeStats.points += 1;
      awayStats.points += 1;
    } else {
      awayStats.points += 3;
    }
  });

  // Build rows
  const rows = teams.map((team) => {
    const sim = simulatedStats.get(team.id) || { points: 0, played: 0, gf: 0, gc: 0 };
    const totalPoints = team.seasonHistoryPoints + team.seasonCurrentPoints + sim.points;
    const totalPlayed = team.seasonHistoryPlayed + team.seasonCurrentPlayed + sim.played;
    const average = calculateAverage(totalPoints, totalPlayed);

    const annualPoints = team.seasonCurrentPoints + sim.points;
    const annualPlayed = team.seasonCurrentPlayed + sim.played;
    const totalGf = team.gf + sim.gf;
    const totalGc = team.gc + sim.gc;
    const goalDiff = totalGf - totalGc;

    return {
      team,
      totalPoints,
      totalPlayed,
      average,
      goalDiff,
      gf: totalGf,
      gc: totalGc,
      annualPoints,
      annualPlayed,
      position: 0,
      status: 'safe' as const,
      pointsToSafety: 0,
      pointsAboveDrop: 0,
    };
  });

  // Sort according to AUF tiebreakers:
  // 1. Promedio (mayor es mejor)
  // 2. Diferencia de goles
  // 3. Goles a favor
  // 4. Nombre
  rows.sort((a, b) => {
    if (Math.abs(b.average - a.average) > 0.00001) {
      return b.average - a.average;
    }
    if (b.goalDiff !== a.goalDiff) {
      return b.goalDiff - a.goalDiff;
    }
    if (b.gf !== a.gf) {
      return b.gf - a.gf;
    }
    return a.team.name.localeCompare(b.team.name);
  });

  // Assign positions and relegation zone
  const totalTeams = rows.length;
  const cutOffIndex = totalTeams - relegationZoneCount; // ej: 14 - 2 = 12
  const safeLineAverage = cutOffIndex > 0 ? rows[cutOffIndex - 1].average : 0;
  const dropLineAverage = rows[cutOffIndex]?.average || 0;

  return rows.map((row, idx) => {
    const position = idx + 1;
    let status: StandingRow['status'] = 'safe';

    if (position > cutOffIndex) {
      status = 'relegated';
    } else if (position === cutOffIndex) {
      status = 'bubble';
    }

    const pointsToSafety =
      status === 'relegated' ? Number((safeLineAverage - row.average).toFixed(4)) : 0;
    const pointsAboveDrop =
      status !== 'relegated' ? Number((row.average - dropLineAverage).toFixed(4)) : 0;

    return {
      ...row,
      position,
      status,
      pointsToSafety,
      pointsAboveDrop,
    };
  });
}

/**
 * Calculates mathematical requirements for Miramar Misiones to ensure survival
 */
export function calculateMagicPoints(
  teams: Team[],
  remainingMatches: Match[],
  targetTeamId: string = 'miramar',
  relegationCount: number = 2
): MagicPointsAnalysis {
  const target = teams.find((t) => t.id === targetTeamId) || teams[0];
  const targetRemainingMatches = remainingMatches.filter(
    (m) =>
      !m.played &&
      (m.simulatedOutcome === null || m.simulatedOutcome === undefined) &&
      (m.homeTeamId === target.id || m.awayTeamId === target.id)
  ).length;

  const maxPointsAchievable = target.seasonCurrentPoints + targetRemainingMatches * 3;

  const standings = computeStandings(teams, []);

  const rivalsInThreat = teams
    .filter((t) => t.id !== target.id)
    .map((rival) => {
      const rivalRemaining = remainingMatches.filter(
        (m) =>
          !m.played &&
          (m.simulatedOutcome === null || m.simulatedOutcome === undefined) &&
          (m.homeTeamId === rival.id || m.awayTeamId === rival.id)
      ).length;

      const maxRivalTotalPoints =
        rival.seasonHistoryPoints + rival.seasonCurrentPoints + rivalRemaining * 3;
      const finalRivalPlayed =
        rival.seasonHistoryPlayed + rival.seasonCurrentPlayed + rivalRemaining;
      const maxPossibleAverage = calculateAverage(maxRivalTotalPoints, finalRivalPlayed);

      const currentTotalPts = rival.seasonHistoryPoints + rival.seasonCurrentPoints;
      const currentTotalPlayed = rival.seasonHistoryPlayed + rival.seasonCurrentPlayed;
      const currentAverage = calculateAverage(currentTotalPts, currentTotalPlayed);

      return {
        team: rival,
        maxPossibleAverage,
        currentAverage,
      };
    })
    .sort((a, b) => a.currentAverage - b.currentAverage);

  const targetFinalPlayed =
    target.seasonHistoryPlayed + target.seasonCurrentPlayed + targetRemainingMatches;

  let magicPoints = targetRemainingMatches * 3;
  let isMathematicallySaved = false;

  for (let pts = 0; pts <= targetRemainingMatches * 3; pts++) {
    const testTargetTotal = target.seasonHistoryPoints + target.seasonCurrentPoints + pts;
    const testTargetAvg = calculateAverage(testTargetTotal, targetFinalPlayed);

    const rivalsDefeated = rivalsInThreat.filter((r) => r.maxPossibleAverage < testTargetAvg).length;

    if (rivalsDefeated >= relegationCount) {
      magicPoints = pts;
      isMathematicallySaved = (pts === 0);
      break;
    }
  }

  const maxPossibleTargetAvg = calculateAverage(
    target.seasonHistoryPoints + maxPointsAchievable,
    targetFinalPlayed
  );
  const rivalsGuaranteedAbove = rivalsInThreat.filter(
    (r) => r.currentAverage > maxPossibleTargetAvg
  ).length;

  const isMathematicallyRelegated = rivalsGuaranteedAbove >= (teams.length - relegationCount);

  return {
    targetTeam: target,
    maxPointsAchievable,
    currentPoints: target.seasonCurrentPoints,
    remainingMatches: targetRemainingMatches,
    magicPointsToGuaranteeSafety: Math.min(magicPoints, targetRemainingMatches * 3),
    isMathematicallySaved,
    isMathematicallyRelegated,
    rivalsInThreat: rivalsInThreat.slice(0, 6),
  };
}
