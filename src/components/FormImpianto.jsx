import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const initialState = {
  commessaId: '',
  nome: '',
  comune: '',
  indirizzo: '',
  lat: '',
  lng: '',
  stato: 'da_fare',
  priorita: 'media',
  fotoCount: '0',
};

export default function FormImpianto({ onError, onActionDone }) {
  const [form, setForm] = useState(initialState);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        commessaId: form.commessaId.trim(),
        nome: form.nome.trim(),
        comune: form.comune.trim(),
        indirizzo: form.indirizzo.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        stato: form.stato,
        priorita: form.priorita,
        fotoCount: Number(form.fotoCount || 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (!payload.commessaId || !payload.nome || !payload.comune) {
        throw new Error('Compila almeno commessaId, nome e comune.');
      }
      if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
        throw new Error('Latitudine e longitudine non valide.');
      }

      await addDoc(collection(db, 'impianti'), payload);
      setForm(initialState);
      onActionDone?.('Nuovo impianto creato con successo.');
    } catch (error) {
      console.error('Errore creazione impianto', error);
      onError?.(error.message || 'Errore nel salvataggio impianto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Nuovo impianto</h2>
      <form onSubmit={handleSubmit} className="formGrid">
        <label>
          Commessa ID
          <input name="commessaId" value={form.commessaId} onChange={handleChange} required />
        </label>

        <label>
          Nome
          <input name="nome" value={form.nome} onChange={handleChange} required />
        </label>

        <label>
          Comune
          <input name="comune" value={form.comune} onChange={handleChange} required />
        </label>

        <label>
          Indirizzo
          <input name="indirizzo" value={form.indirizzo} onChange={handleChange} />
        </label>

        <label>
          Lat
          <input name="lat" type="number" step="any" value={form.lat} onChange={handleChange} required />
        </label>

        <label>
          Lng
          <input name="lng" type="number" step="any" value={form.lng} onChange={handleChange} required />
        </label>

        <label>
          Stato
          <select name="stato" value={form.stato} onChange={handleChange}>
            <option value="da_fare">da_fare</option>
            <option value="in_corso">in_corso</option>
            <option value="fatto">fatto</option>
            <option value="pioggia">pioggia</option>
            <option value="sospeso">sospeso</option>
            <option value="non_accessibile">non_accessibile</option>
          </select>
        </label>

        <label>
          Priorità
          <input name="priorita" value={form.priorita} onChange={handleChange} />
        </label>

        <label>
          Foto count
          <input name="fotoCount" type="number" value={form.fotoCount} onChange={handleChange} />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? 'Salvataggio...' : 'Salva impianto'}
        </button>
      </form>
    </div>
  );
}
