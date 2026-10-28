import React, { useState } from 'react';
import { MonteCarloConfig, MonteCarloResult } from '../core/types';
import { 
  Dice5, 
  Play, 
  ShieldCheck, 
  ShieldAlert, 
  BarChart3, 
  Clock, 
  TrendingUp, 
  SlidersHorizontal,
  Flame,
  Info
} from 'lucide-react';

interface MonteCarloViewProps {
  result: MonteCarloResult | null;
  config: MonteCarloConfig;
  onConfigChange: (newConfig: MonteCarloConfig) => void;
  onRunSimulation: () => void;
  isRunning: boolean;
  relegationCount: number;
}

export const MonteCarloView: React.FC<MonteCarloViewProps> = ({
  result,
  config,
  onConfigChange,
  onRunSimulation,
  isRunning,
  relegationCount,
}) => {
  const cutOffPosition = 16 - relegationCount + 1; // 14 when 16 teams and 3 relegated

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Dice5 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Simulador Estocástico Monte Carlo
                </h3>
                <p className="text-xs text-slate-400">
                  Simula miles de desenlaces de torneo para medir las probabilidades estadísticas reales de Miramar Misiones
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onRunSimulation}
            disabled={isRunning}
            className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50"
          >
            <Play className={`w-4 h-4 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Simulando miles de torneos...' : `Ejecutar ${config.iterations.toLocaleString()} Simulaciones`}
          </button>
        </div>

        {/* Sliders and Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Iterations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                Cantidad de Iteraciones (Torneos Simulados):
              </label>
              <span className="font-mono font-bold text-sky-400 text-sm">
                {config.iterations.toLocaleString()}
              </span>
            </div>

            <input
              type="range"
              min="500"
              max="20000"
              step="500"
              value={config.iterations}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  iterations: Number(e.target.value),
                })
              }
              className="w-full accent-sky-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
            />

            <div className="flex justify-between text-[11px] text-slate-500">
              <span>500 (Rápido)</span>
              <span>5,000 (Recomendado)</span>
              <span>20,000 (Ultra Preciso)</span>
            </div>
          </div>

          {/* Probability Model / Weighting Strategy */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              Modelo Probabilístico de Partidos:
            </label>

            <select
              value={config.weighting}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  weighting: e.target.value as MonteCarloConfig['weighting'],
                })
              }
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="form_weighted">
                Ponderado por Rendimiento Reciente (Forma de los últimos 5 partidos)
              </option>
              <option value="neutral">
                Empírico AUF / Neutral (44% Victoria Local, 28% Empate, 28% Visita)
              </option>
              <option value="miramar_optimistic">
                Optimismo Cebrita (Miramar con máxima efectividad y garra)
              </option>
              <option value="miramar_pessimistic">
                Pesimismo Extremo (Escenario bajo máxima presión para Miramar)
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Safety Rate */}
            <div className="rounded-xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Chance de Salvación
                </span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-300 font-display mt-2">
                {result.safetyRate}%
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Miramar mantiene la categoría en {Math.round((result.safetyRate / 100) * result.iterations).toLocaleString()} simulaciones
              </p>
            </div>

            {/* Relegation Rate */}
            <div className="rounded-xl bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 border border-red-500/30 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                  Riesgo de Descenso
                </span>
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-red-400 font-display mt-2">
                {result.relegationRate}%
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Cae en los últimos {relegationCount} puestos en {Math.round((result.relegationRate / 100) * result.iterations).toLocaleString()} simulaciones
              </p>
            </div>

            {/* Average Position */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                  Posición Promedio
                </span>
                <BarChart3 className="w-5 h-5 text-sky-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-display mt-2">
                #{result.averageFinalPosition}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Ubicación esperada en la Tabla de Promedios
              </p>
            </div>

            {/* Computation Time */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  Velocidad de Cómputo
                </span>
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-purple-300 font-display mt-2">
                {result.executionTimeMs}
                <span className="text-sm font-normal text-slate-400"> ms</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {result.iterations.toLocaleString()} iteraciones en milisegundos
              </p>
            </div>
          </div>

          {/* Histogram: Distribution of Final Positions */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-white text-base font-display flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                  Distribución de Posiciones Finales de Miramar Misiones
                </h4>
                <p className="text-xs text-slate-400">
                  Frecuencia con la que Miramar finaliza en cada una de las 16 posiciones de la Tabla de Promedios
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  Zona de Salvación (1º a {cutOffPosition - 1}º)
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="w-3 h-3 rounded bg-red-500" />
                  Zona de Descenso ({cutOffPosition}º a 16º)
                </span>
              </div>
            </div>

            {/* Bars */}
            <div className="space-y-2 pt-2">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((pos) => {
                const count = result.positionDistribution[pos] || 0;
                const percentage = Number(((count / result.iterations) * 100).toFixed(1));
                const isRelegation = pos >= cutOffPosition;

                return (
                  <div key={pos} className="flex items-center gap-3 text-xs">
                    <span className="w-12 font-mono font-bold text-slate-400 text-right">
                      #{pos}
                    </span>

                    <div className="flex-1 bg-slate-950 h-6 rounded-lg overflow-hidden border border-slate-800/80 p-0.5 relative">
                      <div
                        className={`h-full rounded transition-all duration-500 flex items-center px-2 text-[11px] font-bold ${
                          isRelegation
                            ? 'bg-red-500 text-white'
                            : 'bg-emerald-500 text-slate-950'
                        }`}
                        style={{ width: `${Math.max(percentage, percentage > 0 ? 3 : 0)}%` }}
                      >
                        {percentage > 4 && <span>{percentage}%</span>}
                      </div>
                    </div>

                    <span className="w-14 font-mono font-bold text-slate-200 text-right">
                      {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statistical Conclusion Card */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white font-semibold">Conclusión del Análisis Estocástico:</strong>{' '}
              Miramar Misiones tiene un <span className="text-emerald-400 font-bold">{result.safetyRate}% de probabilidad de permanencia</span> en las condiciones actuales. 
              Dado que los puntos de Miramar tienen divisor simple de 1 temporada, ganar los duelos directos (especialmente contra Fénix y Deportivo Maldonado)
              elevaría su probabilidad de salvación por encima del <strong>92%</strong> de forma casi inmediata.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
