/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Team, Match, MatchOutcome } from './core/types';
import { DEFAULT_TEAMS, DEFAULT_MATCHES } from './core/defaultData';
import { computeStandings } from './core/math';
import { exportToExcel, parseExcelFile } from './core/excelHelper';
import { initAuth, googleSignIn } from './core/auth';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { 
  Upload, 
  Download, 
  RotateCcw, 
  Dices, 
  Check, 
  Plus, 
  Minus, 
  FileSpreadsheet,
  ExternalLink 
} from 'lucide-react';

export default function App() {
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);
  const [matches, setMatches] = useState<Match[]>(DEFAULT_MATCHES);
  const [relegationCount, setRelegationCount] = useState<number>(2); // 2 descensos (Segunda AUF)
  const [selectedRound, setSelectedRound] = useState<number | 'all'>(25); // Por defecto S25
  const [viewTableMode, setViewTableMode] = useState<'promedios' | 'anual'>('promedios');
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Google Sheets state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('csmm_active_sheet_id');
    } catch (e) {
      return null;
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setGoogleUser(user),
      () => setGoogleUser(null)
    );
    return () => unsubscribe();
  }, []);

  const handleSetSpreadsheetId = (id: string | null) => {
    setActiveSpreadsheetId(id);
    try {
      if (id) localStorage.setItem('csmm_active_sheet_id', id);
      else localStorage.removeItem('csmm_active_sheet_id');
    } catch (e) {
      // ignore
    }
  };

  // Compute live standings with What-If results and dynamic goal difference
  const standings = useMemo(() => {
    return computeStandings(teams, matches, relegationCount);
  }, [teams, matches, relegationCount]);

  // Annual table standings
  const annualStandings = useMemo(() => {
    const sorted = [...standings].sort((a, b) => {
      if (b.annualPoints !== a.annualPoints) return b.annualPoints - a.annualPoints;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      return a.team.name.localeCompare(b.team.name);
    });
    return sorted.map((s, idx) => ({ ...s, annualRank: idx + 1 }));
  }, [standings]);

  const miramarRow = useMemo(() => {
    return standings.find((s) => s.team.isTarget) || standings.find((s) => /miramar/i.test(s.team.name));
  }, [standings]);

  const teamMap = useMemo(() => {
    return new Map(teams.map((t) => [t.id, t]));
  }, [teams]);

  // Teams in the danger zone affecting relegation (Cerrito, U. Montevideo, Miramar, La Luz, River, Paysandú)
  const dangerTeamIds = useMemo(() => {
    return new Set(['miramar', 'cerrito', 'uruguay_montevideo', 'la_luz', 'river_plate', 'paysandu', 'tacuarembo']);
  }, []);

  const rounds = useMemo(() => {
    return Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);
  }, [matches]);

  const simulatedCountInScope = useMemo(() => {
    return matches.filter((m) => {
      if (selectedRound !== 'all' && m.round !== selectedRound) return false;
      return m.simulatedOutcome !== null && m.simulatedOutcome !== undefined;
    }).length;
  }, [matches, selectedRound]);

  // Handle single match outcome toggle (assumes 1-0 on 1, 0-0 on X, 0-1 on 2)
  const handleToggleOutcome = (matchId: string, outcome: MatchOutcome) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          if (m.simulatedOutcome === outcome) {
            return {
              ...m,
              simulatedOutcome: null,
              homeScore: null,
              awayScore: null,
            };
          }

          let homeScore = 1;
          let awayScore = 0;
          if (outcome === 'DRAW') {
            homeScore = 0;
            awayScore = 0;
          } else if (outcome === 'AWAY_WIN') {
            homeScore = 0;
            awayScore = 1;
          }

          return {
            ...m,
            simulatedOutcome: outcome,
            homeScore,
            awayScore,
          };
        }
        return m;
      })
    );
  };

  // Handle direct score editing (+/- or change number of goals)
  const handleScoreChange = (matchId: string, side: 'home' | 'away', delta: number) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id === matchId) {
          let h = typeof m.homeScore === 'number' ? m.homeScore : 0;
          let a = typeof m.awayScore === 'number' ? m.awayScore : 0;

          if (side === 'home') {
            h = Math.max(0, h + delta);
          } else {
            a = Math.max(0, a + delta);
          }

          let simulatedOutcome: MatchOutcome | null = null;
          if (h > a) simulatedOutcome = 'HOME_WIN';
          else if (h === a) simulatedOutcome = 'DRAW';
          else simulatedOutcome = 'AWAY_WIN';

          return {
            ...m,
            homeScore: h,
            awayScore: a,
            simulatedOutcome,
          };
        }
        return m;
      })
    );
  };

  // RANDOMIZAR RESULTADOS (for current selected round or all)
  const handleRandomizeCurrentScope = () => {
    const scores = [
      [1, 0], [2, 1], [0, 0], [1, 1], [0, 1], [0, 2], [2, 0], [3, 1]
    ];

    setMatches((prev) =>
      prev.map((m) => {
        if (selectedRound !== 'all' && m.round !== selectedRound) {
          return m;
        }

        const picked = scores[Math.floor(Math.random() * scores.length)];
        const h = picked[0];
        const a = picked[1];

        let simulatedOutcome: MatchOutcome = 'DRAW';
        if (h > a) simulatedOutcome = 'HOME_WIN';
        else if (h < a) simulatedOutcome = 'AWAY_WIN';

        return {
          ...m,
          homeScore: h,
          awayScore: a,
          simulatedOutcome,
        };
      })
    );
  };

  // Reset current scope
  const handleResetCurrentScope = () => {
    setMatches((prev) =>
      prev.map((m) => {
        if (selectedRound !== 'all' && m.round !== selectedRound) {
          return m;
        }
        return { ...m, simulatedOutcome: null, homeScore: null, awayScore: null };
      })
    );
  };

  // Excel file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseExcelFile(file);
      if (parsed.teams.length > 0) {
        setTeams(parsed.teams);
      }
      if (parsed.matches.length > 0) {
        setMatches(parsed.matches);
      }
      setUploadNotice(`Excel cargado con éxito (${parsed.teams.length} equipos, ${parsed.matches.length} partidos)`);
      setTimeout(() => setUploadNotice(null), 4000);
    } catch (err: any) {
      alert(`Error al leer el archivo Excel: ${err.message || 'Formato no compatible'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Import from Google Sheets
  const handleImportFromSheets = (newTeams: Team[], newMatches: Match[]) => {
    if (newTeams.length > 0) setTeams(newTeams);
    if (newMatches.length > 0) setMatches(newMatches);
    setUploadNotice(`¡Datos sincronizados desde Google Sheets! (${newTeams.length} equipos, ${newMatches.length} partidos)`);
    setTimeout(() => setUploadNotice(null), 4000);
  };

  // Sort matches so Miramar and Cerrito appear first
  const sortedMatches = useMemo(() => {
    const filtered = matches.filter((m) => selectedRound === 'all' || m.round === selectedRound);

    return [...filtered].sort((a, b) => {
      const aIsMiramar = a.homeTeamId === 'miramar' || a.awayTeamId === 'miramar';
      const bIsMiramar = b.homeTeamId === 'miramar' || b.awayTeamId === 'miramar';
      if (aIsMiramar && !bIsMiramar) return -1;
      if (!aIsMiramar && bIsMiramar) return 1;

      const aIsCerrito = a.homeTeamId === 'cerrito' || a.awayTeamId === 'cerrito';
      const bIsCerrito = b.homeTeamId === 'cerrito' || b.awayTeamId === 'cerrito';
      if (aIsCerrito && !bIsCerrito) return -1;
      if (!aIsCerrito && bIsCerrito) return 1;

      const aIsDanger = dangerTeamIds.has(a.homeTeamId) || dangerTeamIds.has(a.awayTeamId);
      const bIsDanger = dangerTeamIds.has(b.homeTeamId) || dangerTeamIds.has(b.awayTeamId);
      if (aIsDanger && !bIsDanger) return -1;
      if (!aIsDanger && bIsDanger) return 1;

      return a.round - b.round;
    });
  }, [matches, selectedRound, dangerTeamIds]);

  const cutOffPosition = standings.length - relegationCount; // e.g. 14 - 2 = 12

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex flex-col font-sans">
      {/* Hidden File Input for Excel */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        user={googleUser}
        onAuthChange={setGoogleUser}
        teams={teams}
        matches={matches}
        onImportData={handleImportFromSheets}
        activeSpreadsheetId={activeSpreadsheetId}
        setActiveSpreadsheetId={handleSetSpreadsheetId}
      />

      {/* Top Utility Bar (Black on White with Red accents) */}
      <header className="border-b border-zinc-300 bg-white px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Miramar Emblem & Branding */}
          <div className="flex items-center gap-3">
            {/* Escudo Miramar Misiones */}
            <div className="w-10 h-10 flex-shrink-0 relative flex items-center justify-center bg-white rounded-lg border-2 border-black shadow-sm overflow-hidden p-0.5">
              <div className="w-full h-full flex">
                <div className="w-1/5 h-full bg-black" />
                <div className="w-1/5 h-full bg-white" />
                <div className="w-1/5 h-full bg-black" />
                <div className="w-1/5 h-full bg-white" />
                <div className="w-1/5 h-full bg-black" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-red-600 text-white text-[8px] font-black tracking-tighter text-center py-0.2">
                CSMM
              </div>
            </div>

            <div>
              <h1 className="font-black text-base sm:text-lg text-black tracking-tight uppercase leading-none">
                CALCULADORA MIRAMAR MISIONES
              </h1>
              <p className="text-[11px] text-zinc-600 font-medium mt-0.5">
                Simulador oficial de promedios, goles y descenso AUF
              </p>
            </div>

            {miramarRow && (
              <div
                className={`ml-2 hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                  miramarRow.status === 'relegated'
                    ? 'bg-red-100 text-red-900 border-red-500'
                    : 'bg-zinc-100 text-black border-zinc-400'
                }`}
              >
                <span>Miramar: Pos #{miramarRow.position}</span>
                <span className="font-mono">({miramarRow.average.toFixed(3)})</span>
                <span className="font-black">
                  {miramarRow.status === 'relegated' ? '• EN DESCENSO' : '• SALVADO'}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons: Google Sheets, Excel Upload/Download */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* GOOGLE SHEETS BUTTON */}
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black bg-zinc-900 hover:bg-black text-white transition-all shadow-sm cursor-pointer border border-zinc-800"
              title="Conectar y sincronizar con Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-red-500" />
              <span>Google Sheets</span>
              {googleUser ? (
                <span className="w-2 h-2 rounded-full bg-white ml-0.5" title="Conectado" />
              ) : null}
            </button>

            {/* Excel Upload & Download */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-black hover:bg-zinc-800 text-white transition-all shadow-sm cursor-pointer"
              title="Cargar archivo Excel (.xlsx) con la tabla y el fixture"
            >
              <Upload className="w-3.5 h-3.5" />
              Cargar Excel (.xlsx)
            </button>

            <button
              onClick={() => exportToExcel(teams, matches)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold bg-white hover:bg-zinc-100 text-black border border-zinc-400 transition-all cursor-pointer shadow-sm"
              title="Descargar datos en Excel con las hojas Tabla y Fixture"
            >
              <Download className="w-3.5 h-3.5 text-red-600" />
              Descargar Excel
            </button>
          </div>
        </div>

        {uploadNotice && (
          <div className="max-w-7xl mx-auto mt-2 px-3 py-1.5 rounded-lg bg-zinc-100 border border-black text-black text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-black" />
            {uploadNotice}
          </div>
        )}
      </header>

      {/* Main 2-Column Split */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: What-If Fixture Simulator with Goal Inputs and RANDOMIZAR button (5 cols on lg) */}
        <section className="lg:col-span-5 space-y-3">
          
          {/* Header & Date Switcher (S25, S26, Todas) + RANDOMIZAR RESULTADOS button */}
          <div className="bg-white border border-zinc-300 rounded-xl p-3.5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-sm sm:text-base text-black uppercase tracking-tight">
                  Simulador de Partidos
                </h2>
                <p className="text-[11px] text-zinc-500 font-medium">
                  Resultados por defecto: 1-0 • Edita los goles directamente
                </p>
              </div>

              {/* DATE SELECTOR: S25 (default), S26, Todas */}
              <div className="flex bg-zinc-100 rounded-lg p-0.5 border border-zinc-300 text-xs">
                <button
                  onClick={() => setSelectedRound(25)}
                  className={`px-3 py-1 rounded font-black transition-all cursor-pointer ${
                    selectedRound === 25 ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  S25
                </button>
                <button
                  onClick={() => setSelectedRound(26)}
                  className={`px-3 py-1 rounded font-black transition-all cursor-pointer ${
                    selectedRound === 26 ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  S26
                </button>
                <button
                  onClick={() => setSelectedRound('all')}
                  className={`px-3 py-1 rounded font-black transition-all cursor-pointer ${
                    selectedRound === 'all' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  Todas
                </button>
              </div>
            </div>

            {/* SINGLE RANDOMIZAR RESULTADOS BUTTON ABOVE MATCHES */}
            <div className="pt-2 border-t border-zinc-200 flex items-center gap-2">
              <button
                onClick={handleRandomizeCurrentScope}
                className="flex-1 py-2 px-3 rounded-lg font-black text-xs bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <Dices className="w-4 h-4" />
                RANDOMIZAR RESULTADOS {selectedRound !== 'all' ? `(S${selectedRound})` : ''}
              </button>

              {simulatedCountInScope > 0 && (
                <button
                  onClick={handleResetCurrentScope}
                  className="py-2 px-3 rounded-lg font-bold text-xs bg-zinc-200 hover:bg-zinc-300 text-black border border-zinc-300 transition-all cursor-pointer flex items-center gap-1"
                  title="Limpiar resultados"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar ({simulatedCountInScope})
                </button>
              )}
            </div>
          </div>

          {/* Match rows list */}
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
            {sortedMatches.map((match) => {
              const home = teamMap.get(match.homeTeamId);
              const away = teamMap.get(match.awayTeamId);

              const isMiramar =
                match.homeTeamId === 'miramar' || match.awayTeamId === 'miramar';

              const isDangerMatch =
                dangerTeamIds.has(match.homeTeamId) || dangerTeamIds.has(match.awayTeamId);

              const homeName = home ? home.shortName : match.homeTeamId;
              const awayName = away ? away.shortName : match.awayTeamId;

              const homeGoals = typeof match.homeScore === 'number' ? match.homeScore : 0;
              const awayGoals = typeof match.awayScore === 'number' ? match.awayScore : 0;
              const hasScore = match.simulatedOutcome !== null && match.simulatedOutcome !== undefined;

              return (
                <div
                  key={match.id}
                  className={`rounded-xl p-3 border transition-all text-xs space-y-2.5 ${
                    isMiramar
                      ? 'bg-white border-2 border-black shadow-md'
                      : isDangerMatch
                      ? 'bg-white border border-zinc-300 shadow-sm'
                      : 'bg-white border border-zinc-200'
                  }`}
                >
                  {/* Top Header Tag */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-200 text-black">
                        S{match.round}
                      </span>
                      {match.dateLabel && (
                        <span className="text-[10px] text-zinc-500 font-medium">
                          {match.dateLabel}
                        </span>
                      )}
                    </div>

                    {isMiramar ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-black text-white uppercase tracking-wider">
                        ★ Miramar Misiones
                      </span>
                    ) : isDangerMatch ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-300">
                        Partido importante
                      </span>
                    ) : null}
                  </div>

                  {/* Teams and Score Stepper Controller */}
                  <div className="flex items-center justify-between gap-2 py-1">
                    {/* Home Team */}
                    <div className="flex-1 text-left min-w-0">
                      <span className={`block truncate ${
                        match.homeTeamId === 'miramar' ? 'font-black text-black text-sm underline' : 'font-bold text-zinc-900'
                      }`}>
                        {homeName}
                      </span>
                    </div>

                    {/* Interactive Score Stepper Inputs (Changes number of goals) */}
                    <div className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-300 rounded-lg p-1">
                      {/* Home goal buttons */}
                      <button
                        onClick={() => handleScoreChange(match.id, 'home', -1)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-zinc-200 text-black border border-zinc-300 text-xs font-bold cursor-pointer"
                        title="Restar gol"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className={`w-5 text-center font-mono font-black text-sm ${hasScore ? 'text-black' : 'text-zinc-400'}`}>
                        {hasScore ? homeGoals : '-'}
                      </span>

                      <button
                        onClick={() => handleScoreChange(match.id, 'home', 1)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-zinc-200 text-black border border-zinc-300 text-xs font-bold cursor-pointer"
                        title="Sumar gol"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      <span className="text-zinc-400 font-black text-xs px-0.5">:</span>

                      {/* Away goal buttons */}
                      <button
                        onClick={() => handleScoreChange(match.id, 'away', -1)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-zinc-200 text-black border border-zinc-300 text-xs font-bold cursor-pointer"
                        title="Restar gol"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className={`w-5 text-center font-mono font-black text-sm ${hasScore ? 'text-black' : 'text-zinc-400'}`}>
                        {hasScore ? awayGoals : '-'}
                      </span>

                      <button
                        onClick={() => handleScoreChange(match.id, 'away', 1)}
                        className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-zinc-200 text-black border border-zinc-300 text-xs font-bold cursor-pointer"
                        title="Sumar gol"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 text-right min-w-0">
                      <span className={`block truncate ${
                        match.awayTeamId === 'miramar' ? 'font-black text-black text-sm underline' : 'font-bold text-zinc-900'
                      }`}>
                        {awayName}
                      </span>
                    </div>
                  </div>

                  {/* 1 - X - 2 Quick Outcome Buttons (Defaults to 1-0, 0-0, 0-1) */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-zinc-100">
                    <button
                      onClick={() => handleToggleOutcome(match.id, 'HOME_WIN')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        match.simulatedOutcome === 'HOME_WIN'
                          ? 'bg-black text-white font-black shadow-sm'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300'
                      }`}
                    >
                      <span className="font-black">1</span>
                      <span className="text-[10px] truncate">Gana Local (1-0)</span>
                    </button>

                    <button
                      onClick={() => handleToggleOutcome(match.id, 'DRAW')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        match.simulatedOutcome === 'DRAW'
                          ? 'bg-black text-white font-black shadow-sm'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300'
                      }`}
                    >
                      <span className="font-black">X</span>
                      <span className="text-[10px]">Empate (0-0)</span>
                    </button>

                    <button
                      onClick={() => handleToggleOutcome(match.id, 'AWAY_WIN')}
                      className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        match.simulatedOutcome === 'AWAY_WIN'
                          ? 'bg-black text-white font-black shadow-sm'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300'
                      }`}
                    >
                      <span className="font-black">2</span>
                      <span className="text-[10px] truncate">Gana Visita (0-1)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT: Standings Table with Alternating Subtle Zebra Colors & High Legibility */}
        <section className="lg:col-span-7 space-y-3">
          
          {/* Table Header with View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-300">
            <div>
              <h2 className="font-black text-sm sm:text-base text-black uppercase tracking-wide">
                {viewTableMode === 'promedios' 
                  ? 'Tabla de Promedios (Descenso)' 
                  : 'Tabla Anual 2026 (Ascensos y Playoffs)'}
              </h2>
              <span className="text-[11px] text-zinc-600 font-medium">
                {viewTableMode === 'promedios' 
                  ? '2 Descensos directos (Puestos 13 y 14) • Miramar en puesto 12'
                  : '2 Ascensos directos (1º y 2º) • 4 Playoffs (3º al 6º)'}
              </span>
            </div>

            {/* Switch between Promedios and Anual */}
            <div className="flex bg-white rounded-lg p-0.5 border border-zinc-300 text-xs shadow-sm">
              <button
                onClick={() => setViewTableMode('promedios')}
                className={`px-3 py-1 rounded font-black transition-all cursor-pointer ${
                  viewTableMode === 'promedios' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                Tabla de Descenso
              </button>
              <button
                onClick={() => setViewTableMode('anual')}
                className={`px-3 py-1 rounded font-black transition-all cursor-pointer ${
                  viewTableMode === 'anual' ? 'bg-black text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                Tabla de Ascenso
              </button>
            </div>
          </div>

          {/* Table Container with High-Contrast Alternating Rows */}
          <div className="overflow-x-auto rounded-xl border border-zinc-300 bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-black bg-black text-white text-[10px] sm:text-[11px] uppercase font-black">
                  <th className="py-2.5 px-2 text-center w-8">#</th>
                  <th className="py-2.5 px-3">Equipo</th>
                  <th className="py-2.5 px-2 text-center hidden sm:table-cell">Divisor</th>
                  <th className="py-2.5 px-2 text-right">Pts '25</th>
                  <th className="py-2.5 px-2 text-right font-black">Pts '26</th>
                  <th className="py-2.5 px-2 text-right font-medium">PJ</th>
                  <th className="py-2.5 px-3 text-right font-black bg-zinc-900 text-white">
                    {viewTableMode === 'promedios' ? 'Promedio' : 'Pts Total'}
                  </th>
                  <th className="py-2.5 px-2 text-right font-bold">DG</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(viewTableMode === 'promedios' ? standings : annualStandings).map((row, idx) => {
                  const position = idx + 1;
                  const isMiramar = row.team.isTarget || /miramar/i.test(row.team.name);
                  const isEvenRow = idx % 2 === 1;

                  // In Promedios mode: ONLY show Descenso
                  const isRelegated = viewTableMode === 'promedios' && position > cutOffPosition;

                  // In Anual mode: ONLY show Ascenso & Playoff
                  const isAscensoDirecto = viewTableMode === 'anual' && position <= 2;
                  const isPlayoff = viewTableMode === 'anual' && position >= 3 && position <= 6;

                  return (
                    <React.Fragment key={row.team.id}>
                      <tr
                        className={`transition-colors ${
                          isMiramar
                            ? 'bg-zinc-900 text-white font-bold border-l-4 border-l-black'
                            : isRelegated
                            ? 'bg-red-50 text-red-950 font-semibold'
                            : isAscensoDirecto
                            ? 'bg-zinc-100 font-bold'
                            : isEvenRow
                            ? 'bg-zinc-50'
                            : 'bg-white'
                        } hover:bg-zinc-200/70`}
                      >
                        {/* Position */}
                        <td className="py-2 px-2 text-center font-mono font-bold">
                          <span className={`inline-block w-5 text-center ${
                            isMiramar 
                              ? 'text-white font-black' 
                              : isRelegated 
                              ? 'text-red-600 font-black' 
                              : 'text-zinc-700'
                          }`}>
                            {position}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="py-2 px-3 font-bold truncate">
                          <div className="flex items-center gap-1.5">
                            <span className={isMiramar ? 'text-white font-black text-sm underline' : isRelegated ? 'text-red-900' : 'text-zinc-900'}>
                              {row.team.name}
                            </span>
                            {isMiramar && (
                              <span className="px-1.5 py-0.2 rounded bg-white text-black text-[9px] font-black uppercase">
                                MIR
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Divisor */}
                        <td className="py-2 px-2 text-center text-[10px] hidden sm:table-cell">
                          {row.team.isNew ? (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-200 text-black font-semibold border border-zinc-300">
                              30 PJ (1 Año)
                            </span>
                          ) : (
                            <span className={isMiramar ? 'text-zinc-300' : 'text-zinc-500'}>62 PJ (2 Años)</span>
                          )}
                        </td>

                        {/* Pts 2025 */}
                        <td className={`py-2 px-2 text-right font-mono ${isMiramar ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {row.team.seasonHistoryPoints}
                        </td>

                        {/* Pts 2026 (Live updated with simulated points) */}
                        <td className={`py-2 px-2 text-right font-mono font-black ${isMiramar ? 'text-white' : 'text-black'}`}>
                          {row.annualPoints}
                        </td>

                        {/* Total PJ */}
                        <td className={`py-2 px-2 text-right font-mono ${isMiramar ? 'text-zinc-300' : 'text-zinc-600'}`}>
                          {row.totalPlayed}
                        </td>

                        {/* Average or Annual Pts */}
                        <td className={`py-2 px-3 text-right font-mono font-black text-sm ${
                          isMiramar ? 'bg-black text-white text-base' : isRelegated ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-black'
                        }`}>
                          {viewTableMode === 'promedios' ? (
                            <span>{row.average.toFixed(3)}</span>
                          ) : (
                            <span>{row.annualPoints} pts</span>
                          )}
                        </td>

                        {/* Goal Diff (Dynamic from 1-0 or custom scores) */}
                        <td className={`py-2 px-2 text-right font-mono font-bold ${
                          row.goalDiff > 0 ? 'text-black' : row.goalDiff < 0 ? 'text-red-600' : isMiramar ? 'text-zinc-300' : 'text-zinc-600'
                        }`}>
                          {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2 px-3 text-center">
                          {viewTableMode === 'promedios' ? (
                            isRelegated ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white">
                                Descenso
                              </span>
                            ) : isMiramar ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-black">
                                Permanencia
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-zinc-500 text-[10px] font-medium">
                                Salvado
                              </span>
                            )
                          ) : (
                            isAscensoDirecto ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-black text-white">
                                Ascenso Directo
                              </span>
                            ) : isPlayoff ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 text-black border border-zinc-400">
                                Playoff
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-zinc-500 text-[10px]">
                                Fase Regular
                              </span>
                            )
                          )}
                        </td>
                      </tr>

                      {/* Cutoff lines */}
                      {viewTableMode === 'anual' && position === 2 && (
                        <tr className="bg-zinc-100 border-b-2 border-black">
                          <td colSpan={9} className="py-1 px-3 text-center text-[10px] font-black text-black uppercase tracking-wider">
                            ▲ LÍNEA DE ASCENSO DIRECTO A PRIMERA DIVISIÓN ▲
                          </td>
                        </tr>
                      )}

                      {viewTableMode === 'anual' && position === 6 && (
                        <tr className="bg-zinc-100 border-b border-zinc-400">
                          <td colSpan={9} className="py-1 px-3 text-center text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                            ▲ LÍNEA DE CLASIFICACIÓN A PLAYOFFS DE ASCENSO ▲
                          </td>
                        </tr>
                      )}

                      {viewTableMode === 'promedios' && position === cutOffPosition && (
                        <tr className="bg-red-600 text-white font-black">
                          <td colSpan={9} className="py-1.5 px-3 text-center text-[11px] uppercase tracking-wider">
                            ▼ ZONA DE DESCENSO DIRECTO (PUESTOS 13 Y 14) ▼
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
