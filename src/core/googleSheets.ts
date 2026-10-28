import { Team, Match } from './types';
import { calculateAverage } from './math';

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime: string;
}

/**
 * Lists user spreadsheets from Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetItem[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=20`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Error al buscar planillas en Google Drive');
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Creates a brand-new Google Sheet in user's Google Drive with "Tabla" and "Fixture"
 */
export async function createCalculadoraSpreadsheet(
  accessToken: string,
  title: string = 'Calculadora Miramar Misiones - Descenso AUF',
  teams: Team[],
  matches: Match[]
): Promise<{ id: string; url: string }> {
  // 1. Create spreadsheet structure with 2 sheets
  const createPayload = {
    properties: {
      title,
    },
    sheets: [
      { properties: { title: 'Tabla' } },
      { properties: { title: 'Fixture' } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'No se pudo crear la planilla de cálculo en Google Drive');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Populate values
  await updateSpreadsheetData(accessToken, spreadsheetId, teams, matches);

  return { id: spreadsheetId, url: spreadsheetUrl };
}

/**
 * Updates an existing Google Sheet with the latest Teams and Fixture data
 */
export async function updateSpreadsheetData(
  accessToken: string,
  spreadsheetId: string,
  teams: Team[],
  matches: Match[]
): Promise<void> {
  // Prepare Tabla rows
  const tablaHeaders = ['Equipo', 'Codigo', 'Es_Nuevo_1_Ano', 'PJ 2025 + 2026', 'Pts 2025', 'Pts 2026', 'GF', 'GC', 'DG', 'Promedio'];
  const tablaRows = teams.map((t) => {
    const totalPts = t.seasonHistoryPoints + t.seasonCurrentPoints;
    const totalPJ = t.seasonHistoryPlayed + t.seasonCurrentPlayed;
    const avg = calculateAverage(totalPts, totalPJ);
    const dg = t.gf - t.gc;

    return [
      t.name,
      t.code,
      t.isNew ? 'SI' : 'NO',
      totalPJ,
      t.seasonHistoryPoints,
      t.seasonCurrentPoints,
      t.gf,
      t.gc,
      dg,
      avg,
    ];
  });

  // Prepare Fixture rows
  const fixtureHeaders = ['Fecha', 'Local', 'Goles_Local', 'Goles_Visita', 'Visitante', 'Resultado'];
  const fixtureRows = matches.map((m) => {
    const home = teams.find((t) => t.id === m.homeTeamId);
    const away = teams.find((t) => t.id === m.awayTeamId);

    let hScore = typeof m.homeScore === 'number' ? m.homeScore : '';
    let aScore = typeof m.awayScore === 'number' ? m.awayScore : '';
    let outcome = m.simulatedOutcome === 'HOME_WIN' ? '1' : m.simulatedOutcome === 'DRAW' ? 'X' : m.simulatedOutcome === 'AWAY_WIN' ? '2' : '';

    return [
      m.round,
      home ? home.name : m.homeTeamId,
      hScore,
      aScore,
      away ? away.name : m.awayTeamId,
      outcome,
    ];
  });

  // Update Tabla values
  const dataPayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Tabla!A1:J' + (tablaRows.length + 1),
        values: [tablaHeaders, ...tablaRows],
      },
      {
        range: 'Fixture!A1:F' + (fixtureRows.length + 1),
        values: [fixtureHeaders, ...fixtureRows],
      },
    ],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataPayload),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al actualizar los datos en Google Sheets');
  }
}

/**
 * Reads and imports Teams and Matches from an existing Google Sheet
 */
