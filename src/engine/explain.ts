import type { TKey } from '../i18n';
import type { Assessment, Evidence, Extent, LangCode, Peril } from '../types';
import { translate } from '../i18n';
import { EXPECTED_STRESS } from './assess';

export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

export interface Chip {
  key: TKey;
  tone: Tone;
}

/**
 * The words shown next to the rainfall figure. Note that this describes the
 * *reading*, not the claim: it says whether the recorded rainfall meets the
 * policy condition, and nothing about whether the farmer is telling the truth.
 */
export function weatherChip(peril: Peril, a: Assessment): Chip {
  if (!a.weather.applicable) return { key: 'chip.na', tone: 'neutral' };
  const agreement = a.weather.agreement;
  if (agreement >= 0.3) return { key: 'chip.meets', tone: 'good' };
  if (agreement <= -0.6) {
    return {
      key: peril === 'deficit_rain' ? 'chip.above' : 'chip.notcond',
      tone: 'bad',
    };
  }
  return { key: 'chip.below', tone: 'warn' };
}

export function satelliteChip(a: Assessment): Chip {
  const agreement = a.satellite.agreement;
  if (agreement >= 0.5) return { key: 'chip.satsupport', tone: 'good' };
  if (agreement <= -0.8) return { key: 'chip.satnone', tone: 'bad' };
  return { key: 'chip.satlower', tone: 'warn' };
}

/**
 * The station chip is the one place where the app states, in plain words, how
 * much it thinks the rainfall figure describes this particular field. It is
 * never phrased as a judgement about the claim.
 */
export function stationChip(a: Assessment): Chip {
  if (a.stationReliability >= 0.9) return { key: 'chip.stationnear', tone: 'good' };
  if (a.stationReliability >= 0.55) return { key: 'chip.stationmid', tone: 'warn' };
  return { key: 'chip.stationfar', tone: 'warn' };
}

/**
 * Why a claim landed in human review. The three cases are genuinely different
 * and a farmer is owed the right one: sources that contradict each other, a
 * reading we cannot place at their field, or simply too little to go on.
 */
export function reviewReason(a: Assessment): TKey {
  if (a.sourcesConflict) return 'res.reviewbody';
  if (a.stationReliability < 0.55) return 'res.reviewbody_far';
  if (!a.weather.applicable) return 'res.reviewbody_thin';
  return 'res.reviewbody';
}

export function confidenceNote(a: Assessment): TKey {
  if (a.band === 'high') return 'why.confnote_high';
  if (a.band === 'moderate') return 'why.confnote_mod';
  return 'why.confnote_low';
}

/**
 * Builds the "why this affected your result" paragraph from the same numbers
 * the verdict was computed from. Each sentence is traceable to one signal, so
 * the narrative cannot drift away from the arithmetic.
 */
