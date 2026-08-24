# Discover — companies with no reachable ATS board

Generated 2026-08-13 by `node tools/discover-sources.js`.

These companies were probed against all seven supported ATS types (Greenhouse, Ashby, Lever,
Recruitee, Personio, Workable, SmartRecruiters) using generated slug variants and any known
aliases, and no board returned real postings. They are **not** in `discover-config.json`.

Most run their careers page on their own site or on an ATS with no public JSON endpoint
(Workday, SuccessFactors, in-house). Reaching them needs a different route, not a better slug —
Adzuna and StepStone are the natural next step for the German-market names here.

A "miss" is not permanent: a company that adopts a supported ATS later will be picked up by the
next validation run. Re-run the script to refresh this list.

## Named targets worth calling out

| Company | Why it's missing |
|---|---|
| **Zalando** | Own careers site (jobs.zalando.com). Dream-tier target — worth covering via Adzuna/StepStone. |
| **Tricentis** | Own careers site. Named quality-tooling target. |
| **BrowserStack** | Own careers site. Named quality-tooling target. |
| **LambdaTest** | Own careers site. Named quality-tooling target. |
| **Perfecto** | Rolled into Perforce; no standalone public board. |
| **Deel** | Its Ashby board (`ashby:deel`) answers 200 with zero postings — removed from the config as dead. |
| **Scalable Capital** | `workable:scalable` is "The Scalable Company", an Austin consultancy. Blocklisted, and no real board found. |

## Covered after all — recorded here because a wrong slug was rejected first

These looked unreachable during probing but a different slug served the genuine board. They
**are** in `discover-config.json`.

| Company | Wrong slug (blocklisted) | Real board now in use |
|---|---|---|
| **Wise** | `greenhouse:wise` — a Cleveland, Ohio sales company | `smartrecruiters:wise` (421 postings, London/Budapest) |
| **Remote.com** | `greenhouse:remote` — "SEI Instructor Lead", New York | `greenhouse:remotecom` (224 postings) |
| **Vercel** | `ashby:vercel` — dead, 200 with zero postings | `greenhouse:vercel` (83 postings) |

## Berlin / DACH (54)

- _no board on any supported ATS_: Ableton, About You, Ada Health, Agile Robots, Beekeeper, Blinkist, Bolt, Bryter, Coachhub, Digitec Galaxus, Dott, Dynatrace, Gorillas, Idealo, Jobvalley, Jodel, Kaufland, Klara, Klarna, Kleinanzeigen, Kontist, Kry, Lieferando, Lilium, Localyze, Mambu, Medwing, MyToys, Native Instruments, Numbrs, Otto, Planted, Quantum Systems, Remote Bird, Ricardo, Sana Labs, Sastrify, Scalable Capital, Sennder, Sherpany, Signavio, SoundCloud, Taxfix, Tier Mobility, Volocopter, Wefox, Xing, Yokoy, Zalando, Zolar
- _Personio shared demo board (not a real careers board)_: Adverity, Ecosia, Momox, Smava

## EU-remote / English-first (40)

- _no board on any supported ATS_: Aiven, Auth0, Automattic, Booksy, Brainly, Canonical, Celtra, Checkout, Chronosphere, Deel, Doist, DuckDuckGo, Fly, Grammarly, Grid Dynamics, HashiCorp, Hotjar, Instana, Kahoot, Kilo Health, Loom, Netdata, Podium, Pulumi, Ramp Network, Revolut, Siteimprove, Snyk, SoftServe, Spacelift, Strapi, Supermetrics, Templafy, Timescale, Tink, Toggl, Unity, Vinted, Vivino, Zendesk

## Quality & test tooling vendors (25)

- _no board on any supported ATS_: Allure, Autify, BrowserStack, Checkmarx, Codacy, Codecov, Contrast Security, DeepSource, Diffblue, Eggplant, Functionize, Katalon, LambdaTest, Launchable, Perfecto, ProdPerfect, Qase, Rainforest QA, Sealights, Speedscale, Steadybit, Testim, TestRail, Tricentis, Xray

## Point Nine portfolio (11)

- _no board on any supported ATS_: Castor, Chainalysis, Factorial, Gitpod, Klaus, Loom, Petlab, Recruitee, Sastrify, Silverfin, Spendesk

## Cherry portfolio (5)

- _no board on any supported ATS_: Cluno, Flomatika, Infarm, Metaphysic, Rows

## Project A portfolio (11)

- _no board on any supported ATS_: Ambient, Fincite, Fixfirst, Homelike, Nuvo, Pactum, Roadsurfer, Sennder, Spryker, Vitrue Health, Voi

## HV Capital portfolio (4)

- _no board on any supported ATS_: Cluey, SpotMyMachine, Sunhero, Xentral

## Earlybird portfolio (9)

- _no board on any supported ATS_: Compaion, Crossengage, Datasaur, Fernride, Fraugster, Movinga, Nect, Nuri, Tsenso

## Creandum portfolio (7)

- _no board on any supported ATS_: Airtame, Anyfin, Budbee, Depop, Juni, Sana, Tibber

## Previously configured (1)

- _no board on any supported ATS_: Deel

