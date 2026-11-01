# Aurex Bay Tycoon

Et idle-forretningsspil i realtid. Spillet foregår på et satellitkort over den fiktive by Aurex Bay. 1 spilår varer 1 rigtig uge. Virksomhederne tjener penge, også når man ikke spiller. Alle spillere deler samme by og samme økonomi. Man kan spille alene, i et **netværk** (hver sine virksomheder, fælles leverancekontrakter og markedsindsigt) eller i en **coop** (fælles modervirksomhed med ejerandele og afstemninger).

Byen slutter aldrig: tiden kører bare videre, og der er ingen sæsoner.

Stak: statisk webapp på **Vercel** og database, login, realtime og spilserver på **Supabase**. Der er intet build-trin.

## Mappestruktur

```
index.html                         App-skal, styling og markup
js/main.js                         Brugerfladen: kort, Empire, Market, Network og Coop
js/company.js                      Firma-dashboard med afdelinger, supplies og ordrer
js/stocks.js                       Børsen med portefølje, gevinst og tab
js/interact.js                     Møde-scener, leveringskortet og warehouse-vinduet
js/life.js                         Life-fanen: bolig, rum, samlerkort og middagsselskaber
js/web.js                          Den indbyggede browser med byens hjemmesider
js/util.js                         Fælles formatering og grafer
js/backends.js                     LocalBackend (demo i browseren) og OnlineBackend (Supabase)
js/config.js                       Supabase-URL og anon-nøgle. Tom = demo-tilstand
img/                               Kort, virksomheds-, medarbejder- og aktiebilleder
supabase/functions/_shared/        Spilmotoren og spillets indhold, delt af browser og server
  engine.js                        Tid, indtjening, World Cards, bots, coop, netværk og handlinger
  ops.js                           Drift af hver virksomhed, afdelinger, kunder, ordrer og supply-marked
  logistics.js                     Warehouses, import, forsendelser og leveringstider
  life.js                          Privatøkonomi, boliger, samlinger, auktioner, byttehandler og prestige
  content.js                       Virksomheder, medarbejdere, aktier, begivenheder, beslutninger
supabase/functions/game/index.ts   Spilserveren (Edge Function)
supabase/migrations/               Databasetabeller, adgangsregler og samtidighedskontrol
supabase/cron.sql                  Vækker byen hver time
tests/engine.test.js               Simulerer hele sæsoner uden browser
tests/orders.test.js               Ordrer, kunder, levering og warehouses
tests/life.test.js                 Bolig, samlinger, auktioner, byttehandler og prestige
```

## Sådan virker realtid og idle

- **Tiden er en funktion af uret.** Byen gemmer et tidsstempel og en hastighed, og spiltiden regnes ud fra det rigtige ur (`gameNow`). Ingen server behøver at tælle hvert sekund.
- **Catch-up ved hvert besøg.** Når nogen åbner appen eller handler, kører serveren `advance()`. Den gennemgår hver spilmåned, der er gået siden sidst: indtjening, World Cards hvert kvartal, bots, udbytte fra coops, afstemninger der lukker, og autopilot-beslutninger.
- **Ugentlige skridt.** Hver spilmåned har 4 uger. Hver uge kommer en fjerdedel af månedens produktion af båndet som færdigvarer, aktierne lukker ugen (med enkelte store hop og nyheder), råvarepriserne svinger lidt, nye kundeordrer drypper ind og rivalerne hæver deres bud i auktionshuset. Byder de over dig, får du besked. Selve månedsregnskabet (produktion, løn, lån og husleje) lukker stadig én gang om måneden. I Demo-hastighed går der ca. 6 sekunder mellem ugerne.
- **Mellem månederne er indtjeningen en jævn rate.** Klienten interpolerer saldoen, så tallene tæller op live, uden at spørge serveren.
- **Cron hver time** (`supabase/cron.sql`) holder byen i gang, så rivaler køber og begivenheder rammer, selvom ingen er online.
- **Autopilot.** Beslutninger har en frist på 2 spilmåneder, ca. 28 timer. Svarer spilleren ikke, vælger autopiloten ud fra spillerens politik: forsigtig, balanceret eller dristig.

## Virksomheder, afdelinger og supplies

Hver virksomhed producerer én gang pr. spilmåned. Processen er:

