import { useMemo, useState } from 'react';
import {
  Button,
  ConfidenceMeter,
  EvidenceBlock,
  FactRow,
  Option,
  Screen,
  VERDICT_MARK,
} from '../components/ui';
import { Scene, type SceneVariant } from '../components/scenery';
import { useT, type TKey } from '../i18n';
import { PARAMS, assessAtDistance } from '../engine/assess';
import {
  buildNarrative,
  confidenceNote,
  reviewReason,
  satelliteChip,
  stationChip,
  verdictLabel,
  weatherChip,
} from '../engine/explain';
import type { Assessment, ClaimDraft, Disagreement, Evidence, Verdict } from '../types';

const VERDICT_TITLE: Record<Verdict, TKey> = {
  approved: 'res.approved',
  needs_review: 'res.review',
  not_approved: 'res.denied',
};

/* Short label for the pill, and which landscape suits each outcome. */
const VERDICT_PILL: Record<Verdict, TKey> = {
  approved: 'verdict.approved',
  needs_review: 'verdict.review',
  not_approved: 'verdict.denied',
};

const VERDICT_SCENE: Record<Verdict, SceneVariant> = {
  approved: 'field',
  needs_review: 'valley',
  not_approved: 'ridge',
};

/* ------------------------------------------ Shared evidence presentation */

function EvidenceSet({
  draft,
  evidence,
  assessment,
}: {
  draft: ClaimDraft;
  evidence: Evidence;
  assessment: Assessment;
}) {
  const { t, n } = useT();
  const wc = weatherChip(draft.peril!, assessment);
  const sc = satelliteChip(assessment);
  const stc = stationChip(assessment);

  return (
    <>
      <EvidenceBlock
        icon="👨‍🌾"
        title={t('res.yourreport')}
        value={t(`ext.${draft.extent}` as TKey)}
        sub={`${t(`peril.${draft.peril}` as TKey)} · ${t(`time.${draft.timing}` as TKey)}`}
      />

      <EvidenceBlock
        icon="🌧️"
        title={t('res.weather')}
        value={`${n(evidence.rainfallMm)} ${t('res.rain')}`}
        sub={`${t('res.required')}: ${n(evidence.requiredMm)} ${t('unit.mm')}`}
        chip={t(wc.key)}
        tone={wc.tone}
      />

      <EvidenceBlock
        icon="🛰️"
        title={t('res.satellite')}
        value={`${n(evidence.vegetationStressPct)}${t('res.stress')}`}
        chip={t(sc.key)}
        tone={sc.tone}
      />

      <EvidenceBlock
        icon="📍"
        title={t('res.station')}
        value={`${n(evidence.stationDistanceKm)} ${t('res.fromfield')}`}
        sub={evidence.stationName}
        chip={t(stc.key)}
        tone={stc.tone}
      />
    </>
  );
}

/* ---------------------------------------- SCREENS 13A/B/C — The result */

