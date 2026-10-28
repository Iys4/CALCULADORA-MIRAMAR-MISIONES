import React, { useState } from 'react';
import { Match, MatchOutcome, Team } from '../core/types';
import { 
  CalendarCheck, 
  RotateCcw, 
  Sparkles, 
  Filter, 
  Zap, 
  CheckCircle2,
  Trophy,
  Flame
} from 'lucide-react';

interface FixtureSimulatorProps {
  matches: Match[];
  teams: Team[];
  onOutcomeChange: (matchId: string, outcome: MatchOutcome | null) => void;
  onReset: () => void;
}

export const FixtureSimulator: React.FC<FixtureSimulatorProps> = ({
  matches,
  teams,
  onOutcomeChange,
  onReset,
}) => {
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'miramar' | 'relegation_zone'>('all');

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Relegation competitors
  const relegationRivalIds = new Set(['miramar', 'fenix', 'dep_maldonado', 'rampla', 'cerro', 'river_plate']);

  // Extract distinct rounds
  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  // Filter matches
  const filteredMatches = matches.filter((m) => {
    if (selectedRound !== 'all' && m.round !== selectedRound) return false;

    if (filterMode === 'miramar') {
      return m.homeTeamId === 'miramar' || m.awayTeamId === 'miramar';
    }

    if (filterMode === 'relegation_zone') {
      return relegationRivalIds.has(m.homeTeamId) || relegationRivalIds.has(m.awayTeamId);
    }

    return true;
  });

  const simulatedCount = matches.filter((m) => m.simulatedOutcome).length;

  return (
    <div className="space-y-6">
      {/* Top Controls Banner */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-display flex items-center gap-2">
                Simulador "What-If" de Partidos Restantes
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  {simulatedCount} simulados de {matches.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Toca [1] [X] o [2] para definir qué equipo gana o empata y observa el impacto inmediato en el promedio de Miramar
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Round selector */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedRound('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                selectedRound === 'all'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas las fechas
            </button>
            {rounds.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRound(r)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  selectedRound === r
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                F{r}
              </button>
            ))}
          </div>

          {/* Quick Focus Filter */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterMode('miramar')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterMode === 'miramar'
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Solo Miramar
            </button>
            <button
              onClick={() => setFilterMode('relegation_zone')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                filterMode === 'relegation_zone'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Zona Baja
            </button>
          </div>

          {simulatedCount > 0 && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Matches Grid by Round */}
      {rounds
        .filter((r) => selectedRound === 'all' || selectedRound === r)
        .map((roundNumber) => {
          const roundMatches = filteredMatches.filter((m) => m.round === roundNumber);
          if (roundMatches.length === 0) return null;

          return (
            <div key={roundNumber} className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-bold text-white text-sm font-display flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-extrabold text-sky-400">
                    {roundNumber}
                  </span>
                  Fecha {roundNumber} del Torneo Clausura
                </h4>
                <span className="text-xs text-slate-400">
                  {roundMatches.filter((m) => m.simulatedOutcome).length} de {roundMatches.length} pronosticados
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roundMatches.map((match) => {
                  const home = teamMap.get(match.homeTeamId);
                  const away = teamMap.get(match.awayTeamId);
                  if (!home || !away) return null;

                  const isMiramarMatch = home.id === 'miramar' || away.id === 'miramar';
                  const isDirectRelegationDuel =
                    relegationRivalIds.has(home.id) && relegationRivalIds.has(away.id);

                  return (
                    <div
                      key={match.id}
                      className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                        isMiramarMatch
                          ? 'bg-sky-950/20 border-sky-500/40 shadow-md shadow-sky-500/5'
                          : isDirectRelegationDuel
                          ? 'bg-red-950/15 border-red-500/30'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Match tags */}
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Fecha {match.round}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isMiramarMatch && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-sky-400 text-slate-950 uppercase tracking-wider">
                              Miramar Misiones
                            </span>
                          )}
                          {isDirectRelegationDuel && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 uppercase flex items-center gap-1">
                              <Flame className="w-3 h-3 text-red-400" />
                              Duelo Directo
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Teams versus */}
                      <div className="grid grid-cols-11 items-center gap-2 my-1">
                        {/* Home Team */}
                        <div className="col-span-4 flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                            style={{ backgroundColor: home.colors.primary }}
                          />
                          <span className={`font-semibold text-xs sm:text-sm truncate ${
                            home.id === 'miramar' ? 'text-sky-300 font-bold' : 'text-slate-100'
                          }`}>
                            {home.shortName}
                          </span>
                        </div>

                        {/* VS / Outcome Indicator */}
                        <div className="col-span-3 text-center">
                          {match.simulatedOutcome ? (
                            <span className={`px-2 py-0.5 rounded text-xs font-mono font-black ${
                              match.simulatedOutcome === 'HOME_WIN'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : match.simulatedOutcome === 'DRAW'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            }`}>
                              {match.simulatedOutcome === 'HOME_WIN' ? 'GANA LOCAL' : match.simulatedOutcome === 'DRAW' ? 'EMPATE' : 'GANA VISITA'}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-bold text-xs">VS</span>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="col-span-4 flex items-center justify-end gap-2 text-right">
                          <span className={`font-semibold text-xs sm:text-sm truncate ${
                            away.id === 'miramar' ? 'text-sky-300 font-bold' : 'text-slate-100'
                          }`}>
                            {away.shortName}
                          </span>
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                            style={{ backgroundColor: away.colors.primary }}
                          />
                        </div>
                      </div>

                      {/* Selector Buttons [1] [X] [2] */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                        <span className="text-[11px] text-slate-400 font-medium">Pronóstico:</span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              onOutcomeChange(
                                match.id,
                                match.simulatedOutcome === 'HOME_WIN' ? null : 'HOME_WIN'
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                              match.simulatedOutcome === 'HOME_WIN'
                                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                            title={`Victoria de ${home.shortName}`}
                          >
                            1 ({home.code})
                          </button>

                          <button
                            onClick={() =>
                              onOutcomeChange(
                                match.id,
                                match.simulatedOutcome === 'DRAW' ? null : 'DRAW'
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                              match.simulatedOutcome === 'DRAW'
                                ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                            title="Empate"
                          >
                            X (Empate)
                          </button>

                          <button
                            onClick={() =>
                              onOutcomeChange(
                                match.id,
                                match.simulatedOutcome === 'AWAY_WIN' ? null : 'AWAY_WIN'
                              )
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                              match.simulatedOutcome === 'AWAY_WIN'
                                ? 'bg-purple-500 text-white font-black shadow-md shadow-purple-500/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                            title={`Victoria de ${away.shortName}`}
                          >
                            2 ({away.code})
                          </button>

                          {match.simulatedOutcome && (
                            <button
                              onClick={() => onOutcomeChange(match.id, null)}
                              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                              title="Limpiar pronóstico"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
};
