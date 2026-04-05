import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';
import { db } from '../firebase';
import MappaImpianti from './MappaImpianti';
import ListaImpianti from './ListaImpianti';
import FormImpianto from './FormImpianto';

export default function GestioneImpiantiLive() {
  const [impianti, setImpianti] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [commessaIdFilter, setCommessaIdFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'commesse'),
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCommesse(rows);
      },
      (err) => {
        console.error('Errore lettura commesse', err);
        setError('Errore nel caricamento commesse.');
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
    return commesse.map((c) => ({
      value: c.id,
      label: c.nome ? `${c.nome} (${c.id})` : c.id,
    }));
  }, [commesse]);

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
