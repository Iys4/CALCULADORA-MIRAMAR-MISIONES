import React from 'react';
import { 
  Trophy, 
  RotateCcw, 
  Sparkles, 
  AlertTriangle, 
  Sliders, 
  Table, 
  Dice5, 
  Settings2,
  CalendarCheck
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'standings' | 'fixture' | 'montecarlo' | 'editor';
  setActiveTab: (tab: 'dashboard' | 'standings' | 'fixture' | 'montecarlo' | 'editor') => void;
  relegationCount: number;
  setRelegationCount: (count: number) => void;
  onPreset: (preset: 'miramar_wins_all' | 'miramar_loses_all' | 'random' | 'reset') => void;
  simulatedCount: number;
  totalPendingMatches: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  relegationCount,
  setRelegationCount,
  onPreset,
  simulatedCount,
  totalPendingMatches,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 via-zinc-800 to-black border-2 border-slate-700 p-0.5 flex items-center justify-center shadow-lg overflow-hidden group">
              {/* Cebra pattern stripes background */}
              <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(45deg,#000,#000_4px,#fff_4px,#fff_8px)]" />
              <div className="relative z-10 w-7 h-7 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 font-extrabold text-xs">
                MM
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg sm:text-xl text-white tracking-tight flex items-center gap-2">
                  Calculadora Celeste
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Miramar Misiones
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Simulador matemático de promedios, qué pasa si ("What-If") y Monte Carlo para el fútbol uruguayo
              </p>
            </div>
          </div>

          {/* Controls: League Mode & Scenario Presets */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Divisora / Modo de Liga */}
            <div className="flex items-center rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <span className="px-2 py-1 text-slate-400 flex items-center gap-1 font-medium">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Descensos:
              </span>
              <button
                onClick={() => setRelegationCount(3)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  relegationCount === 3
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Formato habitual Primera División AUF (3 descensos)"
              >
                3 Equipos (1ª AUF)
              </button>
              <button
                onClick={() => setRelegationCount(2)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  relegationCount === 2
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Formato habitual Segunda División (2 descensos)"
              >
                2 Equipos (2ª AUF)
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onPreset('miramar_wins_all')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all shadow-sm"
                title="Simula que Miramar gana todos los partidos restantes"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Milagro Cebrita</span> (Gana todo)
              </button>

              <button
                onClick={() => onPreset('miramar_loses_all')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all shadow-sm"
                title="Peor escenario posible para Miramar"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Peor caso</span>
              </button>

              {simulatedCount > 0 && (
                <button
                  onClick={() => onPreset('reset')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
                  title="Reiniciar partidos simulados"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset ({simulatedCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 mt-4 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Panel Miramar
          </button>

          <button
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'standings'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Table className="w-4 h-4" />
            Tabla de Promedios
          </button>

          <button
            onClick={() => setActiveTab('fixture')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'fixture'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            Simulador What-If
            {simulatedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-sky-950 text-sky-200 text-[10px] border border-sky-400/40">
                {simulatedCount}/{totalPendingMatches}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('montecarlo')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'montecarlo'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Dice5 className="w-4 h-4" />
            Probabilidades Monte Carlo
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'editor'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Editor / Excel CSV
          </button>
        </div>

      </div>
    </header>
  );
};