1. Supplies trækkes fra lageret efter virksomhedens opskrift i `RECIPES`. En bilfabrik bruger fx stål, aluminium, mikrochips og energi.
2. Produktionen begrænses af Operations-medarbejdere, skift, moral og lager.
3. Kundesalget afhænger af kunder, omdømme, prisniveau, teknologi og konjunktur.
4. Producenter af stål, aluminium, chips, software og medieindhold sælger overskuddet på byens marked.
5. Indkøb tager de billigste tilbud fra andre spillere og egne virksomheder. Det, der mangler, importeres dyrere.

Markedsprisen ligger mellem eksportgulvet og importloftet og bevæger sig med udbud og efterspørgsel.

Der er 8 afdelinger: Operations, Procurement, Sales, Social Media, HR, Finance, R&D og Legal & Compliance.

- Alle virksomheder starter uden ansatte, også når man køber en virksomhed fra en rival. Uden produktionsfolk kører fabrikken på 30 %, og ejeren kan selv stå ved linjen én gang om måneden og fordoble månedens output.
- En afdeling uden medarbejdere giver opgaver i To-do, fx godkend ordrer, genopfyld lager, hold teammøde eller luk regnskabet.
- Medarbejdere automatiserer afdelingen. En specialist som afdelingsleder giver +50 % automatisering og en bonus.
- Indstillingerne pr. afdeling (prisniveau, indkøbspolitik, løn, kampagner, forskningsbudget osv.) bruges til at tilpasse virksomheden til markedet.

Bots og coops kører deres virksomheder fuldt bemandet.

## Kunder, ordrer og levering

- Hver virksomhed har aktive kunder med humør (0–100). B2B (stål, chips, data, finans, pharma) har færre og mere tålmodige kunder, der giver større ordrer. B2C (biler, mode, hotel, film) har flere kunder, kortere svarfrister og mindre villighed til at forhandle (`CLIENT_RULES` i content.js).
- Hver ordre viser antal enheder, omsætning, supply-omkostning og indtjening. Man kan acceptere, afvise eller bede om +10 % / +20 %. En genforhandling giver først svar næste måned, og kunden kan annullere. En annulleret ordre kan kun arkiveres.
- Ignorerede, afviste eller for sene ordrer sænker kundens humør. Under 25 forlader kunden virksomheden.
- Accepterede ordrer leveres på et interaktivt kort, hvor man skal trykke på den rigtige kunde. Med Sales-medarbejdere sker det automatisk.

## Interaktive beslutninger og firmavæg

Opgaver som teammøde, salgsopkald, kampagne og regnskab åbner en scene på ca. 20 sekunder med kollegernes kommentarer i talebobler og slutter med en beslutning (`INTERACTIONS` i content.js, `js/interact.js`). Øverst på firmasiden ligger en væg, som ejeren og coop-partnerne kan skrive på.

## Warehouses og logistik

Der er 5 warehouses på kortet (`WAREHOUSE_SITES`). Lufthavnens Cargo Terminal har den største kapacitet og den hurtigste import (2 dage), men koster 5 % mere. Containerhavnen er 18 % billigere, men importen tager 20 dage. Ridgeway Haulage (tog og lastbiler) og vejdepotet ligger midt imellem.

- Import ind på lageret, afsendelse med lastbil til egne virksomheder (tiden afhænger af afstanden på kortet) og eksport til eksportgulvet.
- Automatik kræver en logistikspecialist (Carlos Mendoza, Logistics Planner). Uden ham foregår import, afsendelse og eksport manuelt. Med ham kan lageret automatisk importere et antal måneders forbrug og forsyne dine virksomheder, og Procurement kan sættes til "My warehouses first".
- Forsendelser følges i hver virksomheds Deliveries-boks og på leveringskortet (`logistics.js`); bykortet viser ingen trafik. Billedprompts til afdelings-headerne ligger i `img/DEPARTMENT-PROMPTS.md`.

## Life: privatliv, bolig og samlinger

Life-fanen er spillerens private side. Pengene her er adskilt fra virksomhedernes kasse.