export async function readSpreadsheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<{ teams: Team[]; matches: Match[] }> {
  // 1. Fetch metadata to get actual sheet titles
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'No se pudo acceder a la planilla en Google Sheets');
  }

  const metaData = await metaRes.json();
  const sheets: any[] = metaData.sheets || [];

  const tableSheet = sheets.find((s) => /tabla|equipo|standings|promedio/i.test(s.properties?.title)) || sheets[0];
  const fixtureSheet = sheets.find((s) => /fixture|partido|matches|cruces/i.test(s.properties?.title)) || (sheets.length > 1 ? sheets[1] : null);

  const tableTitle = tableSheet?.properties?.title || 'Tabla';
  const fixtureTitle = fixtureSheet?.properties?.title || 'Fixture';

  // 2. Fetch data from both sheets
  const ranges = encodeURIComponent(`${tableTitle}!A1:Z50`) + '&ranges=' + encodeURIComponent(`${fixtureTitle}!A1:Z50`);
  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!valuesRes.ok) {
    const err = await valuesRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al leer celdas de Google Sheets');
  }

  const valuesData = await valuesRes.json();
  const valueRanges = valuesData.valueRanges || [];

  const tableValues: any[][] = valueRanges[0]?.values || [];
  const fixtureValues: any[][] = valueRanges[1]?.values || [];

  if (tableValues.length < 2) {
    throw new Error('La hoja "Tabla" no tiene suficientes filas de datos.');
  }

  // Parse Table headers
  const tHeaders = tableValues[0].map((h: string) => String(h || '').trim().toLowerCase());
  const idxTeam = tHeaders.findIndex((h) => /equipo|club|nombre|name/i.test(h));
  const idxCode = tHeaders.findIndex((h) => /codigo|code/i.test(h));
  const idxNew = tHeaders.findIndex((h) => /nuevo|isnew|1_ano/i.test(h));
  const idxPts2025 = tHeaders.findIndex((h) => /2025|anterior|historico/i.test(h));
  const idxPts2026 = tHeaders.findIndex((h) => /2026|actual|puntos|pts/i.test(h));
  const idxPJ = tHeaders.findIndex((h) => /pj|partidos/i.test(h));
  const idxGF = tHeaders.findIndex((h) => /gf|goles_favor/i.test(h));
  const idxGC = tHeaders.findIndex((h) => /gc|goles_contra/i.test(h));
  const idxDG = tHeaders.findIndex((h) => /dg|dif/i.test(h));

  const parsedTeams: Team[] = [];

  for (let i = 1; i < tableValues.length; i++) {
    const row = tableValues[i];
    if (!row || row.length === 0) continue;

    const name = String(row[idxTeam >= 0 ? idxTeam : 0] || `Equipo ${i}`).trim();
    if (!name) continue;

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const code = String(idxCode >= 0 && row[idxCode] ? row[idxCode] : name.slice(0, 3)).toUpperCase();

    const isNewRaw = String(idxNew >= 0 ? row[idxNew] : '').toLowerCase();
    const pts2025 = Number(idxPts2025 >= 0 ? row[idxPts2025] : 0) || 0;
    const pts2026 = Number(idxPts2026 >= 0 ? row[idxPts2026] : 0) || 0;
    const pjTotal = Number(idxPJ >= 0 ? row[idxPJ] : 0) || 30;

    const isNew =
      isNewRaw === 'si' || isNewRaw === 'sí' || isNewRaw === 'true' || (pts2025 === 0 && pjTotal <= 32);

    const dg = Number(idxDG >= 0 ? row[idxDG] : 0) || 0;
    const gf = Number(idxGF >= 0 ? row[idxGF] : (dg > 0 ? 30 + dg : 30)) || 30;
    const gc = Number(idxGC >= 0 ? row[idxGC] : (dg < 0 ? 30 - dg : 30)) || 30;

    const isTarget = /miramar/i.test(name) || /mir/i.test(code);

    parsedTeams.push({
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
      seasonHistoryPlayed: isNew ? 0 : Math.max(0, pjTotal - 30 || 32),
      seasonCurrentPoints: pts2026,
      seasonCurrentPlayed: 30,
      gf,
      gc,
      recentForm: ['D', 'D', 'D', 'D', 'D'],
      isTarget,
    });
  }

  // Parse Fixture
  const parsedMatches: Match[] = [];
  if (fixtureValues.length >= 2) {
    const fHeaders = fixtureValues[0].map((h: string) => String(h || '').trim().toLowerCase());
    const idxRound = fHeaders.findIndex((h) => /fecha|round|jornada/i.test(h));
    const idxLocal = fHeaders.findIndex((h) => /local|home/i.test(h));
    const idxVisit = fHeaders.findIndex((h) => /visita|away|visitante/i.test(h));
    const idxHScore = fHeaders.findIndex((h) => /goles_local|hscore|gol_l/i.test(h));
    const idxAScore = fHeaders.findIndex((h) => /goles_visita|ascore|gol_v/i.test(h));
    const idxOutcome = fHeaders.findIndex((h) => /resultado|outcome/i.test(h));

    for (let i = 1; i < fixtureValues.length; i++) {
      const row = fixtureValues[i];
      if (!row || row.length === 0) continue;

      const round = Number(idxRound >= 0 ? row[idxRound] : 25) || 25;
      const localName = String(idxLocal >= 0 ? row[idxLocal] : '').trim();
      const visitName = String(idxVisit >= 0 ? row[idxVisit] : '').trim();
      if (!localName || !visitName) continue;

      const homeTeam =
        parsedTeams.find((t) => t.name.toLowerCase() === localName.toLowerCase()) ||
        parsedTeams.find((t) => t.name.toLowerCase().includes(localName.toLowerCase()));
      const awayTeam =
        parsedTeams.find((t) => t.name.toLowerCase() === visitName.toLowerCase()) ||
        parsedTeams.find((t) => t.name.toLowerCase().includes(visitName.toLowerCase()));

      const homeTeamId = homeTeam ? homeTeam.id : localName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const awayTeamId = awayTeam ? awayTeam.id : visitName.toLowerCase().replace(/[^a-z0-9]/g, '_');

      let homeScore: number | null = null;
      let awayScore: number | null = null;
      if (idxHScore >= 0 && row[idxHScore] !== '' && row[idxHScore] !== undefined) {
        homeScore = Number(row[idxHScore]);
      }
      if (idxAScore >= 0 && row[idxAScore] !== '' && row[idxAScore] !== undefined) {
        awayScore = Number(row[idxAScore]);
      }

      let simulatedOutcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN' | null = null;
      if (homeScore !== null && awayScore !== null) {
        if (homeScore > awayScore) simulatedOutcome = 'HOME_WIN';
        else if (homeScore === awayScore) simulatedOutcome = 'DRAW';
        else simulatedOutcome = 'AWAY_WIN';
      } else if (idxOutcome >= 0 && row[idxOutcome]) {
        const out = String(row[idxOutcome]).trim().toUpperCase();
        if (out === '1') {
          simulatedOutcome = 'HOME_WIN';
          homeScore = 1;
          awayScore = 0;
        } else if (out === 'X') {
          simulatedOutcome = 'DRAW';
          homeScore = 0;
          awayScore = 0;
        } else if (out === '2') {
          simulatedOutcome = 'AWAY_WIN';
          homeScore = 0;
          awayScore = 1;
        }
      }

      parsedMatches.push({
        id: `gs_m_${i}`,
        round,
        homeTeamId,
        awayTeamId,
        homeScore,
        awayScore,
        played: false,
        simulatedOutcome,
      });
    }
  }

  return { teams: parsedTeams, matches: parsedMatches };
}
