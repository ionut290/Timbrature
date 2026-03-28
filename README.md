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
