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

function readLocalCommesse() {
  try {
    const rawCommesse = localStorage.getItem(LOCAL_COMMESSE_KEY);
    const rowsCommesse = JSON.parse(rawCommesse || '[]');

    const rawMaster = localStorage.getItem(MASTER_DATA_KEY);
    const masterData = JSON.parse(rawMaster || '{}');
    const masterRows = Array.isArray(masterData?.commesse)
      ? masterData.commesse.map((entry) => ({ id: entry?.id || entry?.name, nome: entry?.name || entry?.nome }))
      : [];

    return mergeCommesse(normalizeCommessaRows(rowsCommesse), normalizeCommessaRows(masterRows));
  } catch (error) {
    console.warn('Impossibile leggere le commesse locali', error);
    return [];
  }
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

export default function GestioneImpiantiLive() {
  const [impianti, setImpianti] = useState([]);
  const [commesseFirestore, setCommesseFirestore] = useState([]);
  const [commesseLocal, setCommesseLocal] = useState(() => readLocalCommesse());
  const [commessaIdFilter, setCommessaIdFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const syncLocalCommesse = () => setCommesseLocal(readLocalCommesse());
    syncLocalCommesse();

    const onStorage = (event) => {
      if (!event.key || event.key === LOCAL_COMMESSE_KEY || event.key === MASTER_DATA_KEY) {
        syncLocalCommesse();
      }
    };

    window.addEventListener('storage', onStorage);
    const poll = window.setInterval(syncLocalCommesse, 4000);

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
        setLoading(false);
      },
      (err) => {
        console.error('Errore lettura impianti', err);
        setError('Errore nel caricamento impianti. Controlla regole Firestore/permessi.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [commessaIdFilter]);

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
