import * as XLSX from 'xlsx';
import { Team, Match } from './types';
import { calculateAverage } from './math';

export interface ParsedExcelData {
  teams: Team[];
  matches: Match[];
}

/**
 * Downloads a complete .xlsx file with 2 sheets matching the exact user layout:
 * Sheet 1: "Tabla" (PJ 2025+2026, Pts 2025, Pts 2026, DG, Goles Favor/Contra, Promedio)
 * Sheet 2: "Fixture" (Fecha, Local, Goles Local, Goles Visita, Visitante, Resultado)
 */
export function exportToExcel(teams: Team[], matches: Match[], filename = 'calculadora_miramar_misiones.xlsx') {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tabla
  const teamsData = teams.map((t) => {
    const totalPts = t.seasonHistoryPoints + t.seasonCurrentPoints;
    const totalPJ = t.seasonHistoryPlayed + t.seasonCurrentPlayed;
    const avg = calculateAverage(totalPts, totalPJ);
    const dg = t.gf - t.gc;

    return {
      Equipo: t.name,
      Codigo: t.code,
      Es_Nuevo_1_Ano: t.isNew ? 'SI' : 'NO',
      'PJ 2025 + 2026': totalPJ,
      'Pts 2025': t.seasonHistoryPoints,
      'Pts 2026': t.seasonCurrentPoints,
      'GF': t.gf,
      'GC': t.gc,
      'DG': dg,
      Promedio: avg,
    };
  });
  const wsTeams = XLSX.utils.json_to_sheet(teamsData);
  XLSX.utils.book_append_sheet(wb, wsTeams, 'Tabla');

  // Sheet 2: Fixture
  const matchesData = matches.map((m) => {
    const home = teams.find((t) => t.id === m.homeTeamId);
    const away = teams.find((t) => t.id === m.awayTeamId);

    let hScore: number | string = '';
    let aScore: number | string = '';

    if (typeof m.homeScore === 'number' && typeof m.awayScore === 'number') {
      hScore = m.homeScore;
      aScore = m.awayScore;
    } else if (m.simulatedOutcome === 'HOME_WIN') {
      hScore = 1;
      aScore = 0;
    } else if (m.simulatedOutcome === 'DRAW') {
      hScore = 0;
      aScore = 0;
    } else if (m.simulatedOutcome === 'AWAY_WIN') {
      hScore = 0;
      aScore = 1;
    }

    return {
      Fecha: m.round,
      Local: home ? home.name : m.homeTeamId,
      Goles_Local: hScore,
      Goles_Visita: aScore,
      Visitante: away ? away.name : m.awayTeamId,
      Resultado: m.simulatedOutcome === 'HOME_WIN' ? '1' : m.simulatedOutcome === 'DRAW' ? 'X' : m.simulatedOutcome === 'AWAY_WIN' ? '2' : '',
    };
  });
  const wsMatches = XLSX.utils.json_to_sheet(matchesData);
  XLSX.utils.book_append_sheet(wb, wsMatches, 'Fixture');

  XLSX.writeFile(wb, filename);
}

/**
 * Parses an uploaded .xlsx or .csv file and extracts Teams and Matches
 */