- **Bank (Harbor Trust, `harbortrust.ab`).** Den private økonomi styres i en netbank i spillets browser: oversigt, kontoudtog med alle posteringer, overførsler (udbytte fra imperiet, indskud i imperiet og opsparing med rente), løn og skat, boliglån med ekstraordinære afdrag og et budget. Fanen hedder **Personal**.
- **Konto.** Penge kommer ind via løn fra imperiet (progressiv skat 30/45/52 %), udbytte (27 % skat), husleje fra udlejede boliger og museumsgebyrer. Penge går ud til fællesudgifter, ejendomsskat, vedligehold, renter og afdrag på lån, livsstil og forsikring/vedligehold af samlinger. Går walletten i minus, udbetales automatisk et beskattet udbytte fra imperiet.
- **Boliger** (`HOMES`). Der er 5 bygninger på kortet med et begrænset antal lejligheder i hver. Man køber med 20 %, 50 % eller 100 % udbetaling og et 30-årigt lån med variabel rente, der følger konjunkturen. Værdien følger bydelen og økonomien. Man kan flytte, udleje, indfri lånet eller sælge med 3 % salær.
- **Rum styrer samlingerne.** Kunst kræver gallerivægge, vin kræver vinkælder, ure kræver et urskab og biler kræver garage. Old Grid Loft har galleri og urskab, kan få en vinvæg og har ingen garage. Rum kan installeres og udvides, og det øger boligens værdi.
- **Samlerkort** (`COLLECTIBLES`). Der er 34 fiktive værker, vine, ure og biler i 4 sjældenhedsgrader og et begrænset antal eksemplarer i byen. Værdien følger et markedsindeks pr. kategori, objektets egen udvikling og for vin en modningskurve med et topår. Komplette sæt (`SETS`) giver ekstra værdi og prestige.
- **Handel.** Man kan købe i auktionshuset (Vickrey-bud, der lukker månedligt, 10 % salær for køber og sælger, og rivaler byder med), købe hos forhandleren (+15 %) og sælge til forhandleren (−20 %). Man kan også sætte egne objekter på auktion, bytte med andre spillere (rivaler siger ja, hvis de får ca. 5 % mere), give objekter til andre spillere, låne kunst ud til museet eller donere til museet mod 30 % skattefradrag og varig prestige.
- **Middagsselskab** (én gang om måneden). Man åbner en kasse vin og inviterer gæster. Kunder giver bedre humør i alle virksomheder, bankfolk giver lavere rente i 12 måneder, og samlere giver et privat tilbud under markedspris. Bedre vin giver større effekt.
- **Prestige** (`PRESTIGE_TIERS`). Prestige kommer fra boligen, samlingen, sæt, livsstil og donationer. Hvert niveau giver −0,5 procentpoint på bankrenten, +2 i humør hos nye kunder og +1 Influence om året, som tæller med på ranglisten. Episke og legendariske lots kræver et vist niveau. Personlig formue tæller med i net worth.

### Byens internet

Auktioner, forhandlere og boligannoncer ligger i en browser i spillet, inspireret af GTA V. Den åbnes med globus-knappen i topbaren, fra Life-fanen eller fra boligerne på kortet. Browseren har adresselinje, frem og tilbage, bogmærker og en søgeportal, og hver side har sin egen grafiske identitet:

| Adresse | Side |
|---|---|
| `baylink.ab` | Søgeportal med nyheder, børsen og vejret |
| `aurexauctions.ab` | Aurex & Co. auktionshus: aktuelt salg, lot-sider med bud, resultater og indlevering |
| `kestrelvey.gallery` | Kunsthandel |
| `cellardoor.wine` | Vinhandel |
| `hourandhand.ab` | Urforhandler |
| `coastlineclassics.ab` | Klassiske biler |
| `bayhomes.ab` | Boligannoncer med galleri og lånberegner |
| `aurexgazette.ab` | Byens avis |

Hver forhandler har op til 3 objekter på lager og siderne "Collectors" (byd på andres objekter) og "Sell to us". Nye sider tilføjes i `SITES` i `js/web.js`.

Billedprompts til boliger og samlerkort ligger i `img/LIFE-PROMPTS.md`. Filnavne: `h<n>-<rum>.jpg` til boliger og `x-<id>.jpg` til kort.

## Fragt og leveringer

Alt, hvad spillere køber af supplies, og alt, hvad de eksporterer, sendes med et af tre fiktive fragtselskaber (`CARRIERS` i content.js, `freight.js`):

