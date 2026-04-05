import fs from 'node:fs/promises';
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

function normalizeDocId(value = '') {
  return String(value).trim().replaceAll('/', '_');
}

function parseCsvLine(line = '') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(content = '') {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    return row;
  });
}

function toPayload(row = {}) {
  const idSap = normalizeDocId(row['ID SAP'] || row.idSap || row.idsap || '');
  const payload = {
    idSap,
    commessaId: idSap,
    distretto: String(row['Distretto'] || row.distretto || '').trim(),
    nome: String(row['Denominazione Impianto'] || row.nome || '').trim(),
    comune: String(row['Comune ubicazione Impianto'] || row.comune || '').trim(),
    indirizzo: String(row['Via e civico di ubicazione Impianto'] || row.indirizzo || '').trim(),
    lat: Number(row['Coordinate GPS(Y)'] ?? row.lat),
    lng: Number(row['Coordinate GPS(X)'] ?? row.lng),
    stato: 'da_fare',
    priorita: 'media',
    fotoCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!payload.idSap || !payload.nome || !payload.comune) return null;
  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) return null;
  return payload;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    throw new Error('Uso: node scripts/import-impianti-csv.mjs <percorso-file.csv>');
  }

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  };

  if (!firebaseConfig.projectId) {
    throw new Error('Config Firebase mancante. Esporta le variabili VITE_FIREBASE_* prima di lanciare lo script.');
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const content = await fs.readFile(csvPath, 'utf8');
  const rows = parseCsv(content);
  const payloads = rows.map(toPayload).filter(Boolean);

  if (!payloads.length) {
    throw new Error('Nessuna riga valida trovata nel CSV. Controlla intestazioni e coordinate.');
  }

  for (const payload of payloads) {
    await setDoc(doc(db, 'impianti', payload.idSap), payload, { merge: true });
    await setDoc(
      doc(db, 'commesse', payload.commessaId),
      {
        id: payload.commessaId,
        nome: payload.commessaId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  console.log(`Import completato: ${payloads.length} impianti creati/aggiornati.`);
}

main().catch((error) => {
  console.error('Import fallito:', error.message);
  process.exit(1);
});
