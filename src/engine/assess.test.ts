import { assess, stationReliability } from './assess';
import type { Evidence, Extent, Peril } from '../types';

let failures = 0;
const check = (label: string, cond: boolean, detail = '') => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
};

const ev = (rain: number, stress: number, dist: number): Evidence => ({
  rainfallMm: rain,
  requiredMm: 60,
  vegetationStressPct: stress,
  stationName: 'Gurugram AWS',
  stationDistanceKm: dist,
  windowLabel: 'last_7_days',
});

const run = (peril: Peril, extent: Extent, e: Evidence) =>
  assess(peril, extent, e, 11000, 2.4);

const pct = (n: number) => `${Math.round(n * 100)}%`;

console.log('\n--- Canonical scenarios from the spec ---\n');

const approved = run('excess_rain', 'most', ev(68, 71, 4));
console.log(`  A) 68mm/60 required, 71% stress, station 4km  -> ${approved.verdict} @ ${pct(approved.confidence)}, payout Rs.${approved.payout}`);
check('A is approved', approved.verdict === 'approved');
check('A confidence is high', approved.band === 'high');
check('A pays out', (approved.payout ?? 0) > 0);

const review = run('excess_rain', 'most', ev(42, 20, 21));
console.log(`  B) 42mm/60 required, 20% stress, station 21km -> ${review.verdict} @ ${pct(review.confidence)}`);
check('B needs review', review.verdict === 'needs_review');
check('B does not pay out', review.payout === null);

const denied = run('excess_rain', 'entire', ev(18, 3, 2));
console.log(`  C) 18mm/60 required, 3% stress, station 2km   -> ${denied.verdict} @ ${pct(denied.confidence)}`);
check('C is not approved', denied.verdict === 'not_approved');
check('C confidence is high', denied.band === 'high');

console.log('\n--- The central claim: distance changes trust, not the verdict sign ---\n');

const near = run('excess_rain', 'entire', ev(18, 3, 2));
const far = run('excess_rain', 'entire', ev(18, 3, 21));
console.log(`  Same contradicting evidence, station 2km  -> ${near.verdict} @ ${pct(near.confidence)}`);
console.log(`  Same contradicting evidence, station 21km -> ${far.verdict} @ ${pct(far.confidence)}`);
check('near station permits an automatic rejection', near.verdict === 'not_approved');
check('far station downgrades it to human review', far.verdict === 'needs_review');
check('the evidence still leans the same way', Math.sign(near.score) === Math.sign(far.score));
check('only confidence moved', far.confidence < near.confidence,
  `${pct(near.confidence)} -> ${pct(far.confidence)}`);

console.log('\n--- Distance is never grounds for rejection on its own ---\n');
const supportiveFar = run('excess_rain', 'most', ev(75, 78, 24));
console.log(`  Supportive evidence, station 24km -> ${supportiveFar.verdict} @ ${pct(supportiveFar.confidence)}`);
check('a distant station cannot flip support into rejection', supportiveFar.verdict !== 'not_approved');

console.log('\n--- Monotonicity and bounds ---\n');
check('reliability is 1.0 within the trusted radius', stationReliability(3) === 1);
check('reliability decays with distance', stationReliability(10) > stationReliability(21));
check('reliability never hits zero', stationReliability(500) > 0);
check('confidence never reaches certainty', denied.confidence < 1);

console.log('\n--- Weather cannot speak to pest damage ---\n');
const pest = run('pest_disease', 'half', ev(0, 60, 4));
console.log(`  Pest claim, 60% stress vs 45% expected -> ${pest.verdict} @ ${pct(pest.confidence)}`);
check('rainfall is excluded for pest claims', !pest.weather.applicable && pest.weather.weight === 0);
check('a single-source case cannot reach high confidence', pest.band !== 'high');

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}\n`);
process.exit(failures === 0 ? 0 : 1);
