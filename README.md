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

## Deploy come Web App Google Apps Script (soluzione più diretta)

1. Nell'editor Apps Script clicca **Distribuisci → Nuova distribuzione**.
2. Tipo distribuzione: **App web**.
3. Configura i parametri:
   - **Esegui come**: `Utente che esegue il deployment` (tu)
   - **Chi ha accesso**: `Solo utenti del dominio` (se usi Google Workspace)
4. Clicca **Distribuisci** e autorizza gli scope richiesti.
5. Copia l'URL della Web App e aprilo in una finestra in incognito con un utente abilitato.

### Quando aggiorni il codice

- Vai su **Distribuisci → Gestisci distribuzioni**.
- Apri la distribuzione Web App esistente.
- Clicca **Modifica** e crea una **Nuova versione**.
- Salva: l'URL della Web App resta lo stesso, ma verrà pubblicato il nuovo codice.

### Troubleshooting rapido deploy Web App

- Se `Session.getActiveUser().getEmail()` restituisce vuoto, verifica che:
  - il progetto sia su account Workspace,
  - l'accesso sia limitato al dominio,
  - l'utente apra la Web App autenticato con l'account aziendale corretto.
- Se vedi errori autorizzativi, riesegui una funzione server (es. `setupSpreadsheet`) da editor per riallineare i permessi.

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


### Nota per Netlify (fix 404)

In questa repo è stato aggiunto un `index.html` statico alla root per evitare l'errore **Page not found** quando apri il dominio Netlify.

- Questo risolve il 404 del link Netlify.
- Non rende automaticamente funzionante la web app Apps Script (che richiede `google.script.run`).
