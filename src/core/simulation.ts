import { Team, Match, MatchOutcome, MonteCarloConfig, MonteCarloResult } from './types';
import { calculateAverage } from './math';

/**
 * Updates a match outcome in the fixture list
 */
export function applyMatchOutcome(
  matches: Match[],
  matchId: string,
  outcome: MatchOutcome | null
): Match[] {
  return matches.map((m) => {
    if (m.id === matchId) {
      return {
        ...m,
        simulatedOutcome: outcome,
      };
    }
    return m;
  });
}

/**
 * Quick simulation presets
 */
export function applyScenarioPreset(
  matches: Match[],
  preset: 'miramar_wins_all' | 'miramar_loses_all' | 'random' | 'reset',
  targetTeamId: string = 'miramar'
): Match[] {
  if (preset === 'reset') {
    return matches.map((m) => ({ ...m, simulatedOutcome: null }));
  }

  return matches.map((m) => {
    if (m.played) return m;

    if (preset === 'miramar_wins_all') {
      if (m.homeTeamId === targetTeamId) return { ...m, simulatedOutcome: 'HOME_WIN' };
      if (m.awayTeamId === targetTeamId) return { ...m, simulatedOutcome: 'AWAY_WIN' };
      // For rivals, let's keep neutral or slight home advantage
      const rand = Math.random();
      const outcome: MatchOutcome = rand < 0.45 ? 'HOME_WIN' : rand < 0.75 ? 'DRAW' : 'AWAY_WIN';
      return { ...m, simulatedOutcome: outcome };
    }

    if (preset === 'miramar_loses_all') {
      if (m.homeTeamId === targetTeamId) return { ...m, simulatedOutcome: 'AWAY_WIN' };
      if (m.awayTeamId === targetTeamId) return { ...m, simulatedOutcome: 'HOME_WIN' };
      const rand = Math.random();
      const outcome: MatchOutcome = rand < 0.45 ? 'HOME_WIN' : rand < 0.75 ? 'DRAW' : 'AWAY_WIN';
      return { ...m, simulatedOutcome: outcome };
    }

    if (preset === 'random') {
      const rand = Math.random();
      const outcome: MatchOutcome = rand < 0.44 ? 'HOME_WIN' : rand < 0.72 ? 'DRAW' : 'AWAY_WIN';
      return { ...m, simulatedOutcome: outcome };
    }

    return m;
  });
}

/**
 * Monte Carlo Relegation Probability Engine
 * Runs thousands of full season endings to compute exact probabilities for Miramar
 */
