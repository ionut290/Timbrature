# Timbrature (versione standalone senza Google Sheet)

Questa versione salva i dati **direttamente nel browser** (LocalStorage), quindi:

- non serve più Google Sheets,
- non serve Apps Script,
- non devi configurare nulla per iniziare.

## Avvio rapido

1. Apri `index.html` in locale oppure pubblicalo su Netlify.
2. Compila Nome + Email nella sezione **Profilo**.
3. Inserisci timbrature: il salvataggio è automatico in locale.
4. Usa **Esporta backup JSON** per salvare una copia dei dati.

## Dove sono i dati

I dati vengono salvati nella memoria del browser con chiave `timbrature_local_db_v2`.

> Nota: se cancelli i dati del browser, cancelli anche le timbrature locali.

## Migrazione da Google (opzionale)

La cartella `apps-script/` è mantenuta solo come storico, ma non è più necessaria per il funzionamento attuale.