| Selskab | Tid (import) | Pris | Risiko | Partnerterminal |
|---|---|---|---|---|
| **Bolt Air Express** | 2–3 dage | 12 % af godsværdien + gebyr | Næsten aldrig forsinket, fuldt forsikret | Airport Cargo Terminal: halv tid, 30 % billigere |
| **Ridgeway Haulage** | 6–9 dage | 5 %, −25 % ved over 500 enheder | 12 % forsinkes 2–4 dage, lille skaderisiko | Egen terminal (W3, Ironport): hurtigere og 20 % billigere |
| **Harborline Shipping** | 16–24 dage | 2 % | 30 % forsinkes 4–10 dage, 15 % får 4–12 % skadet gods | Harbor Row Container Port: aldrig forsinket, 20 % billigere |

- Køb fra andre spillere i byen tager en kortere lokal rute til 40 % af prisen.
- Fragt betales ved booking. Eksportindtægter udbetales først ved levering.
- Indkøb er manuelt: hver supply bestilles for sig med valgt mængde og fragtselskab. Knapperne "fyld op for 1–3 måneder" og automatisk genbestilling findes kun, når Procurement er 100 % automatiseret, og den bruger fragtselskabet fra afdelingens indstillinger.
- Hver virksomhed har sin egen boks **Deliveries** på firmasiden (under indkøb), der viser virksomhedens sendinger med status (Picked up, In transit, Delayed), fremdrift og ETA samt de seneste leveringer med forsinkelser og skader.
- Hvert fragtselskab har sin egen hjemmeside i browseren (`boltexpress.ab`, `ridgeway.ab`, `harborline.ab`) med priser, statistik og sporing.
- Bots og coop-virksomheder får stadig leveret med det samme.

## Specialister som marked

Der er 21 navngivne specialister fordelt på 7 roller (Finance, R&D, Social Media, Legal, HR, Logistics og Sales) med 1–5 stjerner (`TALENT` i content.js, `talent.js`). Hver specialist arbejder for én tycoon ad gangen, og man kan have én pr. rolle.

- **Kontrakt.** Man hyrer en fri agent med signing fee, løn og 1–4 års kontrakt. I det sidste år kan kontrakten genforhandles. Udløber den, bliver specialisten fri agent.
- **Stress** stiger, når de leder en afdeling, mest i store virksomheder og i afdelinger med for få medarbejdere. Over 90 brænder de ud og er sygemeldt i 2 måneder. En ferie giver −45 stress.
- **Kedsomhed** stiger hver måned og mest, når de ikke leder noget. En ny udfordring (projekt) eller en ny virksomhed at lede nulstiller den.
- **Tilfredshed** følger løn i forhold til markedet, stress og kedsomhed, og den falder, når ejeren er væk. Under 22 siger de op med 2 måneders varsel. Lønforhøjelse, bonus eller mindre arbejdspres kan få dem til at blive.
- **Erfaring.** Specialister der leder en afdeling vokser i stjerner over tid. Det giver mere automatisering som leder, men også højere lønkrav.
- **Transfers.** På `apextalent.ab` i browseren kan man se frie agenter, alle specialister i byen, udløbende kontrakter og egne bud. Man kan scoute en rival (afslører tilfredshed og stress) og byde et transfergebyr plus løn. Rivaler svarer med det samme. Spillere har 2 måneder til at svare, og er de væk og specialisten utilfreds, kan specialisten bruge sin frikøbsklausul. Egne specialister kan sættes på transferlisten.

## Inaktivitet og fjendtlige overtagelser

Har en spiller ikke gjort noget i 4 spilmåneder, regnes vedkommende som væk (`TAKEOVER` i content.js). En virksomhed er beskyttet, hvis den har en Legal-leder, eller hvis både Operations og Sales er mindst 80 % automatiseret. Ubeskyttede virksomheder hos en fraværende ejer kan rivaler og andre spillere byde på. Bliver buddet ikke afvist inden for 2 måneder, skifter virksomheden ejer til budprisen (værdi justeret for omdømme). Firmaoversigten viser, om hver virksomhed er beskyttet.

## Aktiekurser i realtid

Mellem ugelukningerne bevæger kurserne sig i 28 små skridt (`priceAt` i engine.js). Bevægelserne er en tilfældig gang, der beregnes ud fra tiden, så server og browser altid viser og handler til samme kurs. Hver uge lukker fra den sidste livekurs, så der ikke kommer spring. Børsen og markedet opdateres cirka hvert sekund.

## Bykortet: by og distrikter

