# FasalNyay

A kiosk app that tells a farmer **why** their crop insurance claim was approved,
sent for review, or not approved — and lets them contest it.

Built for a Trustworthy AI assignment. The point is not that the system decides,
but that it shows what it knows, where that knowledge came from, where it is
uncertain, and how to push back.

## Run it

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run test:engine
```

`test:engine` checks the decision rule against the three worked examples and
against the properties the rule is supposed to guarantee.

## The idea

Crop insurance normally treats the nearest weather station as fact. If the
station says it did not rain enough, the claim dies — even when the station sits
20 km from the field and sat under a different sky.

FasalNyay asks a different question. Not *"did it rain?"* but **"how much should
this particular measurement count as a description of this particular field?"**

Distance never approves or rejects anything. It sets the **weight** of the
rainfall reading. A low-weight reading pulls confidence down, and low confidence
means the system stops deciding and hands the case to a person.

You can watch this happen. On the "Why did I get this result?" screen there is a
slider that moves the weather station and re-runs the exact same rule with only
that one number changed.

## How the decision is made

Two sources are scored against what the farmer reported. Each gets an
**agreement** in the range −1 (flatly contradicts them) to +1 (fully supports
them).

| Source | What it measures | Distance discount? |
| --- | --- | --- |
| Weather station | Rainfall vs. the policy trigger for that crop and peril | **Yes** — it may be describing a different place |
| Satellite | Vegetation stress on the insured plot vs. the reported extent | **No** — it images the field itself |

That asymmetry is the whole design. Both readings can be wrong, but only one of
them can be wrong *about the wrong place*.

**Station reliability** falls from 1.0 to a floor of 0.15:

```
reliability = clamp(1 − (distance_km − 5) / 22, 0.15, 1.0)
```

Within 5 km the reading counts fully. At 21 km it counts for about a quarter. It
never reaches zero — a distant reading is weak evidence, not no evidence.

Weights, then the weighted agreement:

```
weight_weather   = 0.55 × reliability
weight_satellite = 0.45
score            = weighted mean of the two agreements     // −1 … +1
```

**Confidence** combines how much evidence we hold with how strongly it leans,
minus a penalty when the two sources point opposite ways:

```
coverage   = 0.42 + 0.58 × (weight_weather + weight_satellite)
confidence = coverage × (0.52 + 0.44 × |score|) × (1 − 0.45 × conflict)
```

Capped at **0.95**. The system never claims certainty.

**The verdict** then follows:

| Condition | Result |
| --- | --- |
| confidence ≥ 0.75 and score ≥ +0.30 | ✅ Approved |
| confidence ≥ 0.75 and score ≤ −0.30 | ❌ Not approved |
| anything else | ⚠️ Needs review — a person decides |

The 0.75 gate is drawn on the confidence meter in the UI, so a farmer can see
how close their case came to being decided automatically.

Every constant lives in `PARAMS` in [assess.ts](src/engine/assess.ts). There are
no other magic numbers.

### What this buys you

Same contradicting evidence, one number changed:

| Station distance | Verdict | Confidence |
| --- | --- | --- |
| 2 km | ❌ Not approved | 95% |
| 21 km | ⚠️ Needs review | 74% |

The evidence still points the same way. Only the trust in it moved.

### A tension worth knowing about

The rule is **symmetric**: low reliability lowers confidence in both directions.
So a distant station can also stop a *well-supported* claim from being approved
automatically, sending a deserving farmer to human review instead of paying them
straight away. Try farmer `FRM-20551` (Farrukhnagar, 21 km) — both sources back
the farmer, and it still goes to review at 73%.

That is honest, but it costs the farmer time. If you would rather uncertainty
never worked against them, make the gate one-sided: require high confidence to
**reject**, but let a positive score approve at a lower bar. That is a values
decision, not a maths one, so it has been left as the spec describes it.

## Structure

```
src/
  engine/
    assess.ts       the decision rule — every constant, no UI
    explain.ts      turns the numbers into farmer-readable sentences
    assess.test.ts  scenario + property checks
  data/registry.ts  farmers, villages, crops, station distances, evidence
  i18n/             en + hi dictionaries, typed against the English keys
  screens/          intake → claim → outcome, one file per phase
  components/ui.tsx shared kiosk widgets
```

The explanation is generated from the same numbers the verdict was computed
from, so the words cannot drift away from the arithmetic.

## Kiosk constraints

Shared village screen, so: nothing under 18px, no touch target under 64px, one
question per screen, no typing except the Farmer ID. Every screen carries a
footnote saying why the app is asking. Status is never colour alone — each
verdict chip pairs an icon with words.

## Language

Hindi and English are complete. The other five in the picker are listed but
disabled — showing an untranslated language as available would be a worse
failure than showing it as pending. `hi.ts` is typed as
`Record<TKey, string>`, so a missing Hindi key is a build error.

## Demo controls

The ⚙ button pins the weather and satellite readings to one of the three worked
examples from the design document, so each outcome can be shown on demand. The
verdict is still computed by the engine — never hard-coded.

Demo farmer IDs: `FRM-10284` (Rampur, 4 km), `FRM-20551` (Farrukhnagar, 21 km),
`FRM-33417` (Sohna, 17 km).

## Not built

Real IMD station feeds and Sentinel-2 NDVI — `collectEvidence` generates
readings deterministically from the claim instead. No backend, so a case ID only
survives the session that created it. Card scanning is simulated.

## Changes from the design document

- **Screen 13C** showed 78 mm against a 60 mm requirement for a *too much rain*
  claim, then concluded the rainfall condition was not met. 78 > 60 supports the
  farmer. The example now uses 18 mm, which makes the rejection follow from the
  evidence.
- **Screen numbering** had two Screen 3s and two Screen 4s. Renumbered.
- **Policy name** was `PMFBY` on the confirm screen and `PBKY` in the summary.
  Now `PMFBY` throughout.
