# Brief til Claude Code: Aurex Bay Tycoon på Vercel og Supabase

## Mål

Sæt prototypen op som et rigtigt multiplayer-spil:

- én fælles by, der lever i Supabase og kører videre døgnet rundt;
- frontenden hostet på Vercel;
- den nuværende offline-demo skal stadig kunne åbnes, så spillet kan vises frem uden login.

Leverancen er:

- et privat GitHub-repo;
- et Supabase-projekt med database, Edge Function og cron;
- en Vercel-URL, hvor to personer i hver sin browser spiller i samme by.

## Det du får

- **Kildekoden:** `aurex-bay-tycoon.zip`. Udpak den, og arbejd i mappen `aurex/`.
- **Den kørende demo** (reference for hvordan alt skal se ud og opføre sig): https://claude.ai/artifact/MhHE47shS6P2Gf3WY9MoKg
- **`CLAUDE.md`** i roden beskriver arkitekturen. Læs den først.
- **`README.md`** har afsnittet "Sæt det online", som denne brief bygger på.

Kort om arkitekturen:

- Der er ingen build: statisk `index.html` og ES-moduler.
- Spillets regler ligger i `supabase/functions/_shared/` (`engine.js`, `ops.js`, `logistics.js`, `life.js`, `talent.js`, `content.js`). Både browserdemoen og Edge Function'en `supabase/functions/game/index.ts` importerer de samme filer. Reglerne må aldrig kopieres til klienten eller til SQL.
- **Online-mode:**
  - Browseren logger anonymt ind i Supabase og sender handlinger til Edge Function'en `game`.
  - Funktionen loader byen fra `cities.state`, lader tiden indhente (`advance`), udfører handlingen (`apply`) og gemmer med optimistisk låsning (`save_city`).
  - Browsere kan kun læse og får opdateringer via Realtime.
  - En cron-job kalder funktionen med `{ "action": "tick" }`, så byen bevæger sig, selvom ingen er online.
- **Valg af mode:** `js/config.js` bestemmer det. Er `SUPABASE_URL` og `SUPABASE_ANON_KEY` tomme, kører den lokale demo med bots.

## Forudsætninger

Spørg Thomas om adgang, hvis noget mangler:

- Konti: GitHub, Vercel, Supabase.
- Lokalt: Node 20+, Supabase CLI (`npm i -g supabase`), Vercel CLI (`npm i -g vercel`), git, openssl.
- Supabase-region: EU (Frankfurt, `eu-central-1`) medmindre andet aftales.

## Trin

### 1. Repo og tests

```bash
unzip aurex-bay-tycoon.zip && cd aurex
npm test                      # skal give 0 FAIL
git init && git add . && git commit -m "Aurex Bay Tycoon prototype"
gh repo create aurex-bay-tycoon --private --source . --push
```

### 2. Supabase-projekt og database

```bash
supabase login
supabase link --project-ref <PROJECT-REF>
supabase db push              # kører supabase/migrations/20261028000000_city.sql
```

Migrationen opretter:

- `cities`: én række pr. by, med `state` (jsonb) og `version`;
- `city_players`;
- RLS: alle må læse `cities`, ingen må skrive fra browseren;
- funktionen `save_city`, som kun service role må kalde;
- tilføjelse af `cities` til `supabase_realtime`.

Kontrollér i dashboardet, at `cities` står under Database → Publications → `supabase_realtime`.

### 3. Anonymt login

Gå til Dashboard → Authentication → Sign In / Providers og slå **Allow anonymous sign-ins** til. Overvej også at slå CAPTCHA til for anonyme logins mod misbrug.

### 4. Deploy spilserveren

```bash
supabase secrets set CRON_SECRET=$(openssl rand -hex 24) GAME_SPEED=1
supabase functions deploy game --no-verify-jwt
```

- `--no-verify-jwt` er bevidst. Funktionen tjekker selv brugerens session, og cron kalder med `x-cron-secret`.
- `GAME_SPEED=1` betyder 1 spilår pr. rigtig uge.
- Til en testby kan du bruge `GAME_SPEED=168`, som giver 1 spilår pr. time. Byen gemmer sin hastighed, når den oprettes. Skift hastighed ved at slette rækken (se Drift).
- Kontrollér, at funktionen bundler de relative imports fra `../_shared/`. Kig efter fejl i Dashboard → Edge Functions → Logs.

### 5. Cron

Åbn `supabase/cron.sql`, udfyld `<PROJECT-REF>` og `<CRON-SECRET>`, og kør filen i SQL-editoren.

- Skift tidsplanen fra `'0 * * * *'` (hver time) til `'*/15 * * * *'` (hvert kvarter). Så bliver hver indhentning mindre, og byen føles mere levende.
- Sørg for, at hemmeligheden ikke ender i git. Brug en lokal kopi af filen, eller læs den fra Vault.

Test:

```bash
curl -s -X POST https://<PROJECT-REF>.supabase.co/functions/v1/game \
  -H 'Content-Type: application/json' -H 'x-cron-secret: <CRON-SECRET>' \
  -d '{"action":"tick","city":"aurex-bay"}' | head -c 300
```