Kortet har to niveauer. Niveau 1 er hele Aurex Bay oppefra (`img/map.jpg`, 1448×1086) med de otte distrikter som klikbare zoner; hover viser et kort med distriktets virksomheder, warehouses og boliger. Klik flyver ind i distriktet (niveau 2), hvor alt vises som simple pins: virksomheder (gul = til salg, blå = ejet, lilla = coop, grøn = din), warehouses (turkis firkant) og boliger (pink). Hover på en pin viser bygning, ejer, pris/værdi og indtjening; klik åbner den. På touch viser første tryk kortet med en Open-knap.

- Distrikter ligger i `DISTRICTS` i `content.js`: `box` er distriktets område på bykortet; `img`, `w`, `h` er et valgfrit eget distriktsbillede (`img/dist-<id>.jpg`). Alle otte distrikter har eget billede; et distrikt uden billede viser et udsnit af bykortet. Billederne vises i deres egen opløsning, mens bykortet beholder de logiske mål 1448×1086 (billedet må gerne være større i samme 4:3-format).
- Alle placeringer (virksomheder, warehouses, boliger) har `d` (distrikt) og `p` ([x, y] som brøkdele af distriktsvisningen); `placeOn()` regner bykoordinater ud. `migrateMap` flytter gamle byer (`city.mapV = 4`).
- `cropStyle()` i `js/util.js` laver billedudsnit til kort, warehouse-headere og boliger ud fra samme data.

## Startere i Ironport

- Warehouse W3 i Ironport er Ridgeway Haulage (fragtselskabets egen terminal, billede `img/w-ridgeway.jpg` via `img` på `WAREHOUSE_SITES`). Ridgeway-fragt til W3 er hurtigere og 20 % billigere.
- Kazen Motors (`dealer`, L11, Medium, 9 M) erstatter bilfabrikken i Ironport: synergi med Car Factory og Auto Repair, ingen Trade i recession.
- Aurex Bank (`bank`, L15, Small, 5,5 M) erstatter Finance & Banking i Ironport: −0,5 point rente på dine banklån, −0,5 M YPI i recession.
- Ground Café (`restaurant`, L29, 2 M): +0,2 M YPI for hver anden virksomhed, du ejer i samme distrikt (max 3). −0,3 M YPI i recession.
- Specialister kan have egen baggrund og egen evne (`bio` og `passive` på TALENT-posten); afdelingen husker hvem der leder den (`dept.who`). Rohan Mehta (Sales Executive): +15 % efterspørgsel som salgschef, +0,4 M YPI hos en bilforhandler. Dario Russo (General Manager): recession og krise skærer ikke i efterspørgslen, når han leder Operations.
- Mack Brennan (Junior Logistics Operator) er en billig person i Logistics-rollen (`kind: 'carlos'`, `role` og `pay` på TALENT-posten ændrer titel og løn).

### Kingside Auto Works og Marco Vitale

- `autorepair` (Auto Repair) er en billig starter-type (`starter: true`): Kingside Auto Works i Ironport (L28, Small) koster 2,5 M og tjener ca. 0,9 M om året. Trade påvirkes ikke af recession, men får heller ikke boom-bonus. Bots køber aldrig starter-virksomheder.
- Marco Vitale (Workshop Chief, rating 2) er en billig specialist (`starter: true` i `TALENT`), som bots ikke ansætter. Rollen `marco` leder Operations (+10 % output) og giver +0,4 M YPI i en autoværksted- eller bilvirksomhed. Dana Kowalski og Viktor Hale er dyrere i samme rolle.
- Virksomheder kan have et eget navn (`title` på listingen); `lname()` i `js/util.js` viser det.
- Virksomheds- og specialistkort bruger "dossier"-stilen (`.sheet.dz` i index.html): mørkt kort, stort foto, nøgletal i felter.

## Regnskab pr. virksomhed

Hver virksomhed har et Accounts-afsnit med resultatopgørelse for sidste måned, 3 eller 12 måneder: omsætning (kundesalg, salg af supplies, kontraktindtægt/YPI), omkostninger (supplies, fragt, løn, afdelingsbudgetter, specialister, vedligehold), driftsresultat og margin, sammenligning med forrige periode, nøgletal (produceret, gennemsnitspris, enhedsomkostning, årstakt) og en måned-for-måned-tabel.

## Kør demoen lokalt

```bash
npx serve .            # eller: python3 -m http.server
npm test               # simulerer 10 år og tester ordrer, warehouses, Personal og specialister
```

