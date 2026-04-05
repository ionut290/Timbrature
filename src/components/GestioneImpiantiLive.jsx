import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';
import { db } from '../firebase';
import MappaImpianti from './MappaImpianti';
import ListaImpianti from './ListaImpianti';
import FormImpianto from './FormImpianto';

const LOCAL_COMMESSE_KEY = 'timbrature.local.commesse';
const MASTER_DATA_KEY = 'timbrature.local.master.data';

function normalizeCommessaRows(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const nome = String(row?.nome || row?.name || '').trim();
      const id = String(row?.id || nome).trim();
      if (!id && !nome) return null;
      return { id: id || nome, nome: nome || id };
    })
    .filter(Boolean);
}

function mergeCommesse(localRows = [], firestoreRows = []) {
  const map = new Map();
  [...localRows, ...firestoreRows].forEach((row) => {
    const id = String(row?.id || '').trim();
    const nome = String(row?.nome || '').trim();
    if (!id && !nome) return;
    const key = id || nome;
    map.set(key, { id: key, nome: nome || key });
  });
  return Array.from(map.values());
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function readLocalData() {
  try {
    const rawCommesse = localStorage.getItem(LOCAL_COMMESSE_KEY);
    const rowsCommesse = JSON.parse(rawCommesse || '[]');

    const rawMaster = localStorage.getItem(MASTER_DATA_KEY);
    const masterData = JSON.parse(rawMaster || '{}');
    const masterRows = Array.isArray(masterData?.commesse)
      ? masterData.commesse.map((entry) => ({ id: entry?.id || entry?.name, nome: entry?.name || entry?.nome }))
      : [];

    const localCommesse = mergeCommesse(normalizeCommessaRows(rowsCommesse), normalizeCommessaRows(masterRows));

    const localImpianti = (Array.isArray(rowsCommesse) ? rowsCommesse : []).flatMap((commessa) => {
      const commessaId = String(commessa?.id || commessa?.nome || '').trim();
      const commessaNome = String(commessa?.nome || '').trim();
      const cantieri = Array.isArray(commessa?.cantieri) ? commessa.cantieri : [];

      return cantieri
        .map((cantiere, idx) => {
          const lat = toNumber(cantiere?.lat ?? cantiere?.latitude ?? cantiere?.gps?.lat);
          const lng = toNumber(cantiere?.lng ?? cantiere?.lon ?? cantiere?.longitude ?? cantiere?.gps?.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

          return {
            id: String(cantiere?.id || `${commessaId}-${idx}`),
            commessaId,
            commessaNome,
            nome: String(cantiere?.name || cantiere?.nome || cantiere?.title || 'Impianto locale'),
            comune: String(cantiere?.comune || cantiere?.city || ''),
            indirizzo: String(cantiere?.address || cantiere?.indirizzo || ''),
            lat,
            lng,
            stato: String(cantiere?.stato || 'da_fare'),
            priorita: String(cantiere?.priorita || 'media'),
            source: 'local',
          };
        })
        .filter(Boolean);
    });

    return { localCommesse, localImpianti };
  } catch (error) {
    console.warn('Impossibile leggere i dati locali', error);
    return { localCommesse: [], localImpianti: [] };
  }
}

function parseDelimitedText(text, delimiter = ',') {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter).map((c) => c.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cells[idx] ?? '';
    });
    return row;
  });
}

function toImpiantoPayload(row = {}) {
  const payload = {
    commessaId: String(row.commessaId || row.commessaid || row.commessa || '').trim(),
    nome: String(row.nome || row.name || '').trim(),
    comune: String(row.comune || row.city || '').trim(),
    indirizzo: String(row.indirizzo || row.address || '').trim(),
    lat: Number(row.lat ?? row.latitude),
    lng: Number(row.lng ?? row.lon ?? row.longitude),
    stato: String(row.stato || 'da_fare').trim() || 'da_fare',
    priorita: String(row.priorita || row.priority || 'media').trim() || 'media',
    fotoCount: Number(row.fotoCount ?? row.fotocount ?? row.foto_count ?? 0),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!payload.commessaId || !payload.nome || !payload.comune) return null;
  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) return null;
  if (!Number.isFinite(payload.fotoCount)) payload.fotoCount = 0;
  return payload;
}