export function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetNames = workbook.SheetNames;
        if (sheetNames.length === 0) {
          throw new Error('El archivo no contiene hojas válidas.');
        }

        let parsedTeams: Team[] = [];
        let parsedMatches: Match[] = [];

        // Sheet 1: Tabla
        const tableSheetName =
          sheetNames.find((s) => /tabla|equipo|standings|promedio/i.test(s)) || sheetNames[0];
        const wsTable = workbook.Sheets[tableSheetName];
        const tableJson: any[] = XLSX.utils.sheet_to_json(wsTable);

        if (tableJson.length > 0) {
          parsedTeams = tableJson.map((row, idx) => {
            const name = String(row.Equipo || row.Club || row.Nombre || row.Name || `Equipo ${idx + 1}`).trim();
            const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const code = String(row.Codigo || row.Code || name.slice(0, 3)).toUpperCase();

            const pts2025 = Number(row['Pts 2025'] ?? row.Pts_2025 ?? row.Pts_Anterior ?? row.PtsAnterior ?? 0);
            const pts2026 = Number(row['Pts 2026'] ?? row.Pts_2026 ?? row.Pts_Actual ?? row.Puntos ?? row.Pts ?? 0);
            const pjTotal = Number(row['PJ 2025 + 2026'] ?? row.PJ_Total ?? row.PJ ?? 0);

            const isNewRaw = String(row.Es_Nuevo_1_Ano || row.EsNuevo || row.Nuevo || '').toLowerCase();
            const isNew =
              isNewRaw === 'si' ||
              isNewRaw === 'sí' ||
              isNewRaw === 'true' ||
              isNewRaw === '1' ||
              (pts2025 === 0 && pjTotal <= 32);

            const seasonHistoryPlayed = isNew ? 0 : Math.max(0, pjTotal - 30 || 32);
            const seasonCurrentPlayed = 30;

            const goalDiff = Number(row.DG ?? row.Dif_Gol ?? row.DifGol ?? row.Diferencia ?? 0);
            const gf = Number(row.GF ?? row.Goles_Favor ?? (goalDiff > 0 ? 30 + goalDiff : 30));
            const gc = Number(row.GC ?? row.Goles_Contra ?? (goalDiff < 0 ? 30 - goalDiff : 30));

            const isTarget = /miramar/i.test(name) || /mir/i.test(code);

            return {
              id,
              name,
              shortName: name.length > 16 ? name.slice(0, 16) : name,
              code,
              colors: {
                primary: isTarget ? '#000000' : '#27272a',
                secondary: '#ffffff',
                text: '#000000',
              },
              isNew,
              seasonHistoryPoints: pts2025,
              seasonHistoryPlayed,
              seasonCurrentPoints: pts2026,
              seasonCurrentPlayed,
              gf,
              gc,
              recentForm: ['D', 'D', 'D', 'D', 'D'],
              isTarget,
            };
          });
        }

        // Sheet 2: Fixture
        const fixtureSheetName =
          sheetNames.find((s) => /fixture|partido|matches|cruces/i.test(s)) ||
          (sheetNames.length > 1 ? sheetNames[1] : null);

        if (fixtureSheetName) {
          const wsFixture = workbook.Sheets[fixtureSheetName];
          const fixtureJson: any[] = XLSX.utils.sheet_to_json(wsFixture);

          parsedMatches = fixtureJson.map((row, idx) => {
            const round = Number(row.Fecha || row.Jornada || row.Round || 25);
            const localName = String(row.Local || row.Home || '').trim();
            const visitName = String(row.Visitante || row.Visita || row.Away || '').trim();

            const homeTeam =
              parsedTeams.find((t) => t.name.toLowerCase() === localName.toLowerCase()) ||
              parsedTeams.find((t) => t.name.toLowerCase().includes(localName.toLowerCase()));
            const awayTeam =
              parsedTeams.find((t) => t.name.toLowerCase() === visitName.toLowerCase()) ||
              parsedTeams.find((t) => t.name.toLowerCase().includes(visitName.toLowerCase()));

            const homeTeamId = homeTeam ? homeTeam.id : localName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const awayTeamId = awayTeam ? awayTeam.id : visitName.toLowerCase().replace(/[^a-z0-9]/g, '_');

            // Parse score if provided
            let homeScore: number | null = null;
            let awayScore: number | null = null;
            if (row.Goles_Local !== undefined && row.Goles_Local !== '') {
              homeScore = Number(row.Goles_Local);
            }
            if (row.Goles_Visita !== undefined && row.Goles_Visita !== '') {
              awayScore = Number(row.Goles_Visita);
            }

            let simulatedOutcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN' | null = null;
            if (homeScore !== null && awayScore !== null) {
              if (homeScore > awayScore) simulatedOutcome = 'HOME_WIN';
              else if (homeScore === awayScore) simulatedOutcome = 'DRAW';
              else simulatedOutcome = 'AWAY_WIN';
            } else {
              const outcomeRaw = String(row.Resultado_Simulado || row.Resultado || '').toUpperCase();
              if (outcomeRaw === '1' || outcomeRaw === 'LOCAL' || outcomeRaw === 'HOME_WIN') {
                simulatedOutcome = 'HOME_WIN';
                homeScore = 1;
                awayScore = 0;
              } else if (outcomeRaw === 'X' || outcomeRaw === 'EMPATE' || outcomeRaw === 'DRAW') {
                simulatedOutcome = 'DRAW';
                homeScore = 0;
                awayScore = 0;
              } else if (outcomeRaw === '2' || outcomeRaw === 'VISITA' || outcomeRaw === 'VISITANTE' || outcomeRaw === 'AWAY_WIN') {
                simulatedOutcome = 'AWAY_WIN';
                homeScore = 0;
                awayScore = 1;
              }
            }

            return {
              id: `excel_m_${idx + 1}`,
              round,
              homeTeamId,
              awayTeamId,
              homeScore,
              awayScore,
              played: false,
              simulatedOutcome,
            };
          });
        }

        resolve({ teams: parsedTeams, matches: parsedMatches });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
}