export function runMonteCarloSimulation(
  teams: Team[],
  matches: Match[],
  config: MonteCarloConfig,
  targetTeamId: string = 'miramar',
  relegationCount: number = 3
): MonteCarloResult {
  const startTime = performance.now();
  const iterations = Math.max(100, Math.min(config.iterations, 20000));

  // Pre-filter unplayed or non-manually-fixed matches
  // If a match already has a simulatedOutcome manually chosen by the user, we respect it as locked!
  const fixedMatches = matches.filter((m) => m.simulatedOutcome !== null && m.simulatedOutcome !== undefined);
  const unplayedMatches = matches.filter((m) => !m.played && !m.simulatedOutcome);

  // Fast mapping of team base points
  const teamBase = teams.map((t) => {
    // calculate manually locked match points
    let manualPoints = 0;
    let manualPlayed = 0;
    let manualGf = 0;
    let manualGc = 0;

    fixedMatches.forEach((m) => {
      if (m.homeTeamId === t.id) {
        manualPlayed += 1;
        if (m.simulatedOutcome === 'HOME_WIN') {
          manualPoints += 3;
          manualGf += 2;
        } else if (m.simulatedOutcome === 'DRAW') {
          manualPoints += 1;
          manualGf += 1;
          manualGc += 1;
        } else if (m.simulatedOutcome === 'AWAY_WIN') {
          manualGc += 2;
        }
      } else if (m.awayTeamId === t.id) {
        manualPlayed += 1;
        if (m.simulatedOutcome === 'AWAY_WIN') {
          manualPoints += 3;
          manualGf += 2;
        } else if (m.simulatedOutcome === 'DRAW') {
          manualPoints += 1;
          manualGf += 1;
          manualGc += 1;
        } else if (m.simulatedOutcome === 'HOME_WIN') {
          manualGc += 2;
        }
      }
    });

    return {
      id: t.id,
      name: t.name,
      isTarget: t.id === targetTeamId,
      histPoints: t.seasonHistoryPoints,
      histPlayed: t.seasonHistoryPlayed,
      currPoints: t.seasonCurrentPoints + manualPoints,
      currPlayed: t.seasonCurrentPlayed + manualPlayed,
      gf: t.gf + manualGf,
      gc: t.gc + manualGc,
      formRatio: calculateFormRatio(t.recentForm),
    };
  });

  const teamCount = teamBase.length;
  const cutOffPosition = teamCount - relegationCount + 1; // e.g. 16 - 3 + 1 = 14

  let relegationOccurrences = 0;
  let totalPositionSum = 0;
  const positionDistribution: Record<number, number> = {};
  for (let i = 1; i <= teamCount; i++) {
    positionDistribution[i] = 0;
  }

  let bestScenarioPoints = 0;
  let worstScenarioPoints = 999;

  // Pre-compile match indices for fast array access
  const matchTuples = unplayedMatches.map((m) => {
    const homeIdx = teamBase.findIndex((t) => t.id === m.homeTeamId);
    const awayIdx = teamBase.findIndex((t) => t.id === m.awayTeamId);
    return {
      homeIdx,
      awayIdx,
      isHomeTarget: teamBase[homeIdx]?.isTarget ?? false,
      isAwayTarget: teamBase[awayIdx]?.isTarget ?? false,
    };
  });

  // Reusable buffers for performance
  const simPoints = new Int32Array(teamCount);
  const simPlayed = new Int32Array(teamCount);
  const simGf = new Int32Array(teamCount);
  const simGc = new Int32Array(teamCount);

  // Reusable array of row indices to sort
  const indices = new Int32Array(teamCount);
  const averages = new Float64Array(teamCount);
  const goalDiffs = new Int32Array(teamCount);

  for (let iter = 0; iter < iterations; iter++) {
    simPoints.fill(0);
    simPlayed.fill(0);
    simGf.fill(0);
    simGc.fill(0);

    // Simulate each pending match
    for (let m = 0; m < matchTuples.length; m++) {
      const match = matchTuples[m];
      if (match.homeIdx === -1 || match.awayIdx === -1) continue;

      const home = teamBase[match.homeIdx];
      const away = teamBase[match.awayIdx];

      // Probabilities
      let pHome = 0.44;
      let pDraw = 0.28;

      if (config.weighting === 'form_weighted') {
        const diff = (home.formRatio - away.formRatio) * 0.15;
        pHome = Math.max(0.15, Math.min(0.70, 0.44 + diff));
        pDraw = 0.28;
      } else if (config.weighting === 'miramar_optimistic') {
        if (match.isHomeTarget) {
          pHome = 0.70;
          pDraw = 0.20;
        } else if (match.isAwayTarget) {
          pHome = 0.15;
          pDraw = 0.20;
        }
      } else if (config.weighting === 'miramar_pessimistic') {
        if (match.isHomeTarget) {
          pHome = 0.20;
          pDraw = 0.25;
        } else if (match.isAwayTarget) {
          pHome = 0.65;
          pDraw = 0.20;
        }
      }

      const roll = Math.random();
      simPlayed[match.homeIdx]++;
      simPlayed[match.awayIdx]++;

      if (roll < pHome) {
        // Local gana
        simPoints[match.homeIdx] += 3;
        simGf[match.homeIdx] += 2;
        simGc[match.awayIdx] += 2;
      } else if (roll < pHome + pDraw) {
        // Empate
        simPoints[match.homeIdx] += 1;
        simPoints[match.awayIdx] += 1;
        simGf[match.homeIdx] += 1;
        simGc[match.homeIdx] += 1;
        simGf[match.awayIdx] += 1;
        simGc[match.awayIdx] += 1;
      } else {
        // Visita gana
        simPoints[match.awayIdx] += 3;
        simGf[match.awayIdx] += 2;
        simGc[match.homeIdx] += 2;
      }
    }

    // Compute final averages for this iteration
    let targetPtsInIteration = 0;

    for (let i = 0; i < teamCount; i++) {
      indices[i] = i;
      const t = teamBase[i];
      const finalTotalPts = t.histPoints + t.currPoints + simPoints[i];
      const finalTotalPlayed = t.histPlayed + t.currPlayed + simPlayed[i];
      averages[i] = finalTotalPlayed > 0 ? finalTotalPts / finalTotalPlayed : 0;
      goalDiffs[i] = t.gf + simGf[i] - (t.gc + simGc[i]);

      if (t.isTarget) {
        targetPtsInIteration = t.currPoints + simPoints[i];
      }
    }

    if (targetPtsInIteration > bestScenarioPoints) bestScenarioPoints = targetPtsInIteration;
    if (targetPtsInIteration < worstScenarioPoints) worstScenarioPoints = targetPtsInIteration;

    // Quick sort indices based on average, then goalDiff
    indices.sort((a, b) => {
      const diff = averages[b] - averages[a];
      if (Math.abs(diff) > 0.000001) return diff > 0 ? 1 : -1;
      return goalDiffs[b] - goalDiffs[a];
    });

    // Find target team position
    let targetRank = 1;
    for (let pos = 0; pos < teamCount; pos++) {
      if (teamBase[indices[pos]].isTarget) {
        targetRank = pos + 1;
        break;
      }
    }

    positionDistribution[targetRank] = (positionDistribution[targetRank] || 0) + 1;
    totalPositionSum += targetRank;

    if (targetRank >= cutOffPosition) {
      relegationOccurrences++;
    }
  }

  const relegationRate = Number(((relegationOccurrences / iterations) * 100).toFixed(2));
  const safetyRate = Number((100 - relegationRate).toFixed(2));
  const averageFinalPosition = Number((totalPositionSum / iterations).toFixed(2));
  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    iterations,
    relegationRate,
    safetyRate,
    positionDistribution,
    averageFinalPosition,
    bestScenarioPoints,
    worstScenarioPoints: worstScenarioPoints === 999 ? 0 : worstScenarioPoints,
    executionTimeMs,
  };
}

function calculateFormRatio(form: ('W' | 'D' | 'L')[]): number {
  if (!form || form.length === 0) return 0.5;
  let points = 0;
  form.forEach((res) => {
    if (res === 'W') points += 3;
    if (res === 'D') points += 1;
  });
  return points / (form.length * 3);
}
