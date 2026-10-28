import React from 'react';
import { 
  StandingRow, 
  MagicPointsAnalysis, 
  MonteCarloResult,
  Match 
} from '../core/types';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Flame, 
  TrendingUp, 
  Calculator, 
  ArrowRight,
  Zap,
  Target,
  Percent,
  Info,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MiramarHeroProps {
  miramarRow: StandingRow | undefined;
  magicAnalysis: MagicPointsAnalysis;
  monteCarloResult: MonteCarloResult | null;
  relegationCount: number;
  remainingMatches: Match[];
  onOpenFixture: () => void;
  onRunMonteCarlo: () => void;
}

export const MiramarHero: React.FC<MiramarHeroProps> = ({
  miramarRow,
  magicAnalysis,
  monteCarloResult,
  relegationCount,
  remainingMatches,
  onOpenFixture,
  onRunMonteCarlo,
}) => {
  if (!miramarRow) return null;

  const isRelegated = miramarRow.status === 'relegated';
  const isBubble = miramarRow.status === 'bubble';
  const isSafe = miramarRow.status === 'safe';

  // Trigger celebratory confetti if mathematically saved!
  React.useEffect(() => {
    if (magicAnalysis.isMathematicallySaved) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#ffffff', '#18181b', '#facc15'],
        });
      } catch (e) {
        // ignore
      }
    }
  }, [magicAnalysis.isMathematicallySaved]);

  const relegationRate = monteCarloResult ? monteCarloResult.relegationRate : 38.5;
  const safetyRate = monteCarloResult ? monteCarloResult.safetyRate : 61.5;

  // Next opponent for Miramar
  const nextMatch = remainingMatches.find(
    (m) =>
      !m.played &&
      (m.homeTeamId === miramarRow.team.id || m.awayTeamId === miramarRow.team.id)
  );

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        {/* Zebra stripes decorative watermark */}
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-5 pointer-events-none bg-[repeating-linear-gradient(-45deg,#fff,#fff_12px,#000_12px,#000_24px)]" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          
          {/* Left info: Club details & Status */}
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white border border-white/20 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                Club Sportivo Miramar Misiones
              </span>

              {magicAnalysis.isMathematicallySaved ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ¡Matemáticamente Salvado!
                </span>
              ) : magicAnalysis.isMathematicallyRelegated ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1.5 shadow-md">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Descenso Matemático
                </span>
              ) : isRelegated ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1.5 shadow-md animate-pulse">
                  <Flame className="w-3.5 h-3.5" />
                  En Zona Roja (Puesto #{miramarRow.position})
                </span>
              ) : isBubble ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-md">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Al Límite del Descenso (Puesto #{miramarRow.position})
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5 shadow-md">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Fuera del Descenso (Puesto #{miramarRow.position})
                </span>
              )}

              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                Divisor Simple: 1 Temporada ({miramarRow.totalPlayed} PJ)
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
                Misión Permanencia en la AUF
              </h2>
              <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
                {isRelegated ? (
                  <>
                    Miramar está actualmente en zona de descenso a{' '}
                    <strong className="text-red-400 font-semibold">{miramarRow.pointsToSafety.toFixed(4)} pts de promedio</strong>{' '}
                    de la salvación. Sin embargo, al ser <em className="text-sky-300 font-medium">equipo nuevo</em>, cada punto que sumes vale el doble.
                  </>
                ) : (
                  <>
                    Miramar se encuentra fuera de zona de descenso con una ventaja de{' '}
                    <strong className="text-emerald-400 font-semibold">+{miramarRow.pointsAboveDrop.toFixed(4)} pts de promedio</strong>{' '}
                    sobre el corte del descenso.
                  </>
                )}
              </p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Promedio Actual</span>
                <span className="text-xl sm:text-2xl font-black text-sky-400 tracking-tight font-mono">
                  {miramarRow.average.toFixed(4)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {miramarRow.totalPoints} pts / {miramarRow.totalPlayed} PJ
                </span>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Puntos Mágicos</span>
                <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                  {magicAnalysis.magicPointsToGuaranteeSafety}
                  <span className="text-xs font-normal text-slate-400">/{magicAnalysis.remainingMatches * 3}</span>
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Para no depender de nadie
                </span>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Partidos Restantes</span>
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {magicAnalysis.remainingMatches}
                  <span className="text-xs font-normal text-slate-400"> fechas</span>
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {magicAnalysis.remainingMatches * 3} pts en disputa
                </span>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Prob. Descenso</span>
                <span className={`text-xl sm:text-2xl font-black tracking-tight ${
                  relegationRate > 50 ? 'text-red-400' : relegationRate > 25 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {relegationRate}%
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {monteCarloResult ? `${monteCarloResult.iterations} sims` : 'Estimación Monte Carlo'}
                </span>
              </div>
            </div>

          </div>

          {/* Right: Chance Gauge / Survival Meter */}
          <div className="flex-shrink-0 w-full lg:w-72 bg-slate-950/80 rounded-2xl p-5 border border-slate-800 flex flex-col items-center text-center shadow-inner">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-sky-400" />
              Chances de Permanencia
            </span>

            {/* Visual Gauge Bar */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-slate-800"
                />
                {/* Relegation red portion */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`${(relegationRate * 2.51).toFixed(1)} 251.2`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  fill="transparent"
                  className="text-red-500 transition-all duration-700"
                />
                {/* Safety green portion */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={`${(safetyRate * 2.51).toFixed(1)} 251.2`}
                  strokeDashoffset={`-${(relegationRate * 2.51).toFixed(1)}`}
                  strokeLinecap="round"
                  fill="transparent"
                  className="text-emerald-400 transition-all duration-700"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-white font-display">
                  {safetyRate}%
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                  Salvarse
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between w-full mt-3 px-2 text-xs">
              <div className="flex items-center gap-1.5 text-red-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Descenso: {relegationRate}%
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Salvación: {safetyRate}%
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-center gap-2">
              <button
                onClick={onRunMonteCarlo}
                className="w-full py-2 px-3 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                Recalcular Monte Carlo
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Explainer Banner: The Secret of the Divisor ("El Factor Divisor") */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex-shrink-0 mt-0.5">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              ¿Por qué Miramar tiene ventaja matemática siendo "Equipo Nuevo"?
              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Divisor de 37 PJ vs 74 PJ
              </span>
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Equipos tradicionales como <strong>Fénix</strong> o <strong>Deportivo Maldonado</strong> arrastran puntos de 2 temporadas y dividen entre ~74 partidos.
              Miramar divide solamente entre sus partidos del año actual (~37 PJ). Esto significa que <strong>cada victoria (+3 pts) le suma +0.081 al promedio de Miramar</strong>,
              mientras que a Fénix le suma solo <strong>+0.040</strong>. ¡Un triunfo cebrita pesa el doble!
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFixture}
          className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all shadow-sm"
        >
          Probar resultados en el Fixture
          <ArrowRight className="w-4 h-4 text-sky-400" />
        </button>
      </div>

      {/* Direct Rivals Lower Zone Comparison */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
            <Target className="w-4 h-4 text-red-400" />
            Rivales Directos en la Pelea del Descenso
          </h3>
          <span className="text-xs text-slate-400">
            Descenderán {relegationCount} equipos al cierre del año
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {magicAnalysis.rivalsInThreat.map(({ team, maxPossibleAverage, currentAverage }) => {
            const isBehindMiramar = currentAverage < miramarRow.average;
            const diff = Number((miramarRow.average - currentAverage).toFixed(4));

            return (
              <div
                key={team.id}
                className="rounded-xl bg-slate-900 border border-slate-800 p-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: team.colors.primary }}
                      />
                      {team.name}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      team.isNew ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {team.isNew ? 'Divisor 1 Año' : 'Divisor 2 Años'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-800/80 my-2">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Promedio Actual</span>
                      <span className="font-mono font-bold text-slate-100 text-sm">
                        {currentAverage.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Techo Máximo</span>
                      <span className="font-mono font-bold text-slate-300 text-sm">
                        {maxPossibleAverage.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400">Distancia con Miramar:</span>
                  <span className={`font-mono font-bold ${
                    isBehindMiramar ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {isBehindMiramar ? `+${diff}` : `${diff}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
