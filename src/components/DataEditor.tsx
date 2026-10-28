import React, { useState } from 'react';
import { Team } from '../core/types';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Save, 
  Plus, 
  Edit3 
} from 'lucide-react';
import { DEFAULT_TEAMS } from '../core/defaultData';

interface DataEditorProps {
  teams: Team[];
  onSaveTeams: (newTeams: Team[]) => void;
  onResetTeams: () => void;
}

export const DataEditor: React.FC<DataEditorProps> = ({
  teams,
  onSaveTeams,
  onResetTeams,
}) => {
  const [editableTeams, setEditableTeams] = useState<Team[]>(teams);
  const [csvText, setCsvText] = useState('');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFieldChange = (id: string, field: keyof Team, value: any) => {
    setEditableTeams((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return { ...t, [field]: value };
        }
        return t;
      })
    );
  };

  const handleSave = () => {
    onSaveTeams(editableTeams);
    setStatusMessage({ type: 'success', text: '¡Datos actualizados y guardados correctamente en la sesión!' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleImportCSV = () => {
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una de datos.');
      }

      // Expected format: id, name, isNew, pts_hist, pj_hist, pts_act, pj_act, gf, gc
      const parsedTeams: Team[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length < 7) continue;

        const id = parts[0] || `team_${i}`;
        const name = parts[1] || `Equipo ${i}`;
        const isNew = parts[2]?.toLowerCase() === 'true' || parts[2] === '1';
        const seasonHistoryPoints = parseInt(parts[3], 10) || 0;
        const seasonHistoryPlayed = parseInt(parts[4], 10) || 0;
        const seasonCurrentPoints = parseInt(parts[5], 10) || 0;
        const seasonCurrentPlayed = parseInt(parts[6], 10) || 0;
        const gf = parseInt(parts[7], 10) || 30;
        const gc = parseInt(parts[8], 10) || 30;

        const existing = teams.find((t) => t.id === id);

        parsedTeams.push({
          id,
          name,
          shortName: existing?.shortName || name.slice(0, 10),
          code: existing?.code || name.slice(0, 3).toUpperCase(),
          colors: existing?.colors || {
            primary: '#38bdf8',
            secondary: '#ffffff',
            text: '#ffffff',
          },
          isNew,
          seasonHistoryPoints,
          seasonHistoryPlayed,
          seasonCurrentPoints,
          seasonCurrentPlayed,
          gf,
          gc,
          recentForm: existing?.recentForm || ['D', 'D', 'D', 'D', 'D'],
          isTarget: id === 'miramar',
        });
      }

      if (parsedTeams.length === 0) {
        throw new Error('No se pudieron procesar filas válidas en el CSV.');
      }

      setEditableTeams(parsedTeams);
      onSaveTeams(parsedTeams);
      setShowCsvModal(false);
      setStatusMessage({ type: 'success', text: `¡Se importaron ${parsedTeams.length} equipos desde el CSV con éxito!` });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error al procesar el archivo CSV.' });
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'id,name,isNew,seasonHistoryPoints,seasonHistoryPlayed,seasonCurrentPoints,seasonCurrentPlayed,gf,gc';
    const sampleRows = editableTeams.map((t) =>
      [
        t.id,
        `"${t.name}"`,
        t.isNew,
        t.seasonHistoryPoints,
        t.seasonHistoryPlayed,
        t.seasonCurrentPoints,
        t.seasonCurrentPlayed,
        t.gf,
        t.gc,
      ].join(',')
    );

    const blob = new Blob([[headers, ...sampleRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_equipos_promedios.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display">
                Editor de Datos y Compatibilidad Excel / Sheets
              </h3>
              <p className="text-xs text-slate-400">
                Ajusta los puntos, partidos jugados y tipo de divisor de cualquier equipo, o importa tus propias tablas desde Excel
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            Importar CSV / Excel
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Descargar Plantilla CSV
          </button>

          <button
            onClick={onResetTeams}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Originales AUF
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {statusMessage.text}
        </div>
      )}

      {/* Editable Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-3">Equipo</th>
              <th className="py-3 px-3">Divisor</th>
              <th className="py-3 px-3 text-right">Pts 2023</th>
              <th className="py-3 px-3 text-right">PJ 2023</th>
              <th className="py-3 px-3 text-right">Pts 2024</th>
              <th className="py-3 px-3 text-right">PJ 2024</th>
              <th className="py-3 px-3 text-right">Goles Favor</th>
              <th className="py-3 px-3 text-right">Goles Contra</th>
              <th className="py-3 px-3 text-right">Promedio Resultante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {editableTeams.map((team) => {
              const isMiramar = team.isTarget;
              const totalPts = (team.seasonHistoryPoints || 0) + (team.seasonCurrentPoints || 0);
              const totalPJ = (team.seasonHistoryPlayed || 0) + (team.seasonCurrentPlayed || 0);
              const avg = totalPJ > 0 ? (totalPts / totalPJ).toFixed(4) : '0.0000';

              return (
                <tr
                  key={team.id}
                  className={`transition-colors ${
                    isMiramar ? 'bg-sky-500/10 border-l-4 border-l-sky-400' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-100 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: team.colors.primary }}
                    />
                    {team.name}
                    {isMiramar && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-400 text-slate-950">
                        Target
                      </span>
                    )}
                  </td>

                  <td className="py-2.5 px-3">
                    <select
                      value={team.isNew ? 'new' : 'old'}
                      onChange={(e) =>
                        handleFieldChange(team.id, 'isNew', e.target.value === 'new')
                      }
                      className="p-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-200"
                    >
                      <option value="new">1 Año (Nuevo)</option>
                      <option value="old">2 Años (Viejo)</option>
                    </select>
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      disabled={team.isNew}
                      value={team.seasonHistoryPoints}
                      onChange={(e) =>
                        handleFieldChange(team.id, 'seasonHistoryPoints', Number(e.target.value))
                      }
                      className="w-16 p-1 text-right rounded bg-slate-950 border border-slate-800 text-xs text-white disabled:opacity-30"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      disabled={team.isNew}
                      value={team.seasonHistoryPlayed}
                      onChange={(e) =>
                        handleFieldChange(team.id, 'seasonHistoryPlayed', Number(e.target.value))
                      }
                      className="w-16 p-1 text-right rounded bg-slate-950 border border-slate-800 text-xs text-white disabled:opacity-30"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      value={team.seasonCurrentPoints}
                      onChange={(e) =>
                        handleFieldChange(team.id, 'seasonCurrentPoints', Number(e.target.value))
                      }
                      className="w-16 p-1 text-right rounded bg-slate-950 border border-slate-800 text-xs text-white font-bold text-sky-400"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      value={team.seasonCurrentPlayed}
                      onChange={(e) =>
                        handleFieldChange(team.id, 'seasonCurrentPlayed', Number(e.target.value))
                      }
                      className="w-16 p-1 text-right rounded bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      value={team.gf}
                      onChange={(e) =>
                        handleFieldChange(team.id, 'gf', Number(e.target.value))
                      }
                      className="w-16 p-1 text-right rounded bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right">
                    <input
                      type="number"
                      value={team.gc}
                      onChange={(e) =>
                        handleFieldChange(team.id, 'gc', Number(e.target.value))
                      }
                      className="w-16 p-1 text-right rounded bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-slate-100 text-sm">
                    {avg}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Import CSV Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-base font-display flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                Importar Equipos y Puntos desde CSV
              </h4>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Pega aquí tus datos en formato CSV separados por comas (compatible con Google Sheets o Microsoft Excel):
            </p>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="id,name,isNew,seasonHistoryPoints,seasonHistoryPlayed,seasonCurrentPoints,seasonCurrentPlayed,gf,gc&#10;miramar,Miramar Misiones,true,0,0,34,32,33,41&#10;fenix,Fénix,false,37,37,31,32,28,44"
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportCSV}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white"
              >
                Cargar e Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