Med tom `js/config.js` kører hele byen i browseren med 9 bot-spillere og gemmes i localStorage. Hastigheden kan skiftes i topbaren: Live (1 år/uge), Fast (1 år/time) og Demo (1 år/5 min).

## Sæt det online (multiplayer)

Kommandoerne kan køres i Claude Code.

1. **Supabase-projekt**
   ```bash
   npm i -g supabase
   supabase login
   supabase init                       # hvis mappen ikke allerede er linket
   supabase link --project-ref <PROJECT-REF>
   supabase db push                    # opretter tabellerne fra supabase/migrations
   ```
2. **Slå anonymt login til**, så spillere ikke skal oprette en konto: Dashboard → Authentication → Sign In / Providers → *Allow anonymous sign-ins*.
3. **Deploy spilserveren**
   ```bash
   supabase secrets set CRON_SECRET=$(openssl rand -hex 24) GAME_SPEED=1
   supabase functions deploy game --no-verify-jwt
   ```
   Funktionen tjekker selv spillerens session. `GAME_SPEED=1` betyder 1 spilår pr. uge. Brug fx `168` til en hurtig testby.
4. **Cron:** Gem først project-URL og CRON_SECRET i Vault (kør i SQL-editoren, commit aldrig værdierne):
   ```sql
   select vault.create_secret('https://<PROJECT-REF>.supabase.co', 'aurex_project_url');
   select vault.create_secret('<CRON-SECRET>', 'aurex_cron_secret');
   ```
   Kør derefter `supabase/cron.sql` uændret. Den tikker byen hvert kvarter.
5. **Forbind frontenden:** Udfyld `js/config.js` med `SUPABASE_URL` og `SUPABASE_ANON_KEY` (Dashboard → Project Settings → API).
6. **Vercel**
   ```bash
   npm i -g vercel
   vercel            # første gang: vælg "Other" som framework, ingen build-kommando, output = .
   vercel --prod
   ```

## Live-drift

| | |
|---|---|
| Spil (Vercel) | _udfyldes efter deploy_ |
| Offline-demo | `<vercel-url>/?demo=1` (altid lokal by med bots, mærket "Offline demo") |
| Supabase-projekt | _udfyldes_ (region EU Frankfurt) |
| `GAME_SPEED` | `1` (1 spilår pr. rigtig uge) |

- **Nulstil byen:** `delete from cities where id = 'aurex-bay';` Næste kald opretter en ny by med den aktuelle `GAME_SPEED`.
- **Backup:** `city_snapshots` får et snapshot kl. 03:30 UTC hver nat (pg_cron-job `aurex-city-snapshot`), de seneste 14 beholdes. Gendan med `update cities set state = (select state from city_snapshots where id='aurex-bay' order by taken_at desc limit 1), version = version + 1 where id='aurex-bay';`
- **Overvågning:** Edge Function-loggen skriver én linje pr. gemning med `bytes` (bystørrelse) og `ms`. Over 600 KB logges en advarsel: så skal Realtime skifte til at sende `{ id, version }` og lade klienten kalde `sync`. Er `select updated_at from cities` mere end 30 minutter gammel, kører cron ikke.
- **Kun i browseren** (gemmes ikke på serveren, bevidst): igangværende aktiviteter som sales calls, sammenfoldede bokse og valgt fane.

## Datamodel og skalering

Prototypen gemmer hele byen som ét JSON-dokument i `cities.state`, ca. 15 KB med 10 spillere. Det giver én sandhed, atomiske handlinger og den samme motor i demo og online. Edge Function'en skriver med optimistisk samtidighed (`save_city` med versionsnummer) og prøver igen ved konflikt. Det holder til et par hundrede spillere pr. by.

Næste skridt, når spillet skal skaleres:

- Normaliser `players`, `listings`, `holdings`, `contracts` og `offers` til egne tabeller.
- Kør catch-up pr. spiller i stedet for pr. by.
- Lad cron-jobbet afvikle verdensbegivenheder og bots.
- Shard spillere i flere byer (fx 300 pr. by).

## Spilindhold

Alle virksomheder, medarbejdere, aktier, World Cards og beslutninger ligger i `supabase/functions/_shared/content.js`. Nye kort tilføjes ved at udvide listerne og lægge et billede i `img/`. Navngivning: `c-<type>.jpg` til virksomheder, `s-<id>.jpg` til medarbejdere og `k-<id>.jpg` til aktier.
