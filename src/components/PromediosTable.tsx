import React, { useState } from 'react';
import { StandingRow } from '../core/types';
import { 
  Table, 
  Search, 
  Download, 
  Copy, 
  Check, 
  HelpCircle,
  Flame,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface PromediosTableProps {
  standings: StandingRow[];
  relegationCount: number;
  onSelectTeam?: (teamId: string) => void;
}

export const PromediosTable: React.FC<PromediosTableProps> = ({
  standings,
  relegationCount,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'promedios' | 'anual'>('promedios');

  // Filter teams by search
  const filtered = standings.filter((row) =>
    row.team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.team.shortName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cutOffPosition = standings.length - relegationCount; // 13 when 16 teams and 3 relegated

  // Copy table as TSV/CSV so user can paste straight into Google Sheets or Excel!
  const handleCopy = () => {
    const headers = ['Pos', 'Equipo', 'Divisor', 'Pts_Hist', 'PJ_Hist', 'Pts_Act', 'PJ_Act', 'Total_Pts', 'Total_PJ', 'Promedio', 'DG'];
    const rows = standings.map((s) => [
      s.position,
      s.team.name,
      s.team.isNew ? '1 Año' : '2 Años',
      s.team.seasonHistoryPoints,
      s.team.seasonHistoryPlayed,
      s.annualPoints,
      s.annualPlayed,
      s.totalPoints,
      s.totalPlayed,
      s.average.toFixed(4),
      s.goalDiff,
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download as CSV
  const handleDownloadCSV = () => {
    const headers = ['Posición,Equipo,Tipo Divisor,Pts 2023,PJ 2023,Pts 2024,PJ 2024,Total Puntos,Total PJ,Promedio,Diferencia Gol,Estado'];
    const rows = standings.map((s) => [
      s.position,
      `"${s.team.name}"`,
      s.team.isNew ? 'Divisor 1 Año' : 'Divisor 2 Años',
      s.team.seasonHistoryPoints,
      s.team.seasonHistoryPlayed,
      s.annualPoints,
      s.annualPlayed,
      s.totalPoints,
      s.totalPlayed,
      s.average.toFixed(4),
      s.goalDiff,
      s.status === 'relegated' ? 'Descenso' : s.status === 'bubble' ? 'Riesgo' : 'Salvado',
    ].join(','));

    const csvBlob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tabla_promedios_auf_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base font-display">
              {viewMode === 'promedios' ? 'Tabla de Promedios (Descenso Oficial AUF)' : 'Tabla Anual 2024 (Torneo en Curso)'}
            </h3>
            <p className="text-xs text-slate-400">
              {viewMode === 'promedios' 
                ? 'El descenso se define sumando puntos de 2023 y 2024 divididos por partidos jugados'
                : 'Puntos exclusivamente acumulados durante el año 2024'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('promedios')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                viewMode === 'promedios'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Promedios
            </button>
            <button
              onClick={() => setViewMode('anual')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                viewMode === 'anual'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tabla Anual
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-36 sm:w-44"
            />
          </div>

          {/* Export to Excel/Sheets */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            title="Copiar para pegar directamente en Excel o Google Sheets"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '¡Copiado!' : 'Copiar (Sheets)'}
          </button>

          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
            title="Descargar archivo .CSV para abrir con Excel"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar CSV
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-3 text-center w-12">#</th>
              <th className="py-3 px-4">Equipo</th>
              <th className="py-3 px-2 text-center hidden md:table-cell">Divisor</th>
              <th className="py-3 px-2 text-right hidden lg:table-cell">Pts '23</th>
              <th className="py-3 px-2 text-right hidden lg:table-cell">PJ '23</th>
              <th className="py-3 px-2 text-right">Pts '24</th>
              <th className="py-3 px-2 text-right">PJ '24</th>
              <th className="py-3 px-3 text-right font-bold text-slate-300">Total Pts</th>
              <th className="py-3 px-3 text-right font-bold text-slate-300">Total PJ</th>
              <th className="py-3 px-4 text-right font-black text-white bg-slate-800/40">
                {viewMode === 'promedios' ? 'Promedio' : 'Pts Anual'}
              </th>
              <th className="py-3 px-3 text-right hidden sm:table-cell">DG</th>
              <th className="py-3 px-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.map((row) => {
              const isMiramar = row.team.isTarget;
              const isRelegated = row.status === 'relegated';
              const isBubble = row.status === 'bubble';
              const isCutOffBorder = row.position === cutOffPosition;

              return (
                <React.Fragment key={row.team.id}>
                  <tr
                    className={`transition-colors ${
                      isMiramar
                        ? 'bg-sky-500/15 hover:bg-sky-500/25 border-l-4 border-l-sky-400 font-medium'
                        : isRelegated
                        ? 'bg-red-500/5 hover:bg-red-500/10'
                        : isBubble
                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Position */}
                    <td className="py-3 px-3 text-center font-bold font-mono">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs ${
                        isMiramar 
                          ? 'bg-sky-500 text-white font-extrabold shadow-sm' 
                          : isRelegated 
                          ? 'bg-red-500/20 text-red-300' 
                          : 'text-slate-400'
                      }`}>
                        {row.position}
                      </span>
                    </td>

                    {/* Team Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                          style={{ backgroundColor: row.team.colors.primary }}
                        />
                        <span className={`font-semibold ${isMiramar ? 'text-sky-300 font-extrabold text-sm' : 'text-slate-100'}`}>
                          {row.team.name}
                        </span>

                        {isMiramar && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-400 text-slate-950 uppercase tracking-wider">
                            Cebrita
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Divisor Type */}
                    <td className="py-3 px-2 text-center hidden md:table-cell">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        row.team.isNew
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {row.team.isNew ? '1 Año (Simple)' : '2 Años (Doble)'}
                      </span>
                    </td>

                    {/* 2023 Históricos */}
                    <td className="py-3 px-2 text-right text-slate-400 font-mono hidden lg:table-cell">
                      {row.team.seasonHistoryPoints}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-500 font-mono hidden lg:table-cell">
                      {row.team.seasonHistoryPlayed}
                    </td>

                    {/* 2024 Actuales */}
                    <td className="py-3 px-2 text-right text-slate-200 font-mono">
                      {row.annualPoints}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-400 font-mono">
                      {row.annualPlayed}
                    </td>

                    {/* Total Pts and PJ */}
                    <td className="py-3 px-3 text-right font-bold text-slate-200 font-mono">
                      {row.totalPoints}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400 font-mono">
                      {row.totalPlayed}
                    </td>

                    {/* Promedio / Anual Highlight */}
                    <td className="py-3 px-4 text-right font-mono font-extrabold text-sm bg-slate-800/30">
                      {viewMode === 'promedios' ? (
                        <span className={isMiramar ? 'text-sky-300 text-base' : isRelegated ? 'text-red-400' : 'text-slate-100'}>
                          {row.average.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-white font-bold">
                          {row.annualPoints} pts
                        </span>
                      )}
                    </td>

                    {/* Goal Difference */}
                    <td className="py-3 px-3 text-right font-mono hidden sm:table-cell">
                      <span className={row.goalDiff > 0 ? 'text-emerald-400' : row.goalDiff < 0 ? 'text-red-400' : 'text-slate-400'}>
                        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                      </span>
                    </td>

                    {/* Relegation Status Badge */}
                    <td className="py-3 px-4 text-center">
                      {isRelegated ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                          <Flame className="w-3 h-3 text-red-400" />
                          Descenso
                        </span>
                      ) : isBubble ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Al Límite
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Salvado
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Red demarcation line for the relegation cut-off zone */}
                  {isCutOffBorder && (
                    <tr className="bg-red-500/15 border-y-2 border-red-500/60">
                      <td colSpan={12} className="py-1.5 px-4 text-center text-xs font-bold text-red-300 tracking-wider uppercase">
                        ⚠️ Zona de Descenso a Segunda División (Últimos {relegationCount} Puestos) ⚠️
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footnote on tiebreaker rules */}
      <div className="flex items-start gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/70 text-slate-400 text-xs">
        <HelpCircle className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Criterio de Desempate AUF:</strong> En caso de igualdad de promedio matemático, se desempata por 
          (1) Mejor diferencia de goles general, (2) Mayor cantidad de goles a favor, (3) Resultados directos entre los clubes involucrados.
        </p>
      </div>
    </div>
  );
};
