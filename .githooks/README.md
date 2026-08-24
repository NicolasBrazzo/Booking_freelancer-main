# Versionamento automatico

La versione mostrata su `/settings` è il campo `version` del `package.json` alla
radice. Non la aggiorna nessuno a mano: la alza l'hook
[`post-commit`](post-commit) a ogni commit, scegliendo di quanto in base al
**prefisso del messaggio**.

## La regola

| Nel messaggio del commit | Livello | Esempio |
|---|---|---|
| `feat!:` (con punto esclamativo), oppure un footer `BREAKING CHANGE:` a inizio riga | **major** `X.y.z` | `1.4.2` → `2.0.0` |
| `feat:` o `feat(ambito):` | **minor** `x.Y.z` | `1.4.2` → `1.5.0` |
| qualsiasi altro prefisso (`fix:`, `refactor:`, `docs:`, `style:`…) **o nessun prefisso** | **patch** `x.y.Z` | `1.4.2` → `1.4.3` |

Il bump finisce **dentro lo stesso commit** del codice, non in un commit a parte:
il commit che scrivi contiene sia le tue modifiche sia `package.json`.

Non esiste un commit senza bump. Se scrivi un messaggio senza prefisso
riconosciuto ottieni un patch — mai niente.

`BREAKING CHANGE` vale solo se apre una riga ed è seguito dai due punti, come
prescrive conventional-commits. Nominarlo in mezzo a una frase non fa scattare
niente: senza questo vincolo un commit che *descrive* la regola invece di
applicarla diventerebbe un major — successo davvero, al primo commit di prova.

## Come si abilita

L'hook sta in `.githooks/`, che è versionato, e non in `.git/hooks/`, che non lo
è: così viaggia col repo invece di dover essere reinstallato su ogni macchina.
Lo attiva `core.hooksPath`, impostato dallo script `prepare` di `package.json` a
ogni `npm install` nella radice. Per farlo a mano:

```bash
git config core.hooksPath .githooks
```

## Quando l'hook non fa niente

- **Merge, rebase, cherry-pick, revert** — il commit lo costruisce git, non è
  una modifica da versionare.
- **`git commit --amend`** — il commit che stai correggendo porta già la sua
  versione, rialzarla la farebbe salire due volte per un lavoro solo.
- **Un commit che cambia già `version`** — se l'hai alzata tu a mano e messa in
  stage, l'hook si fa da parte e rispetta il numero che hai scelto. È così che
  si forza una versione precisa: modifichi `package.json`, `git add`, committi.

Gli ultimi due casi sono lo stesso controllo: *questo commit tocca già la riga
`version`?* Se sì, l'hook esce. È anche ciò che impedisce all'`--amend` interno
all'hook di richiamare l'hook all'infinito.

## Perché `post-commit` (e non un hook più ovvio)

Servono due cose insieme: **leggere il messaggio** e **mettere `package.json`
dentro il commit**. Nessun hook di git può fare entrambe, e l'ho verificato
sperimentalmente:

| Hook | Vede il messaggio? | Può aggiungere file al commit? |
|---|---|---|
| `pre-commit` | ❌ non esiste ancora | ✅ è quello che usa lint-staged |
| `prepare-commit-msg` | ✅ | ❌ il `git add` riesce, ma git ha già fotografato l'index: la modifica finisce nel commit **successivo** |
| `commit-msg` | ✅ | ❌ stesso problema |
| `post-commit` | ✅ | ✅ **ma solo con `--amend`** |

Da qui la scelta: l'hook lascia che il commit venga creato, poi alza la versione
e la aggiunge con `git commit --amend --no-edit --no-verify`. L'effetto
collaterale è che **lo SHA del commit cambia subito dopo la creazione**. È
irrilevante finché non hai pushato, che è sempre il caso: l'amend avviene
nell'istante successivo al commit.

## I due attriti che comporta

**1. I merge fra branch vanno in conflitto su `package.json`.** Se `dev` e
`main` hanno entrambi alzato la versione, git non sa quale tenere:
Si risolve tenendo **la più alta**, poi `git add package.json` e si conclude il
merge. È un conflitto di una riga, ma capita a ogni merge: è il prezzo di avere
un bump in ogni commit.

**2. `--no-verify` non basta a saltarlo.** Quel flag disattiva `pre-commit` e
`commit-msg`, non `post-commit`. Per committare davvero senza bump:

```bash
git -c core.hooksPath=/dev/null commit -m "..."
```

## La versione nell'app

`client/vite.config.js` legge `package.json` e inietta il numero come
`__APP_VERSION__` a build time. Vite valuta la config una volta sola all'avvio,
quindi il numero nuovo compare **alla build successiva** (o al riavvio del dev
server), non nell'istante del commit.
