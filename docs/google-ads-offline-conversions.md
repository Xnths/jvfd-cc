# Google Ads — Complete Configuration Record
**Campaign:** Online - advanced  
**Advertiser:** João Vitor Fernandes Domingues — psicologojoaofernandes.com  
**Last updated:** 2026-02-27

---

## 1. Account Settings

### Auto-tagging
Admin (gear icon) → Account settings → Auto-tagging → **Enabled**

Without this, no click generates a GCLID and offline conversion import does not work.

---

## 2. Campaign Settings

### Campaign: Online - advanced
- **Status:** Active
- **Type:** Search
- **Budget:** R$300/day
- **Bidding strategy:** Maximize Conversions
  - Do NOT switch to Target CPA until 30+ `Consulta Marcada` conversions are accumulated in 30 days

### AI Max
**Disabled.** AI Max was causing the campaign to serve for local intent queries nationwide (e.g. `psicólogo indaiatuba`, `psicologo em niterói`, `terapeuta rj`). Users from those cities contacted João and rejected him because he is not local. Disabling AI Max restricts serving to the configured keywords only.

### Geographic targeting
Configured for online service. Recommended restriction: São Paulo + major capitals (RJ, BH, Brasília, Curitiba, Porto Alegre) where online therapy adoption is higher.

### Conversion goal (campaign-level)
Campaign → Settings → Conversions → **"Choose conversion actions for this campaign"** → select only `Consulta Marcada`

Do NOT use "Account-level conversions" — that would include all conversion actions and confuse Smart Bidding.

---

## 3. Keywords

### Active keywords

| Keyword | Match type |
|---|---|
| `terapia particular online` | Exact |
| `psicólogo particular online` | Phrase |
| `clínica de psicologia online` | Phrase |
| `marcar psicólogo online` | Exact |
| `agendar psicólogo online` | Phrase |
| `agendar terapia online` | Exact |
| `marcar psicoterapia online` | Exact |
| `psicólogo online particular` | Exact |
| `psicólogo comportamental online` | Phrase |
| `marcar consulta psicólogo online` | Phrase |

### Paused keywords
- `terapeuta de relacionamento` — broad match, low conversion rate
- `clínica de psicologia online` — monitor: 0 conversions for two weeks, then 1 conversion on 2026-02-26. Keep active and reassess in 3 days.

---

## 4. Negative Keywords

### Platform / competitor navigational intent
```
psymeet
terappy
telavita
conexa saude
psicologia viva
vittude
zenklub
cliniqore
central psicologia
doctoralia
fepo
psicofono
psiharmonia
mindee
cade meu psi
psymet
psy met
clinica prisma
clinica casule
clinica desenvolviver
equilibrium clinica
aptho
socialpsicoafro
```

### Platform-intent (want to use/join a platform, not hire)
```
plataforma psicologia
plataforma de atendimento
plataforma de psicologia
plataforma de psicologos
plataforma para atendimento
plataformas de terapia
plataforma conexa
site psicologo
site para psicologo
site de psicologia
site de terapia
site de psicologia online
site psicologos online
sites de psicologos
sites de psicologia
```

### Price-incompatible
```
30 reais
convênio
plano de saude
hapvida
iamspe
prevent senior
medprev
```

### Wrong service / wrong patient
```
infantil
hospital psiquiatrico
neuropsicologia
avaliação psicológica
avaliação neuropsicológica
```

### Local intent — nationwide cities (user wants in-person, not online)
```
nova iguaçu
indaiatuba
piracicaba
são vicente
fortaleza
salvador
ribeirão preto
ribeirão das neves
curitiba
sorocaba
registro sp
jacarei
taguatinga
atibaia
lagoa santa
duque de caxias
sobradinho
franco da rocha
porto alegre
brasília
mogi das cruzes
sete lagoas
campo grande
guarulhos
niterói
santos
santo andre
sjc
rio preto
betim
ceilandia
itaquaquecetuba
itapevi
piraju
batatais
arujá
pinheiros
florianópolis
peruibe
suzano
praia grande
guarujá
barretos
sao carlos
americana
abc
embu das artes
mogi guaçu
jales
osasco
norte shopping
rio das ostras
artur nogueira
pinhais
```

