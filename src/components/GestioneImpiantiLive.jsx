import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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

        {notice ? <p className="notice">{notice}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </header>

      <section className="grid2">
        <MappaImpianti impianti={impianti} />
        <FormImpianto onError={setError} onActionDone={setNotice} />
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
