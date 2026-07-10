# Programma Evento

🔗 **Sito online:** https://riccardofaccini9-pixel.github.io/San-Marino/

Sito statico (HTML/CSS/JS puro, nessun backend) per mostrare allo staff il programma
di un evento su 3 giorni: orari, luoghi, protagonisti e note di sicurezza per ogni
sotto-evento, con filtro per persona. Essendo un sito pubblico su internet (non un
file locale), è raggiungibile da qualunque dispositivo con questo link — PC, tablet,
cellulari — senza installare nulla.

> Se il link sopra non risponde ancora: GitHub Pages va attivato una volta sola,
> vedi la sezione [Pubblicazione su GitHub Pages](#pubblicazione-su-github-pages)
> qui sotto. Dopo l'attivazione (1-2 minuti) resta sempre raggiungibile a quell'indirizzo.

## Come funziona

- **Vista pubblica**: si apre subito, nessun login. In alto un menu a tendina permette
  di filtrare il programma per singola persona.
- **Evidenziazione "in corso"**: l'evento che sta avvenendo in questo momento viene
  evidenziato automaticamente nella vista pubblica (bordo blu + etichetta "IN CORSO"),
  in base all'orario del dispositivo di chi guarda il sito. Perché funzioni, in admin
  va impostata la **data del Giorno 1** (Giorno 2 e 3 si calcolano da sola).
- **Area admin**: cliccando il lucchetto in alto a destra viene richiesto un codice a
  4 cifre (default `0000`, modificabile dal pannello admin una volta entrati).
  Da lì si accede a due schede:
  - **Persone**: elenco di chi può essere assegnato agli eventi.
  - **Programma**: campo per la data del Giorno 1, poi la tabella con giorno, orario,
    titolo, luogo, note e partecipanti (scelti da un elenco a discesa basato sulla
    scheda Persone). Il sistema segnala in automatico se una persona risulta
    assegnata a due eventi con orari sovrapposti nello stesso giorno.

> ⚠️ Il PIN è solo un blocco "visivo" lato client: chiunque guardi il codice sorgente
> della pagina può bypassarlo. Va benissimo per evitare click accidentali dello staff,
> ma non è una vera misura di sicurezza — non inserire dati sensibili nel programma.

## Come si aggiornano i dati per tutti

Il sito è statico: il file [`data.json`](data.json) è la fonte "pubblicata" che tutti
vedono. Mentre modifichi persone/eventi in admin, le modifiche vengono salvate come
**bozza** nel browser (localStorage) e vedi subito l'anteprima nella vista pubblica
sotto — se chiudi la pagina senza pubblicare, la bozza resta lì al prossimo accesso
da quello stesso dispositivo/browser.

Per rendere le modifiche visibili **a tutti, su qualunque dispositivo**, c'è il
pulsante **"🚀 Pubblica su GitHub"** nella scheda Programma: scrive `data.json`
direttamente nel repository, senza passaggi manuali. Serve una configurazione
una tantum:

1. Vai su [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
   (richiede login GitHub) e crea un token **fine-grained** con:
   - **Repository access**: solo questo repository (`San-Marino`).
   - **Permissions → Contents**: `Read and write`.
2. Copia il token generato (inizia con `github_pat_...`).
3. Nel pannello admin del sito, sezione **"Configura token GitHub"**, incollalo e
   salva. Resta memorizzato solo in quel browser (mai visibile ai visitatori del sito).
4. Da quel momento, ogni volta che clicchi **"Pubblica su GitHub"** il programma
   aggiornato viene scritto sul repository e diventa visibile a tutti entro 1-2 minuti.

⚠️ Chiunque abbia questo token può modificare il repository: non condividerlo, e
revocalo da GitHub (Settings → Developer settings → Personal access tokens) a fine
evento, visto che il sito serve solo per questo mese.

Il pulsante **"⬇ Scarica data.json"** resta disponibile come backup manuale (utile
se in un momento non hai a portata di mano il token), e **"Scarta bozza"** cancella
le modifiche non ancora pubblicate ricaricando i dati pubblicati da `data.json`.

## Logo

Carica il file del logo nella cartella [`assets/`](assets/) con il nome `logo.svg`
oppure `logo.png` (va bene anche solo uno dei due): comparirà automaticamente in
alto a sinistra, accanto al titolo. Se non carichi nulla, l'intestazione resta
comunque corretta senza spazio vuoto. Dettagli in [`assets/README.txt`](assets/README.txt).

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