### Proximity expressions
```
perto de mim
near me
próximo
zona leste
zona norte
zona sul
zona oeste
lapa
```

### Named competitors
```
enias costa
neide pallone
anahy d amico
thales caldonazo
claudia borges silva
beatriz tavares vieira
leonardo peixoto paternostro
simone rinaldi
marcirio calsavara teixeira
jhonatan pereira tenorio
```

### Generic informational intent (no purchase intent)
```
o que é terapia
o que e bom para ansiedade
o que fazer para passar a ansiedade
o que fazer quando a pessoa está com crise de ansiedade
qual medico trata ansiedade
exercícios para ansiedade
síndrome do pensamento acelerado
diagnóstico da ansiedade
diagnóstico de ansiedade
ansiedade e depressão
burnout
esgotamento mental
cansaço mental
falta atenção e concentração
terapia dialética comportamental dbt
cvv whatsapp
```

---

## 5. Demographics

### Household Income
- Bottom 50% (unknown): **Excluded**
- Reason: users in this segment contacted João and did not respond after hearing the R$350 price.

### Age
- 18–24: bid adjustment **−20%**
- Reason: overrepresented in impressions relative to expected purchasing power for R$350 private consultation.

### Device
- Mobile: bid adjustment **−25%**
- Reason: 63% of spend, lower conversion rate for considered-purchase services.

### Search Partners
- Status: **Excluded** or bid adjustment **−100%**
- Reason: abnormally low CPC (R$1.31 vs R$4.66 on Google Search) indicates low-quality inventory with no visible conversion benefit.

---

## 6. Conversion Actions

### Primary conversion: `Consulta Marcada`

| Setting | Value |
|---|---|
| Category | Purchase |
| Value | R$350 |
| Count | One |
| Click-through conversion window | 30 days |
| Attribution model | Last click |
| Primary / Secondary | **Primary** |
| Source | Offline — CSV upload (legacy) |

This is the only conversion the Smart Bidding algorithm optimizes toward.

### Secondary conversions (reporting only, do not influence bidding)

| Name | Category | Value |
|---|---|---|
| `Clique WhatsApp` | Contact | R$0 |
| `Lead Qualificado` | Lead | R$0 |

---

## 7. Offline Conversion Import — Weekly Workflow

The system captures the GCLID (Google Click ID) at the moment the visitor clicks the WhatsApp button. João updates the lead status in the Payload admin panel. A CSV is exported and uploaded to Google Ads weekly.

### Step 1 — Mark conversions in Payload admin
1. Go to `https://psicologojoaofernandes.com/admin`
2. Advertising → Leads (sorted by `Clicked at`, descending)
3. Find the lead by approximate click time
4. Change status: `Clicked` → `Qualified` (sent message) or `Converted` (booked consultation)
5. Save — `Converted at` is set automatically

### Step 2 — Export CSV
Download from browser (must be logged in as admin):
```
https://psicologojoaofernandes.com/api/leads/export
```
With date filter:
```
https://psicologojoaofernandes.com/api/leads/export?since=2026-02-24
```

Expected CSV format:
```
Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency
Cj0KCQjw...,Consulta Marcada,2026-02-25 14:30:00+0000,350,BRL
```

### Step 3 — Upload to Google Ads
Goals → Conversions → Uploads → **+** → Select file → Apply

Processing takes up to 3 business days. Conversions are attributed retroactively to the original click date.

### Rules
| Rule | Value |
|---|---|
| Maximum import deadline | 90 days after click |
| Recommended frequency | Weekly (every Monday) |
| Duplicate handling | Google ignores already-imported GCLIDs automatically |
| "No matching click" error | User came from organic/direct — no GCLID, discard that row |

---

## 8. Smart Bidding Learning Phase

| Condition | Action |
|---|---|
| < 30 `Consulta Marcada` conversions / 30 days | Keep **Maximize Conversions** |
| ≥ 30 `Consulta Marcada` conversions / 30 days | Switch to **Target CPA**, set initial target at historical average cost per booked consultation |

Do not switch bidding strategy during the learning phase — it resets learning and doubles the data acquisition cost.

---
