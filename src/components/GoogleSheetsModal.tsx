import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  logout, 
  getAccessToken 
} from '../core/auth';
import { 
  listUserSpreadsheets, 
  createCalculadoraSpreadsheet, 
  readSpreadsheetData, 
  updateSpreadsheetData, 
  DriveSpreadsheetItem 
} from '../core/googleSheets';
import { Team, Match } from '../core/types';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Plus, 
  RefreshCw, 
  Save, 
  Check, 
  AlertCircle, 
  LogOut,
  FolderOpen
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onAuthChange: (user: User | null) => void;
  teams: Team[];
  matches: Match[];
  onImportData: (teams: Team[], matches: Match[]) => void;
  activeSpreadsheetId: string | null;
  setActiveSpreadsheetId: (id: string | null) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  user,
  onAuthChange,
  teams,
  matches,
  onImportData,
  activeSpreadsheetId,
  setActiveSpreadsheetId,
}) => {
  const [loading, setLoading] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<DriveSpreadsheetItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(activeSpreadsheetId || '');
  const [customInput, setCustomInput] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Load drive sheets when modal opens and user is logged in
  useEffect(() => {
    if (isOpen && user) {
      loadDriveFiles();
    }
  }, [isOpen, user]);

  const loadDriveFiles = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) return;
      const files = await listUserSpreadsheets(token);
      setSpreadsheets(files);
      if (!selectedId && files.length > 0) {
        setSelectedId(files[0].id);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      const res = await googleSignIn();
      if (res) {
        onAuthChange(res.user);
        setStatusMsg({ type: 'success', text: `Conectado como ${res.user.displayName || res.user.email}` });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al iniciar sesión con Google.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onAuthChange(null);
    setSpreadsheets([]);
    setSelectedId('');
    setActiveSpreadsheetId(null);
  };

  const handleCreateNewSheet = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) throw new Error('No hay sesión de Google activa');

      const res = await createCalculadoraSpreadsheet(
        token,
        'Calculadora Miramar Misiones - Descenso AUF',
        teams,
        matches
      );

      setActiveSpreadsheetId(res.id);
      setSelectedId(res.id);
      setStatusMsg({ type: 'success', text: '¡Nueva planilla creada con éxito en tu Google Drive!' });
      await loadDriveFiles();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al crear la planilla' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromSheet = async () => {
    const targetId = customInput.trim() || selectedId;
    if (!targetId) {
      setStatusMsg({ type: 'error', text: 'Selecciona una planilla o ingresa su ID / URL' });
      return;
    }

    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) throw new Error('No hay sesión activa');

      const cleanId = extractSpreadsheetId(targetId);
      const data = await readSpreadsheetData(token, cleanId);

      onImportData(data.teams, data.matches);
      setActiveSpreadsheetId(cleanId);
      setStatusMsg({
        type: 'success',
        text: `¡Datos sincronizados! (${data.teams.length} equipos, ${data.matches.length} partidos)`,
      });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al importar datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToSheet = async () => {
    const targetId = customInput.trim() || selectedId || activeSpreadsheetId;
    if (!targetId) {
      setStatusMsg({ type: 'error', text: 'Selecciona una planilla para guardar' });
      return;
    }

    // Explicit confirmation for mutating user's data as required by skill!
    if (!confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }

    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) throw new Error('No hay sesión activa');

      const cleanId = extractSpreadsheetId(targetId);
      await updateSpreadsheetData(token, cleanId, teams, matches);

      setActiveSpreadsheetId(cleanId);
      setConfirmOverwrite(false);
      setStatusMsg({ type: 'success', text: '¡Planilla de Google Sheets actualizada con los datos actuales!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al actualizar la planilla' });
    } finally {
      setLoading(false);
    }
  };

  const extractSpreadsheetId = (input: string): string => {
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  };

  if (!isOpen) return null;

  const currentSheetId = selectedId || activeSpreadsheetId;
  const currentSheetUrl = currentSheetId ? `https://docs.google.com/spreadsheets/d/${currentSheetId}` : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black rounded-2xl max-w-lg w-full p-6 shadow-2xl text-black space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-black">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base uppercase text-black leading-tight">
                Conectar con Google Sheets
              </h3>
              <p className="text-xs text-zinc-600 font-medium">
                Sincroniza la tabla de promedios y el fixture en tu cuenta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold"
          >
            ✕
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 border ${
              statusMsg.type === 'success'
                ? 'bg-zinc-100 border-black text-black'
                : 'bg-red-50 border-red-500 text-red-900'
            }`}
          >
            {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-black" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Not Logged In */}
        {!user ? (
          <div className="space-y-4 text-center py-4">
            <p className="text-xs text-zinc-600 leading-relaxed max-w-sm mx-auto">
              Inicia sesión con tu cuenta de Google para leer y guardar tus planillas directamente en tu Google Drive.
            </p>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-black text-xs bg-black text-white hover:bg-zinc-800 transition-all inline-flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Conectando...' : 'Iniciar sesión con Google'}</span>
            </button>
          </div>
        ) : (
          /* User Logged In */
          <div className="space-y-4">
            {/* User Account Info */}
            <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-3 rounded-xl text-xs">
              <div className="flex items-center gap-2.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-zinc-300" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold">
                    {user.email?.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="font-black text-black block leading-tight">{user.displayName || 'Usuario de Google'}</span>
                  <span className="text-zinc-500 text-[11px] font-mono">{user.email}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-600 hover:text-black transition-all"
                title="Cerrar sesión de Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action: Create New Sheet in Google Drive */}
            <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs uppercase text-zinc-800">
                  Opción 1: Crear Planilla Nueva
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">Recomendado</span>
              </div>
              <p className="text-[11px] text-zinc-600">
                Crea una nueva hoja en tu Google Drive con los datos actuales y el fixture completo listo.
              </p>
              <button
                onClick={handleCreateNewSheet}
                disabled={loading}
                className="w-full py-2 px-3 rounded-lg font-black text-xs bg-black text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-white" />
                {loading ? 'Creando en Google Drive...' : 'Crear nueva planilla en mi Google Drive'}
              </button>
            </div>

            {/* Select Existing Sheet */}
            <div className="border border-zinc-200 rounded-xl p-3 bg-white space-y-3">
              <span className="font-black text-xs uppercase text-zinc-800 block">
                Opción 2: Usar Planilla Existente de Drive
              </span>

              {spreadsheets.length > 0 ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] text-zinc-500 font-medium block">
                    Selecciona una planilla de tu cuenta:
                  </label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full p-2 rounded-lg border border-zinc-300 text-xs font-semibold text-black bg-zinc-50 focus:outline-none focus:border-black"
                  >
                    {spreadsheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({new Date(s.modifiedTime).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  {loading ? 'Cargando planillas...' : 'No se encontraron planillas recientes en tu Google Drive.'}
                </p>
              )}

              {/* Or Paste URL */}
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-500 font-medium block">
                  O pega el enlace / ID de tu Google Sheet:
                </label>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="w-full p-2 rounded-lg border border-zinc-300 text-xs text-black placeholder-zinc-400 bg-zinc-50 focus:outline-none focus:border-black"
                />
              </div>

              {/* Action Buttons for selected sheet */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-200">
                <button
                  onClick={handleSyncFromSheet}
                  disabled={loading}
                  className="flex-1 py-2 px-3 rounded-lg font-black text-xs bg-zinc-200 hover:bg-zinc-300 text-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Importar tabla y fixture desde Google Sheets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Cargar desde Sheets
                </button>

                <button
                  onClick={handleSaveToSheet}
                  disabled={loading}
                  className={`flex-1 py-2 px-3 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    confirmOverwrite
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-black text-white hover:bg-zinc-800'
                  }`}
                  title="Sobrescribir datos en Google Sheets"
                >
                  <Save className="w-3.5 h-3.5" />
                  {confirmOverwrite ? '¿Confirmar sobrescribir?' : 'Guardar en Sheets'}
                </button>
              </div>

              {confirmOverwrite && (
                <p className="text-[11px] text-red-600 font-bold text-center">
                  ⚠️ Esta acción sobrescribirá las hojas "Tabla" y "Fixture" en tu Google Sheet con los datos actuales. Haz clic nuevamente en "¿Confirmar sobrescribir?" para proceder.
                </p>
              )}

              {currentSheetUrl && (
                <div className="pt-1 text-center">
                  <a
                    href={currentSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-800 hover:text-black underline"
                  >
                    Abrir planilla en Google Sheets
                    <ExternalLink className="w-3 h-3 text-red-600" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-200 pt-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
