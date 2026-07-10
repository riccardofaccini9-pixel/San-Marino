# Programma Evento

Sito statico (HTML/CSS/JS puro, nessun backend) per mostrare allo staff il programma
di un evento su 3 giorni: orari, luoghi, protagonisti e note di sicurezza per ogni
sotto-evento, con filtro per persona.

## Come funziona

- **Vista pubblica**: si apre subito, nessun login. In alto un menu a tendina permette
  di filtrare il programma per singola persona.
- **Area admin**: cliccando il lucchetto in alto a destra viene richiesto un codice a
  4 cifre (default `0000`, modificabile dal pannello admin una volta entrati).
  Da lì si accede a due schede:
  - **Persone**: elenco di chi può essere assegnato agli eventi.
  - **Programma**: tabella con giorno, orario, titolo, luogo, note e partecipanti
    (scelti da un elenco a discesa basato sulla scheda Persone). Il sistema segnala
    in automatico se una persona risulta assegnata a due eventi con orari sovrapposti
    nello stesso giorno.

> ⚠️ Il PIN è solo un blocco "visivo" lato client: chiunque guardi il codice sorgente
> della pagina può bypassarlo. Va benissimo per evitare click accidentali dello staff,
> ma non è una vera misura di sicurezza — non inserire dati sensibili nel programma.

## Come si aggiornano i dati per tutti

Il sito è statico: il file [`data.json`](data.json) è la fonte "pubblicata" che tutti
vedono. Il flusso di lavoro è:

1. Apri il sito pubblicato, clicca il lucchetto ed entra come admin.
2. Modifica persone/eventi: le modifiche vengono salvate come **bozza** nel browser
   (localStorage) e vedi subito l'anteprima nella vista pubblica sotto.
3. Quando sei soddisfatto, clicca **"Esporta data.json"**: scarica il file aggiornato.
4. Sostituisci il file `data.json` nel repository GitHub con quello scaricato
   (via web GitHub: apri il file, "Edit", incolla il contenuto, "Commit changes" —
   oppure `git add data.json && git commit && git push` da riga di comando).
5. GitHub Pages si aggiorna in automatico (di solito entro 1-2 minuti) e tutti i
   membri dello staff vedranno il nuovo programma al prossimo caricamento della pagina.

Il pulsante **"Scarta bozza"** cancella le modifiche non ancora esportate e ricarica
i dati pubblicati da `data.json`.

## Pubblicazione su GitHub Pages

1. Push del contenuto di questa cartella sul branch principale del repository.
2. Nel repository su GitHub: **Settings → Pages → Source**, seleziona il branch
   (es. `main`) e la cartella `/ (root)`.
3. Dopo un minuto il sito sarà raggiungibile all'indirizzo indicato da GitHub
   (in genere `https://<utente>.github.io/<nome-repo>/`).

## Sviluppo locale

Il file `app.js` carica `data.json` con `fetch`, che nella maggior parte dei browser
non funziona aprendo `index.html` direttamente come file locale (protocollo `file://`).
Per testare in locale avvia un piccolo server statico nella cartella del progetto,
ad esempio:

```
npx serve .
```

oppure con Python:

```
python -m http.server 8080
```

e poi apri `http://localhost:8080`.
