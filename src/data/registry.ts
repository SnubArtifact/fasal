import type { Crop, Evidence, Farmer, Peril, Season, Timing, Village } from '../types';

/* Villages this kiosk serves. Station distance is a real property of the
   village, not something the farmer enters — it is why two neighbouring
   villages can get different treatment from the same rainfall record. */
export const VILLAGES: Village[] = [
  { id: 'rampur', name: 'Rampur', district: 'Gurugram', state: 'Haryana', stationName: 'Gurugram AWS', stationDistanceKm: 4 },
  { id: 'badshahpur', name: 'Badshahpur', district: 'Gurugram', state: 'Haryana', stationName: 'Gurugram AWS', stationDistanceKm: 7 },
  { id: 'bhondsi', name: 'Bhondsi', district: 'Gurugram', state: 'Haryana', stationName: 'Gurugram AWS', stationDistanceKm: 12 },
  { id: 'farrukhnagar', name: 'Farrukhnagar', district: 'Gurugram', state: 'Haryana', stationName: 'Gurugram AWS', stationDistanceKm: 21 },
  { id: 'sohna', name: 'Sohna', district: 'Gurugram', state: 'Haryana', stationName: 'Nuh AWS', stationDistanceKm: 17 },
  { id: 'manesar', name: 'Manesar', district: 'Gurugram', state: 'Haryana', stationName: 'Gurugram AWS', stationDistanceKm: 9 },
];

export const FARMERS: Farmer[] = [
  { id: 'FRM-10284', name: 'Ramesh Kumar', villageId: 'rampur', insuredAcres: 2.4, scheme: 'PMFBY', policyActive: true, sumInsuredPerAcre: 11000 },
  { id: 'FRM-20551', name: 'Sunita Devi', villageId: 'farrukhnagar', insuredAcres: 1.2, scheme: 'PMFBY', policyActive: true, sumInsuredPerAcre: 11000 },
  { id: 'FRM-33417', name: 'Iqbal Singh', villageId: 'sohna', insuredAcres: 5, scheme: 'PMFBY', policyActive: true, sumInsuredPerAcre: 9800 },
];

export const CROPS: Crop[] = [
  { id: 'wheat', seasons: ['rabi'], emoji: '🌾', thresholds: { excess_rain: 60, deficit_rain: 25, flood: 90, hailstorm: 40, storm: 45 } },
  { id: 'mustard', seasons: ['rabi'], emoji: '🌼', thresholds: { excess_rain: 50, deficit_rain: 20, flood: 80, hailstorm: 35, storm: 40 } },
  { id: 'chickpea', seasons: ['rabi'], emoji: '🌱', thresholds: { excess_rain: 55, deficit_rain: 20, flood: 85, hailstorm: 35, storm: 40 } },
  { id: 'barley', seasons: ['rabi'], emoji: '🌾', thresholds: { excess_rain: 65, deficit_rain: 22, flood: 95, hailstorm: 40, storm: 45 } },
  { id: 'paddy', seasons: ['kharif'], emoji: '🌾', thresholds: { excess_rain: 180, deficit_rain: 70, flood: 240, hailstorm: 60, storm: 70 } },
  { id: 'bajra', seasons: ['kharif'], emoji: '🌾', thresholds: { excess_rain: 120, deficit_rain: 40, flood: 170, hailstorm: 50, storm: 55 } },
  { id: 'cotton', seasons: ['kharif'], emoji: '🌿', thresholds: { excess_rain: 140, deficit_rain: 55, flood: 190, hailstorm: 55, storm: 60 } },
  { id: 'maize', seasons: ['kharif', 'zaid'], emoji: '🌽', thresholds: { excess_rain: 130, deficit_rain: 50, flood: 180, hailstorm: 50, storm: 55 } },
  { id: 'watermelon', seasons: ['zaid'], emoji: '🍉', thresholds: { excess_rain: 45, deficit_rain: 15, flood: 70, hailstorm: 30, storm: 35 } },
  { id: 'muskmelon', seasons: ['zaid'], emoji: '🍈', thresholds: { excess_rain: 45, deficit_rain: 15, flood: 70, hailstorm: 30, storm: 35 } },
  { id: 'cucumber', seasons: ['zaid'], emoji: '🥒', thresholds: { excess_rain: 40, deficit_rain: 15, flood: 65, hailstorm: 28, storm: 32 } },
  { id: 'fodder', seasons: ['zaid', 'kharif'], emoji: '🌱', thresholds: { excess_rain: 100, deficit_rain: 35, flood: 150, hailstorm: 45, storm: 50 } },
];

