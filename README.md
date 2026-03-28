# Timbrature (Google Sheets + Apps Script)

Applicazione web per la gestione timbrature con:

- multi dipendente
- entrata/uscita + pausa manuale
- causali giornata (ferie, malattia, pioggia, ecc.)
- calcolo automatico ore ordinarie/straordinari con arrotondamento
- workflow approvazione responsabile
- storico mensile

## Struttura progetto

```text
apps-script/
  appsscript.json
  Code.gs
  Index.html
  Styles.html
  Scripts.html
```

## Setup rapido

1. Crea un Google Sheet vuoto.
2. Apri **Estensioni → Apps Script**.
3. Copia i file della cartella `apps-script/` nel progetto Apps Script.
4. Esegui manualmente la funzione `setupSpreadsheet()` una volta sola.
5. Compila il foglio `Dipendenti` con i tuoi utenti e ruoli.
6. Deploy come Web App:
   - **Esegui come**: te
   - **Accesso**: dominio aziendale (consigliato)

## Deploy su Netlify: cosa devi sapere

Questo progetto **non può essere pubblicato direttamente su Netlify** così com'è, perché il frontend usa `google.script.run`, API disponibili solo quando l'app gira dentro Google Apps Script.

Hai due opzioni:

1. **Consigliata (attuale):** deploy come Web App Google Apps Script.
2. **Netlify + backend Apps Script:**
   - tieni `Code.gs` come backend (esposto con endpoint HTTP `doGet/doPost`),
   - sposti il frontend su Netlify,
   - sostituisci le chiamate `google.script.run` con `fetch()` verso l'URL della Web App Apps Script,
   - gestisci autenticazione/autorizzazione (token/JWT/API key) lato backend.

Se vuoi, nel prossimo step posso prepararti una versione `frontend` pronta per Netlify (HTML/CSS/JS statici + chiamate REST).

## Ruoli supportati

- `dipendente`: inserimento presenze e invio al responsabile.
- `responsabile`: approvazione/rifiuto timbrature del proprio team.
- `admin`: visibilità completa e approvazione globale.

## Fogli creati automaticamente

- `Dipendenti`
- `Timbrature`
- `Causali`
- `Regole`

## Note operative

- L'identità utente usa `Session.getActiveUser().getEmail()`.
- Se l'email risulta vuota, verificare permessi e policy del dominio Google Workspace.
- Record con stato `APPROVATO` non modificabili dal dipendente.