export function ResultScreen({
  draft,
  evidence,
  assessment,
  onWhy,
  onDisagree,
  onTrack,
}: {
  draft: ClaimDraft;
  evidence: Evidence;
  assessment: Assessment;
  onWhy: () => void;
  onDisagree: () => void;
  onTrack: () => void;
}) {
  const { t, n } = useT();

  return (
    <Screen>
      {/* Landscape hero carrying the verdict, with the status as a pill so it
          is never communicated by colour alone. */}
      <Scene variant={VERDICT_SCENE[assessment.verdict]} tall>
        <span className={`statuspill statuspill--${assessment.verdict}`}>
          <span aria-hidden="true">{VERDICT_MARK[assessment.verdict]}</span>
          {t(VERDICT_PILL[assessment.verdict])}
        </span>
        <div className="scene__spacer" />
        <h1 className="scene__title">{t(VERDICT_TITLE[assessment.verdict])}</h1>
      </Scene>

      <p className="eyebrow">{t('res.found')}</p>
      <EvidenceSet draft={draft} evidence={evidence} assessment={assessment} />

      <ConfidenceMeter
        confidence={assessment.confidence}
        band={assessment.band}
        gate={PARAMS.autoDecisionConfidence}
      />

      {assessment.verdict === 'needs_review' && (
        <div className="card card--flat">
          <p className="eyebrow" style={{ marginBottom: 6 }}>
            {t('res.reviewwhy')}
          </p>
          <p style={{ margin: 0 }}>{t(reviewReason(assessment))}</p>
        </div>
      )}

      {assessment.verdict === 'approved' && assessment.payout !== null && (
        <div className="payout">
          <p className="eyebrow" style={{ marginBottom: 0 }}>
            {t('res.payout')}
          </p>
          <div className="payout__amount">₹{n(assessment.payout)}</div>
          <p className="muted" style={{ margin: 0, fontSize: 'var(--fs-small)' }}>
            {t('res.payoutfoot')}
          </p>
        </div>
      )}

      <div className="screen__foot">
        <div className="btnstack">
          <Button onClick={onWhy}>{t('res.why')}</Button>
          {assessment.verdict === 'approved' ? (
            <Button variant="secondary" onClick={onTrack}>
              {t('res.track')}
            </Button>
          ) : null}
          <Button variant="danger" onClick={onDisagree}>
            {t('res.disagree')}
          </Button>
        </div>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------ SCREEN 14 — Why this */

export function WhyScreen({
  draft,
  evidence,
  assessment,
  onContinue,
  onDisagree,
  onBack,
}: {
  draft: ClaimDraft;
  evidence: Evidence;
  assessment: Assessment;
  onContinue: () => void;
  onDisagree: () => void;
  onBack: () => void;
}) {
  const { t, lang, n } = useT();
  const [cfDistance, setCfDistance] = useState(evidence.stationDistanceKm);

  const narrative = useMemo(
    () => buildNarrative(lang, draft.peril!, draft.extent!, evidence, assessment),
    [lang, draft, evidence, assessment],
  );

  /* Re-run the exact same rule with only the station distance changed. */
  const counterfactual = useMemo(
    () =>
      assessAtDistance(
        draft.peril!,
        draft.extent!,
        evidence,
        draft.farmer!.sumInsuredPerAcre,
        draft.farmer!.insuredAcres,
        cfDistance,
      ),
    [draft, evidence, cfDistance],
  );

  const totalWeight = assessment.weather.weight + assessment.satellite.weight;
  const weatherShare = totalWeight ? assessment.weather.weight / totalWeight : 0;
  const satelliteShare = totalWeight ? assessment.satellite.weight / totalWeight : 1;
  const changed = counterfactual.verdict !== assessment.verdict;

  return (
    <Screen title={t('why.title')} lead={t('why.intro')}>
      <EvidenceSet draft={draft} evidence={evidence} assessment={assessment} />

      {/* How much each source actually counted. This is the part that makes
          the station-distance rule visible rather than merely stated. */}
      <div className="card">
        <p className="eyebrow">{t('why.weight')}</p>

        <div className="weight">
          <div className="weight__row">
            <span>🌧️ {t('res.weather')}</span>
            <span>{Math.round(weatherShare * 100)}%</span>
          </div>
          <div className="weight__track">
            <div
              className="weight__fill weight__fill--weather"
              style={{ width: `${weatherShare * 100}%` }}
            />
          </div>
        </div>

        <div className="weight">
          <div className="weight__row">
            <span>🛰️ {t('res.satellite')}</span>
            <span>{Math.round(satelliteShare * 100)}%</span>
          </div>
          <div className="weight__track">
            <div
              className="weight__fill weight__fill--satellite"
              style={{ width: `${satelliteShare * 100}%` }}
            />
          </div>
        </div>

        <p className="muted" style={{ fontSize: 'var(--fs-small)', margin: 0 }}>
          {t('why.weightfoot')}
        </p>
      </div>

      {/* The counterfactual. A farmer can move the station and watch the
          confidence — not the direction of the evidence — respond. */}
      <div className="cf">
        <p className="eyebrow" style={{ color: 'var(--sky-700)' }}>
          {t('why.counterfactual')}
        </p>
        <p style={{ marginTop: 0, fontSize: 'var(--fs-small)' }}>{t('why.cfhint')}</p>

        <input
          className="cf__slider"
          type="range"
          min={1}
          max={30}
          step={1}
          value={cfDistance}
          onChange={(e) => setCfDistance(Number(e.target.value))}
          aria-label={t('why.counterfactual')}
          aria-valuetext={`${cfDistance} km`}
        />
        <div className="cf__scale">
          <span>1 km</span>
          <span style={{ fontSize: '1.15rem' }}>
            <strong>{cfDistance} km</strong>
          </span>
          <span>30 km</span>
        </div>

        <div className="cf__readout" role="status">
          <div>
            {t('why.cfat')} <strong>{cfDistance} km</strong> — {t('why.cfresult')}{' '}
            <span className={`cf__verdict cf__verdict--${counterfactual.verdict}`}>
              {verdictLabel(lang, counterfactual.verdict)}
            </span>
          </div>
          <div style={{ marginTop: 6 }}>
            {t('res.confidence')}: <strong>{Math.round(counterfactual.confidence * 100)}%</strong>
            {!changed && (
              <span className="muted"> · {t('why.cfsame')}</span>
            )}
          </div>
        </div>

        <p
          style={{
            marginBottom: 0,
            marginTop: 14,
            fontSize: 'var(--fs-small)',
            fontWeight: 600,
            color: 'var(--sky-700)',
          }}
        >
          {t('why.notrejected')}
        </p>
      </div>

      <div className="card">
        <p className="eyebrow">🤖 {t('why.effect')}</p>
        {narrative.map((line, i) => (
          <p key={i} style={{ marginTop: 0, marginBottom: i === narrative.length - 1 ? 0 : 12 }}>
            {line}
          </p>
        ))}
      </div>

      <ConfidenceMeter
        confidence={assessment.confidence}
        band={assessment.band}
        gate={PARAMS.autoDecisionConfidence}
      />
      <p className="note">
        <span aria-hidden="true">ℹ️</span>
        <span>{t(confidenceNote(assessment))}</span>
      </p>

      {assessment.verdict === 'approved' && assessment.payout !== null && (
        <div className="card card--flat" style={{ marginTop: 18 }}>
          <p className="eyebrow">{t('res.whyamount')}</p>
          <FactRow
            icon="📐"
            label={t('farm.area')}
            value={`${n(draft.farmer!.insuredAcres)} ${t('farm.acres')}`}
          />
          <FactRow
            icon="₹"
            label={t('why.perAcre')}
            value={`₹${n(draft.farmer!.sumInsuredPerAcre)}`}
          />
          <FactRow
            icon="🌾"
            label={t('why.assessedLoss')}
            value={`${Math.round(assessment.assessedLossFraction * 100)}%`}
          />
          <FactRow icon="✅" label={t('res.payout')} value={`₹${n(assessment.payout)}`} />
        </div>
      )}

      <div className="screen__foot">
        <div className="btnstack">
          <Button onClick={onContinue}>{t('btn.continue')}</Button>
          <Button variant="danger" onClick={onDisagree}>
            {t('res.disagree')}
          </Button>
          <Button variant="secondary" onClick={onBack}>
            ← {t('btn.back')}
          </Button>
        </div>
      </div>
    </Screen>
  );
}

/* -------------------------------------------------- SCREEN 15 — Match? */

export function MatchScreen({
  onAgree,
  onDisagree,
}: {
  onAgree: () => void;
  onDisagree: () => void;
}) {
  const { t } = useT();
  return (
    <Screen title={t('match.title')} note={t('match.foot')}>
      <div className="options">
        <Option icon="✅" label={t('match.yes')} onClick={onAgree} />
        <Option icon="❌" label={t('match.no')} onClick={onDisagree} />
      </div>
    </Screen>
  );
}

export function ConfirmedScreen({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  return (
    <Screen title={t('match.done')} lead={t('match.donebody')}>
      <div className="verdict verdict--approved">
        <span className="verdict__mark" aria-hidden="true">
          ✓
        </span>
        <p className="verdict__text">{t('match.recorded')}</p>
      </div>
      <div className="screen__foot">
        <Button onClick={onDone}>{t('btn.done')}</Button>
      </div>
    </Screen>
  );
}

/* ----------------------------------------------- SCREEN 16 — Disagree */

const REASONS: { id: string; key: TKey }[] = [
  { id: 'rain', key: 'dis.rain' },
  { id: 'more', key: 'dis.more' },
  { id: 'sat', key: 'dis.sat' },
  { id: 'station', key: 'dis.station' },
  { id: 'farm', key: 'dis.farm' },
  { id: 'crop', key: 'dis.crop' },
  { id: 'policy', key: 'dis.policy' },
  { id: 'other', key: 'dis.other' },
];

export function DisagreeScreen({ onSubmit }: { onSubmit: (d: Disagreement) => void }) {
  const { t } = useT();
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [error, setError] = useState(false);

  const toggle = (id: string) => {
    setError(false);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const submit = () => {
    if (selected.length === 0) {
      setError(true);
      return;
    }
    onSubmit({ reasons: selected, note: note.trim() });
  };

  return (
    <Screen
      title={t('dis.title')}
      note={t('dis.foot')}
      footer={<Button onClick={submit}>{t('dis.submit')}</Button>}
    >
      {error && (
        <div className="alert" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{t('dis.needone')}</span>
        </div>
      )}

      <p className="lead">{t('dis.sub')}</p>

      <div className="options">
        {REASONS.map((r) => (
          <Option
            key={r.id}
            multi
            label={t(r.key)}
            selected={selected.includes(r.id)}
            onClick={() => toggle(r.id)}
          />
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        {!showNote ? (
          <>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              {t('dis.more_q')}
            </p>
            <Button variant="secondary" onClick={() => setShowNote(true)}>
              ✏️ {t('dis.add')}
            </Button>
          </>
        ) : (
          <label className="field">
            <span className="field__label">{t('dis.add')}</span>
            <textarea
              className="textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('dis.placeholder')}
            />
          </label>
        )}
      </div>
    </Screen>
  );
}

/* ---------------------------------------------- SCREEN 17 — Submitted */

export function SubmittedScreen({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const { t } = useT();
  const steps: TKey[] = ['sub.n1', 'sub.n2', 'sub.n3', 'sub.n4'];

  return (
    <Screen title={t('sub.title')} lead={t('sub.body')}>
      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>
          {t('sub.case')}
        </p>
        <div style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '0.05em' }}>
          {caseId}
        </div>
      </div>

      <div className="card">
        <p className="eyebrow">{t('sub.next')}</p>
        <ol className="timeline">
          {steps.map((s, i) => (
            <li key={s} className={`timeline__item ${i === 0 ? 'timeline__item--done' : ''}`}>
              <span className="timeline__num" aria-hidden="true">
                {i === 0 ? '✓' : i + 1}
              </span>
              <span>{t(s)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="screen__foot">
        <Button onClick={onDone}>{t('btn.done')}</Button>
      </div>
    </Screen>
  );
}

/* ------------------------------------------------- SCREEN 18 — Status */

export function StatusScreen({
  knownCaseId,
  /** Approved claims are tracked too — they are not "under review". */
  awaitingHumanReview,
  onDone,
}: {
  knownCaseId: string | null;
  awaitingHumanReview: boolean;
  onDone: () => void;
}) {
  const { t } = useT();
  const [entry, setEntry] = useState(knownCaseId ?? '');
  const [found, setFound] = useState<string | null>(knownCaseId);
  const [error, setError] = useState(false);

  const submitted = useMemo(
    () => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  );

  if (!found) {
    return (
      <Screen title={t('st.title')}>
        {error && (
          <div className="alert" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{t('st.notfound')}</span>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            /* The kiosk only knows cases raised at this kiosk in this session. */
            if (knownCaseId && entry.trim().toUpperCase() === knownCaseId) {
              setFound(knownCaseId);
            } else {
              setError(true);
            }
          }}
        >
          <label className="field">
            <span className="field__label">{t('st.enter')}</span>
            <input
              className="input"
              value={entry}
              onChange={(e) => {
                setEntry(e.target.value.toUpperCase());
                setError(false);
              }}
              placeholder="CI-1042"
              autoComplete="off"
            />
          </label>
          <div className="btnstack">
            <Button type="submit" disabled={entry.trim().length < 4}>
              {t('btn.continue')}
            </Button>
            <Button variant="secondary" onClick={onDone}>
              {t('btn.back')}
            </Button>
          </div>
        </form>
      </Screen>
    );
  }

  return (
    <Screen title={t('st.title')}>
      <div className="card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>
          {t('sub.case')}
        </p>
        <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.05em' }}>{found}</div>
      </div>

      <div className={`verdict verdict--${awaitingHumanReview ? 'needs_review' : 'approved'}`}>
        <span className="verdict__mark" aria-hidden="true">
          {awaitingHumanReview ? '🟠' : '✅'}
        </span>
        <p className="verdict__text">
          {awaitingHumanReview ? t('st.under') : t('st.approvedStatus')}
        </p>
      </div>

      <div className="card">
        <FactRow icon="📅" label={t('st.submitted')} value={submitted} />
        <FactRow
          icon="👤"
          label={t('st.status')}
          value={awaitingHumanReview ? t('st.checking') : t('st.approvedNote')}
        />
        <FactRow
          icon="⏳"
          label={t('st.expected')}
          value={awaitingHumanReview ? t('st.days') : t('st.payExpected')}
        />
      </div>

      <div className="screen__foot">
        <div className="btnstack">
          <Button variant="secondary" onClick={() => window.alert('☎️ 1800-XXX-XXXX')}>
            ☎️ {t('st.call')}
          </Button>
          <Button onClick={onDone}>{t('btn.done')}</Button>
        </div>
      </div>
    </Screen>
  );
}