export default function GestioneImpiantiLive() {
  const initialLocalData = useMemo(() => readLocalData(), []);

  const [impianti, setImpianti] = useState([]);
  const [commesseFirestore, setCommesseFirestore] = useState([]);
  const [commesseLocal, setCommesseLocal] = useState(initialLocalData.localCommesse);
  const [impiantiLocal, setImpiantiLocal] = useState(initialLocalData.localImpianti);
  const [commessaIdFilter, setCommessaIdFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [inputMode, setInputMode] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const syncLocalData = () => {
      const next = readLocalData();
      setCommesseLocal(next.localCommesse);
      setImpiantiLocal(next.localImpianti);
    };
    syncLocalData();

    const onStorage = (event) => {
      if (!event.key || event.key === LOCAL_COMMESSE_KEY || event.key === MASTER_DATA_KEY) {
        syncLocalData();
      }
    };

    window.addEventListener('storage', onStorage);
    const poll = window.setInterval(syncLocalData, 4000);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'commesse'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCommesseFirestore(rows);
      },
      (err) => {
        console.error('Errore lettura commesse', err);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');

    const baseRef = collection(db, 'impianti');
    const q = commessaIdFilter
      ? query(baseRef, where('commessaId', '==', commessaIdFilter))
      : query(baseRef);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setImpianti(rows);
        setNotice('');
        setLoading(false);
      },
      (err) => {
        console.error('Errore lettura impianti', err);

        const fallback = impiantiLocal.filter((row) => {
          if (!commessaIdFilter) return true;
          return row.commessaId === commessaIdFilter || row.commessaNome === commessaIdFilter;
        });

        setImpianti(fallback);
        setNotice('Firestore non accessibile: mostrati i cantieri/impianti locali da Dati app.');
        setError('');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [commessaIdFilter, impiantiLocal]);

  const commesseOptions = useMemo(() => {
    return mergeCommesse(commesseLocal, commesseFirestore).map((c) => ({
      value: c.id,
      label: c.nome ? `${c.nome} (${c.id})` : c.id,
    }));
  }, [commesseLocal, commesseFirestore]);

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');

    try {
      const fileName = file.name.toLowerCase();
      const text = await file.text();
      let rows = [];

      if (fileName.endsWith('.json')) {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];
      } else if (fileName.endsWith('.csv')) {
        rows = parseDelimitedText(text, ',');
      } else if (fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
        rows = parseDelimitedText(text, '\t');
      } else {
        throw new Error('Formato non supportato direttamente. Usa CSV, TSV/TXT o JSON.');
      }

      const payloads = rows.map(toImpiantoPayload).filter(Boolean);
      if (!payloads.length) {
        throw new Error('Nessuna riga valida trovata nel file (campi minimi: commessaId, nome, comune, lat, lng).');
      }

      await Promise.all(payloads.map((payload) => addDoc(collection(db, 'impianti'), payload)));
      setNotice(`Import completato: ${payloads.length} impianti caricati.`);
    } catch (err) {
      console.error('Errore import file impianti', err);
      setError(err.message || 'Errore durante import file impianti.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  }

  return (
    <>
      <header className="card">
        <h1>Gestione impianti live</h1>
        <p>Firestore realtime + mappa + lista + aggiornamento stato.</p>

        <div className="toolbar">
          <label>
            Filtro commessa
            <select
              value={commessaIdFilter}
              onChange={(e) => setCommessaIdFilter(e.target.value)}
            >
              <option value="">Tutte le commesse</option>
              {commesseOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="card inputModeCard">
          <h2>Come vuoi inserire gli impianti?</h2>
          <div className="inputModeActions">
            <button type="button" onClick={() => setInputMode('import')}>Importa da file</button>
            <button type="button" onClick={() => setInputMode('manual')}>Inserimento manuale</button>
          </div>
          {inputMode === 'import' ? (
            <div className="inputModeImport">
              <p>
                Formati accettati: CSV, TSV, TXT, JSON. Formati selezionabili per upload: .csv, .tsv, .txt, .json, .xlsx, .xls, .ods, .xml.
              </p>
              <input
                type="file"
                accept=".csv,.tsv,.txt,.json,.xlsx,.xls,.ods,.xml"
                onChange={handleImportFile}
                disabled={importing}
              />
            </div>
          ) : null}
        </div>

        {notice ? <p className="notice">{notice}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </header>

      <section className="grid2">
        <MappaImpianti impianti={impianti} />
        {inputMode === 'manual' ? (
          <FormImpianto onError={setError} onActionDone={setNotice} />
        ) : (
          <div className="card">
            <h2>Nuovo impianto</h2>
            <p>Seleziona prima una modalità: “Importa da file” oppure “Inserimento manuale”.</p>
          </div>
        )}
      </section>

      <section>
        {loading ? (
          <div className="card">Caricamento impianti in tempo reale...</div>
        ) : (
          <ListaImpianti impianti={impianti} onError={setError} onActionDone={setNotice} />
        )}
      </section>
    </>
  );
}
