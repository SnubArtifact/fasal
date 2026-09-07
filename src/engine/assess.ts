import type {
  Assessment,
  Evidence,
  Extent,
  Peril,
  SignalReading,
  Verdict,
} from '../types';

/* ------------------------------------------------------------------ *
 * Tunable constants. Kept in one place so the decision rule stays
 * auditable — a reviewer can read every number that moves a verdict.
 * ------------------------------------------------------------------ */
export const PARAMS = {
  /** Fraction of the threshold over which weather agreement saturates. */
  weatherTolerance: 0.2,
  /** Percentage points of satellite stress error that saturate disagreement. */
  satelliteTolerancePct: 35,
  /** A station within this many km is treated as fully representative. */
  stationTrustedKm: 5,
  /** Km beyond `stationTrustedKm` over which reliability decays to the floor. */
  stationDecayKm: 22,
  /** Reliability never reaches zero — a far reading is weak, not worthless. */
  stationReliabilityFloor: 0.15,
  /** Base influence of each source before reliability weighting. */
  weatherBaseWeight: 0.55,
  satelliteBaseWeight: 0.45,
  /** Share of confidence that depends on how much evidence we actually hold. */
  coverageFloor: 0.42,
  /** Confidence = coverage * (floor + slope * |score|), minus conflict penalty. */
  confidenceFloor: 0.52,
  confidenceSlope: 0.44,
  conflictPenalty: 0.45,
  /** The system never reports certainty. */
  confidenceCeiling: 0.95,
  /** A verdict is only issued automatically above this confidence. */
  autoDecisionConfidence: 0.75,
  /** ...and only when the evidence leans this far one way. */
  decisionScore: 0.3,
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Perils whose trigger is "at least this much rain fell". */
const EXCESS_PERILS: Peril[] = ['excess_rain', 'flood', 'hailstorm', 'storm'];

/** Vegetation stress we would expect to see for each reported extent. */
export const EXPECTED_STRESS: Record<Extent, number> = {
  small: 20,
  half: 45,
  most: 70,
  entire: 90,
};

/** Share of the sum insured payable at each reported extent. */
const LOSS_FRACTION: Record<Extent, number> = {
  small: 0.2,
  half: 0.45,
  most: 0.7,
  entire: 0.9,
};

/**
 * How far the rainfall record leans toward or against the farmer's account.
 * Returns null when rainfall simply cannot speak to the reported peril.
 */
export function weatherAgreement(
  peril: Peril,
  rainfallMm: number,
  requiredMm: number,
): number | null {
  if (peril === 'pest_disease') return null;
  if (requiredMm <= 0) return null;

  const ratio = rainfallMm / requiredMm;
  const raw = EXCESS_PERILS.includes(peril)
    ? (ratio - 1) / PARAMS.weatherTolerance
    : (1 - ratio) / PARAMS.weatherTolerance;

  return clamp(raw, -1, 1);
}

/**
 * How far the satellite composite leans toward or against the report.
 * More stress than the farmer claimed is not held against them — under-
 * reporting your own loss is never treated as evidence of a false claim.
 */
export function satelliteAgreement(extent: Extent, stressPct: number): number {
  const shortfall = EXPECTED_STRESS[extent] - stressPct;
  if (shortfall <= 0) return 1;
  return clamp(1 - shortfall / PARAMS.satelliteTolerancePct, -1, 1);
}

/**
 * THE CORE IDEA.
 *
 * Distance to the weather station is never a reason to approve or reject a
 * claim. It only answers a narrower question: how much should this particular
 * measurement count as a description of *this* field? A station 2 km away is
 * describing roughly the same sky; a station 21 km away may have sat under a
 * completely different cloud. So distance scales the weight of the reading,
 * and a low-weight reading drags confidence down rather than deciding the case.
 */
export function stationReliability(distanceKm: number): number {
  const excess = distanceKm - PARAMS.stationTrustedKm;
  if (excess <= 0) return 1;
  return clamp(1 - excess / PARAMS.stationDecayKm, PARAMS.stationReliabilityFloor, 1);
}

export function confidenceBand(confidence: number): Assessment['band'] {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.55) return 'moderate';
  return 'low';
}

export function assess(
  peril: Peril,
  extent: Extent,
  evidence: Evidence,
  sumInsuredPerAcre: number,
  insuredAcres: number,
): Assessment {
  const reliability = stationReliability(evidence.stationDistanceKm);

  const rawWeather = weatherAgreement(peril, evidence.rainfallMm, evidence.requiredMm);
  const weatherApplicable = rawWeather !== null;

  const weather: SignalReading = {
    source: 'weather',
    agreement: rawWeather ?? 0,
    // Distance discounts the rainfall record, and only the rainfall record.
    weight: weatherApplicable ? PARAMS.weatherBaseWeight * reliability : 0,
    applicable: weatherApplicable,
  };

  const satellite: SignalReading = {
    source: 'satellite',
    agreement: satelliteAgreement(extent, evidence.vegetationStressPct),
    // The satellite images the insured plot itself, so no distance discount applies.
    weight: PARAMS.satelliteBaseWeight,
    applicable: true,
  };

  const totalWeight = weather.weight + satellite.weight;
  const score =
    totalWeight === 0
      ? 0
      : (weather.weight * weather.agreement + satellite.weight * satellite.agreement) /
        totalWeight;

  const sourcesConflict =
    weatherApplicable && weather.agreement * satellite.agreement < 0;
  const conflictSize = sourcesConflict
    ? Math.min(Math.abs(weather.agreement), Math.abs(satellite.agreement))
    : 0;

  // Coverage: how much of the ideal evidence budget we actually hold. Losing the
  // rainfall record to distance, or to an inapplicable peril, lowers this.
  const coverage = PARAMS.coverageFloor + (1 - PARAMS.coverageFloor) * totalWeight;

  const confidence = clamp(
    coverage *
      (PARAMS.confidenceFloor + PARAMS.confidenceSlope * Math.abs(score)) *
      (1 - PARAMS.conflictPenalty * conflictSize),
    0.05,
    PARAMS.confidenceCeiling,
  );

  let verdict: Verdict = 'needs_review';
  if (confidence >= PARAMS.autoDecisionConfidence) {
    if (score >= PARAMS.decisionScore) verdict = 'approved';
    else if (score <= -PARAMS.decisionScore) verdict = 'not_approved';
  }

  // Payout is capped by what the satellite can actually corroborate, so the
  // farmer is never paid on an extent no source supports.
  const reportedLoss = LOSS_FRACTION[extent];
  const observedLoss = clamp(evidence.vegetationStressPct / 100, 0, 1);
  const assessedLossFraction =
    verdict === 'approved' ? Math.min(reportedLoss, Math.max(observedLoss, reportedLoss * 0.6)) : 0;

  const payout =
    verdict === 'approved'
      ? Math.round(insuredAcres * sumInsuredPerAcre * assessedLossFraction)
      : null;

  return {
    verdict,
    score,
    confidence,
    band: confidenceBand(confidence),
    weather,
    satellite,
    stationReliability: reliability,
    sourcesConflict,
    payout,
    assessedLossFraction,
  };
}

/**
 * Counterfactual used by the "what if the station were closer?" control on the
 * explanation screen. Re-runs the same rule with one number changed.
 */
export function assessAtDistance(
  peril: Peril,
  extent: Extent,
  evidence: Evidence,
  sumInsuredPerAcre: number,
  insuredAcres: number,
  distanceKm: number,
): Assessment {
  return assess(
    peril,
    extent,
    { ...evidence, stationDistanceKm: distanceKm },
    sumInsuredPerAcre,
    insuredAcres,
  );
}
