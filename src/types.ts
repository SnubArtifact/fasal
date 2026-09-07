export type LangCode = 'en' | 'hi' | 'pa' | 'mr' | 'gu' | 'bn' | 'te';

export type Season = 'kharif' | 'rabi' | 'zaid';

export type Peril =
  | 'excess_rain'
  | 'deficit_rain'
  | 'hailstorm'
  | 'flood'
  | 'storm'
  | 'pest_disease';

export type Extent = 'small' | 'half' | 'most' | 'entire';

export type Timing = 'today' | 'yesterday' | 'last_7_days' | 'over_7_days';

export type Verdict = 'approved' | 'needs_review' | 'not_approved';

export interface Farmer {
  id: string;
  name: string;
  villageId: string;
  insuredAcres: number;
  scheme: string;
  policyActive: boolean;
  sumInsuredPerAcre: number;
}

export interface Village {
  id: string;
  name: string;
  district: string;
  state: string;
  /** Nearest govt. weather station and how far it sits from the village centroid. */
  stationName: string;
  stationDistanceKm: number;
}

export interface Crop {
  id: string;
  seasons: Season[];
  emoji: string;
  /** Rainfall (mm) over the reference window that defines the trigger for each peril. */
  thresholds: Partial<Record<Peril, number>>;
}

/** Raw measurements pulled from the weather + satellite sources. */
export interface Evidence {
  rainfallMm: number;
  requiredMm: number;
  /** % of the insured plot showing vegetation stress in the satellite composite. */
  vegetationStressPct: number;
  stationName: string;
  stationDistanceKm: number;
  windowLabel: Timing;
}

/** One evidence source, after it has been scored against the farmer's report. */
export interface SignalReading {
  source: 'weather' | 'satellite';
  /** -1 = flatly contradicts the farmer, +1 = fully supports the farmer. */
  agreement: number;
  /** How much this source counted toward the decision, 0..1. */
  weight: number;
  applicable: boolean;
}

export interface Assessment {
  verdict: Verdict;
  /** Weighted agreement across sources, -1..+1. */
  score: number;
  /** 0..1, never 1.0 — the system does not claim certainty. */
  confidence: number;
  band: 'high' | 'moderate' | 'low';
  weather: SignalReading;
  satellite: SignalReading;
  /** 0..1 — how representative the station reading is judged to be for this farm. */
  stationReliability: number;
  /** True when the two sources point in opposite directions. */
  sourcesConflict: boolean;
  payout: number | null;
  assessedLossFraction: number;
}

export interface ClaimDraft {
  lang: LangCode;
  farmerId: string | null;
  farmer: Farmer | null;
  villageId: string | null;
  season: Season | null;
  cropId: string | null;
  peril: Peril | null;
  timing: Timing | null;
  extent: Extent | null;
}

export interface Disagreement {
  reasons: string[];
  note: string;
}