Første kald opretter byen. Tjek bagefter, at `select id, version, updated_at from cities;` viser én række.

### 6. Forbind frontenden

1. Udfyld `js/config.js` med `SUPABASE_URL` og `SUPABASE_ANON_KEY` fra Dashboard → Project Settings → API. Anon-nøglen er offentlig og må gerne ligge i koden. **Service role-nøglen må aldrig komme i repoet.**
2. Bevar demoen: lav en lille ændring i `js/main.js` (omkring linje 680), så `?demo=1` i URL'en altid starter den lokale backend (`createLocalBackend`), også når config er udfyldt. Vis gerne et lille "Offline demo"-mærke i topbaren i den mode.

### 7. Vercel

```bash
vercel          # første gang: framework "Other", ingen build-kommando, output-mappe "."
vercel --prod
```

Alternativt kan du importere GitHub-repoet i Vercel-dashboardet med samme indstillinger, så hver push til `main` deployer automatisk.

- `vercel.json` sætter cache-headere. Billeder caches i en uge, og JS revalideres hver gang.
- Tilføj et custom domæne, hvis Thomas har et.

## Rettelser der skal laves undervejs

1. **Gem ved ugeskift:** Allerede rettet i zip'en. `index.ts` gemte kun, når spillets måned skiftede, men motoren går i ugentlige skridt. Den sammenligner nu `city.wk` før og efter `advance`. Bekræft, at det virker.
2. **Realtime-payloadens størrelse:** Hele `state` sendes til alle browsere ved hver gemning.
   - Målt med én spiller: ca. 60 KB ved start, 110 KB efter 1 spilår og 190 KB efter 5 spilår. Den vokser med antal spillere.
   - Supabase Realtime har en grænse på omkring 1 MB pr. besked.
   - Log `JSON.stringify(city).length` i funktionen. Kommer størrelsen over ca. 600 KB, skal du skifte til en let løsning: broadcast kun `{ id, version }` på en Realtime-kanal, og lad klienten hente byen med `call('sync')`. Klienten har allerede `sync`.
   - Trim historik, hvis det bliver nødvendigt. Der er allerede lofter på de fleste lister: `hist` 24 eller 130 punkter, nyheder osv.
3. **Indhentning efter lang pause:** `advance` har et loft på 1600 skridt pr. kald. Kontrollér med `GAME_SPEED=1`, at et tick efter fx 2 døgns pause gennemføres inden for Edge Function'ens tidsgrænse.
4. **Samtidighed:** `save_city` afviser, hvis en anden har gemt imellem, og funktionen prøver igen op til 6 gange. Test med to browsere, der klikker samtidig. Begge handlinger skal lande, og ingen må gå tabt.
5. **Kun i browseren:** Disse ting gemmes kun lokalt, og det er i orden. Gør intet ved det, men nævn det i overleveringen.
   - aktiviteter (sales calls og lignende), der er i gang;
   - sammenfoldede bokse;
   - valgt fane.
6. **Kun i demoen:** Hastighedsknapperne og "reset" er skjult online (`canSetSpeed: false`). Kontrollér, at de ikke dukker op.

## Drift

- **Nulstil eller start en ny by:** `delete from cities where id = 'aurex-bay';` Næste kald opretter en ny by med den aktuelle `GAME_SPEED`.
- **Backup:** Lav et dagligt snapshot med en tabel `city_snapshots(id, state, taken_at)` og et `pg_cron`-job, der kopierer `cities.state` én gang i døgnet. Behold de seneste 14.
- **Overvågning:** Hold øje med Edge Function-logs (fejl og varighed) og `cities.updated_at`. Ligger tidspunktet mere end 30 minutter tilbage, kører cron ikke.

## Sådan ser færdigt ud

- [ ] `npm test` giver 0 FAIL.
- [ ] Vercel-URL'en åbner spillet. Man skriver et navn, får en anonym session og kommer ind i byen `aurex-bay`.
- [ ] To browsere, fx en almindelig og et privat vindue, ser hinanden på ranglisten og ser hinandens køb på kortet uden at genindlæse.
- [ ] En handling (køb af Kingside Auto Works, ansættelse af Marco, et sales call med beslutning) er der stadig efter genindlæsning.
- [ ] Byen bevæger sig, når alle browsere er lukket: uge og pengestrøm er rykket efter en times pause.
- [ ] Browseren kan ikke skrive direkte: en `update` på `cities` med anon-nøglen bliver afvist.
- [ ] `?demo=1` starter offline-demoen med bots.
- [ ] Ingen hemmeligheder i git (søg efter `service_role`, `CRON_SECRET`).
- [ ] README er opdateret med URL'er, hvordan man nulstiller byen, og hvilken `GAME_SPEED` der kører.

## Uden for scope

- Rigtige brugerkonti, betaling og flere byer.
- Ændringer i spilregler og design. Spørg Thomas, hvis noget i spillet ser forkert ud online.
- En build-pipeline. Projektet skal blive ved med at være statiske filer.
