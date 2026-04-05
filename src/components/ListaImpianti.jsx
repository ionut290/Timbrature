import React from 'react';
import { serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ListaImpianti({ impianti, onError, onActionDone }) {
  async function segnaFatto(id) {
    try {
      const ref = doc(db, 'impianti', id);
      await updateDoc(ref, {
        stato: 'fatto',
        updatedAt: serverTimestamp(),
      });
      onActionDone?.('Impianto aggiornato a "fatto"');
    } catch (error) {
      console.error('Errore aggiornamento stato impianto', error);
      onError?.('Errore nel salvataggio dello stato. Riprova.');
    }
  }

  return (
    <div className="card">
      <h2>Lista impianti</h2>

      {!impianti.length ? (
        <p className="empty">Nessun impianto trovato per il filtro selezionato.</p>
      ) : (
        <ul className="impiantiList">
          {impianti.map((impianto) => (
            <li key={impianto.id} className="impiantoItem">
              <div>
                <h3>{impianto.nome || 'Senza nome'}</h3>
                <p>Comune: {impianto.comune || '-'}</p>
                <p>Stato: {impianto.stato || '-'}</p>
                <p>Priorità: {impianto.priorita || '-'}</p>
              </div>
              <button
                type="button"
                onClick={() => segnaFatto(impianto.id)}
                disabled={impianto.stato === 'fatto'}
              >
                {impianto.stato === 'fatto' ? 'Già fatto' : 'Segna fatto'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
