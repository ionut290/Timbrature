import React from "react";
import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const initialState = {
  distretto: '',
  idSap: '',
  nome: '',
  comune: '',
  indirizzo: '',
  lat: '',
  lng: '',
  stato: 'da_fare',
  priorita: 'media',
  fotoCount: '0',
};

function normalizeDocId(value = '') {
  return String(value).trim().replaceAll('/', '_');
}

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
      const idSap = normalizeDocId(form.idSap);
      const payload = {
        idSap,
        commessaId: idSap,
        distretto: form.distretto.trim() || '',
        nome: form.nome.trim(),
        comune: form.comune.trim(),
        indirizzo: form.indirizzo.trim(),
        lat: Number(form.lat),
        lng: Number(form.lng),
        stato: form.stato || 'da_fare',
        priorita: form.priorita || 'media',
        fotoCount: Number(form.fotoCount || 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (!payload.idSap) {
        throw new Error('ID SAP obbligatorio.');
      }
      if (!payload.nome || !payload.comune) {
        throw new Error('Compila almeno Denominazione impianto e Comune.');
      }
      if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng)) {
        throw new Error('Latitudine e longitudine non valide.');
      }

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

      setForm(initialState);
      onActionDone?.('Impianto creato/aggiornato con successo.');
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
          Distretto
          <input name="distretto" value={form.distretto} onChange={handleChange} />
        </label>

        <label>
          ID SAP
          <input name="idSap" value={form.idSap} onChange={handleChange} required />
        </label>

        <label>
          Denominazione Impianto
          <input name="nome" value={form.nome} onChange={handleChange} required />
        </label>

        <label>
          Comune
          <input name="comune" value={form.comune} onChange={handleChange} required />
        </label>

        <label>
          Via e civico
          <input name="indirizzo" value={form.indirizzo} onChange={handleChange} />
        </label>

        <label>
          Lat
          <input name="lat" value={form.lat} onChange={handleChange} required />
        </label>

        <label>
          Lng
          <input name="lng" value={form.lng} onChange={handleChange} required />
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
          <select name="priorita" value={form.priorita} onChange={handleChange}>
            <option value="bassa">bassa</option>
            <option value="media">media</option>
            <option value="alta">alta</option>
          </select>
        </label>

        <label>
          Foto count
          <input name="fotoCount" value={form.fotoCount} onChange={handleChange} type="number" min="0" />
        </label>

        <button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva impianto'}</button>
      </form>
    </div>
  );
}