export const PERILS: Peril[] = [
  'excess_rain', 'deficit_rain', 'hailstorm', 'flood', 'storm', 'pest_disease',
];

export const TIMINGS: Timing[] = ['today', 'yesterday', 'last_7_days', 'over_7_days'];

export const getFarmer = (id: string) =>
  FARMERS.find((f) => f.id.toLowerCase() === id.trim().toLowerCase()) ?? null;

export const getVillage = (id: string | null) =>
  VILLAGES.find((v) => v.id === id) ?? null;

export const getCrop = (id: string | null) => CROPS.find((c) => c.id === id) ?? null;

/**
 * Crops the app offers first, given where the kiosk is and which season the
 * farmer picked. Everything else stays reachable through search — a suggestion
 * is never allowed to become a restriction.
 */
export const suggestedCrops = (season: Season | null) =>
  season ? CROPS.filter((c) => c.seasons.includes(season)) : CROPS;

/* ------------------------------------------------------------------ *
 * Synthetic observation record.
 *
 * Real deployments would read IMD station records and a Sentinel-2 NDVI
 * composite here. For the demo the readings are derived deterministically
 * from the claim, so the same inputs always produce the same evidence and
 * the same explanation — nothing about the outcome is random.
 * ------------------------------------------------------------------ */
function seed(parts: string[]): number {
  let h = 2166136261;
  for (const p of parts.join('|')) {
    h ^= p.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const WINDOW_DAYS: Record<Timing, number> = {
  today: 1, yesterday: 2, last_7_days: 7, over_7_days: 21,
};

export function collectEvidence(
  villageId: string,
  cropId: string,
  peril: Peril,
  timing: Timing,
): Evidence {
  const village = getVillage(villageId)!;
  const crop = getCrop(cropId)!;
  const required = crop.thresholds[peril] ?? 60;
  const r = seed([villageId, cropId, peril, timing]);
  const r2 = seed([timing, peril, cropId, villageId]);

  // Rainfall recorded at the station over the claim window.
  const excessLike = peril === 'excess_rain' || peril === 'flood';
  const base = excessLike ? required * (0.55 + r * 0.95) : required * (0.2 + r * 1.1);
  const rainfallMm = Math.round(base * (WINDOW_DAYS[timing] >= 7 ? 1 : 0.75));

  // Vegetation stress seen on the plot itself.
  const vegetationStressPct = Math.round(8 + r2 * 80);

  return {
    rainfallMm,
    requiredMm: required,
    vegetationStressPct,
    stationName: village.stationName,
    stationDistanceKm: village.stationDistanceKm,
    windowLabel: timing,
  };
}

/** The three worked examples from the design document, for demos and QA. */
export const DEMO_SCENARIOS: Record<string, Partial<Evidence>> = {
  approved: { rainfallMm: 68, requiredMm: 60, vegetationStressPct: 71, stationDistanceKm: 4 },
  review: { rainfallMm: 42, requiredMm: 60, vegetationStressPct: 20, stationDistanceKm: 21 },
  denied: { rainfallMm: 18, requiredMm: 60, vegetationStressPct: 3, stationDistanceKm: 2 },
};

export const makeCaseId = () => `CI-${1000 + Math.floor(Math.random() * 9000)}`;