export function buildNarrative(
  lang: LangCode,
  peril: Peril,
  extent: Extent,
  evidence: Evidence,
  a: Assessment,
): string[] {
  const isHindi = lang === 'hi';
  const lines: string[] = [];

  /* 1. What the rainfall record shows. A drought claim is supported by *low*
     rainfall, so the sentence has to invert with the peril or it would tell
     the farmer the opposite of what the number means. */
  if (a.weather.applicable) {
    const supported = a.weather.agreement >= 0.3;
    const drought = peril === 'deficit_rain';

    if (drought) {
      lines.push(
        supported
          ? isHindi
            ? `${evidence.rainfallMm} मिमी बारिश दर्ज हुई, जो सूखे की ${evidence.requiredMm} मिमी की सीमा से कम है।`
            : `Rainfall of ${evidence.rainfallMm} mm was at or below the ${evidence.requiredMm} mm level that indicates drought conditions.`
          : isHindi
            ? `${evidence.rainfallMm} मिमी बारिश दर्ज हुई, जो सूखे की ${evidence.requiredMm} मिमी की सीमा से ज़्यादा है।`
            : `Rainfall of ${evidence.rainfallMm} mm was above the ${evidence.requiredMm} mm level that would indicate drought conditions.`,
      );
    } else {
      lines.push(
        supported
          ? isHindi
            ? `${evidence.rainfallMm} मिमी बारिश दर्ज हुई, जो ${evidence.requiredMm} मिमी की आवश्यक सीमा तक पहुँचती है।`
            : `Rainfall of ${evidence.rainfallMm} mm reached the required level of ${evidence.requiredMm} mm.`
          : isHindi
            ? `${evidence.rainfallMm} मिमी बारिश दर्ज हुई, जो ${evidence.requiredMm} मिमी की आवश्यक सीमा से कम है।`
            : `Rainfall of ${evidence.rainfallMm} mm did not reach the required level of ${evidence.requiredMm} mm.`,
      );
    }
  } else {
    lines.push(
      isHindi
        ? 'इस तरह के नुकसान के लिए बारिश का माप कोई जानकारी नहीं देता, इसलिए इसे गिना नहीं गया।'
        : 'Rainfall does not describe this kind of damage, so it was not counted.',
    );
  }

  /* 2. What the satellite saw, relative to what was reported. */
  const expected = EXPECTED_STRESS[extent];
  if (a.satellite.agreement >= 0.5) {
    lines.push(
      isHindi
        ? `उपग्रह ने आपके खेत में ${evidence.vegetationStressPct}% वनस्पति तनाव देखा, जो आपके बताए नुकसान से मेल खाता है।`
        : `Satellite images show ${evidence.vegetationStressPct}% vegetation stress on your plot, which matches the damage you reported.`,
    );
  } else {
    lines.push(
      isHindi
        ? `उपग्रह ने ${evidence.vegetationStressPct}% वनस्पति तनाव देखा, जबकि आपके बताए नुकसान से लगभग ${expected}% की उम्मीद थी।`
        : `Satellite images show ${evidence.vegetationStressPct}% vegetation stress, where the damage you reported would suggest around ${expected}%.`,
    );
  }

  /* 3. The station, framed as a question of trust rather than of truth. */
  const km = evidence.stationDistanceKm;
  if (a.stationReliability >= 0.9) {
    lines.push(
      isHindi
        ? `मौसम केंद्र आपके खेत से सिर्फ़ ${km} किमी दूर है, इसलिए इसका माप आपके खेत की स्थिति को अच्छी तरह दर्शाता है और इसे पूरा महत्व दिया गया।`
        : `The weather station is ${km} km from your field, close enough that its measurement is likely to describe conditions at your farm, so it was given full weight.`,
    );
  } else {
    lines.push(
      isHindi
        ? `मौसम केंद्र आपके खेत से ${km} किमी दूर है, इसलिए हो सकता है इसका माप आपके खेत की असल स्थिति न दर्शाए। इस वजह से बारिश के आंकड़े को कम महत्व दिया गया — इसे नज़रअंदाज़ नहीं किया गया, बस उस पर कम भरोसा किया गया।`
        : `The weather station is ${km} km from your field, so its measurement may not describe what actually happened there. The rainfall figure was therefore given less weight — it was not ignored, it was trusted less.`,
    );
  }

  /* 4. The verdict, stated as a consequence of the three lines above. */
  if (a.verdict === 'approved') {
    lines.push(
      isHindi
        ? 'चूँकि उपलब्ध जानकारी मोटे तौर पर आपकी बात का समर्थन करती है, आपका दावा स्वीकृत कर दिया गया।'
        : 'Because the available information broadly supports your report, your claim was approved.',
    );
  } else if (a.verdict === 'not_approved') {
    lines.push(
      isHindi
        ? 'चूँकि ये स्रोत लगातार आपके बताए नुकसान से अलग हैं, और ये माप आपके खेत के लिए भरोसेमंद हैं, आपका दावा स्वीकृत नहीं हुआ।'
        : 'Because these sources consistently differ from the damage you reported, and these measurements are reliable for your field, your claim was not approved.',
    );
  } else if (a.stationReliability < 0.55) {
    lines.push(
      isHindi
        ? 'चूँकि सबसे अहम माप आपके खेत से दूर से लिया गया है, सिस्टम अपने आप फ़ैसला लेने लायक भरोसा नहीं रखता। आपका दावा किसी व्यक्ति के पास समीक्षा के लिए जा रहा है।'
        : 'Because the key measurement was taken far from your field, the system does not hold enough confidence to decide on its own. Your claim is going to a person for review.',
    );
  } else {
    lines.push(
      isHindi
        ? 'चूँकि उपलब्ध जानकारी आपस में पर्याप्त रूप से मेल नहीं खाती, आपके दावे की मानवीय समीक्षा ज़रूरी है।'
        : 'Because the available information does not agree strongly enough, your claim needs human review.',
    );
  }

  return lines;
}

/** Short label used in the counterfactual readout. */
export function verdictLabel(lang: LangCode, verdict: Assessment['verdict']): string {
  const key: TKey =
    verdict === 'approved' ? 'res.approved' : verdict === 'needs_review' ? 'res.review' : 'res.denied';
  return translate(lang, key);
}
