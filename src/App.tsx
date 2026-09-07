import { useCallback, useMemo, useState } from 'react';
import { LangContext, rememberLanguage, translate, useT } from './i18n';
import { ProgressPill } from './components/ui';
import {
  ConfirmFarmScreen,
  IdentifyScreen,
  LanguageScreen,
  LocationScreen,
  WelcomeScreen,
} from './screens/intake';
import {
  CheckingScreen,
  CropScreen,
  ExtentScreen,
  PerilScreen,
  SeasonScreen,
  SummaryScreen,
  TimingScreen,
} from './screens/claim';
import {
  ConfirmedScreen,
  DisagreeScreen,
  MatchScreen,
  ResultScreen,
  StatusScreen,
  SubmittedScreen,
  WhyScreen,
} from './screens/outcome';
import { DEMO_SCENARIOS, collectEvidence, getVillage, makeCaseId } from './data/registry';
import { assess } from './engine/assess';
import type {
  Assessment,
  ClaimDraft,
  Disagreement,
  Evidence,
  Extent,
  LangCode,
  Peril,
  Season,
  Timing,
} from './types';

type Step =
  | 'language'
  | 'welcome'
  | 'identify'
  | 'confirmFarm'
  | 'location'
  | 'season'
  | 'crop'
  | 'peril'
  | 'timing'
  | 'extent'
  | 'summary'
  | 'checking'
  | 'result'
  | 'why'
  | 'match'
  | 'confirmed'
  | 'disagree'
  | 'submitted'
  | 'status';

/** Steps that form the numbered claim questionnaire, for the progress pill. */
const CLAIM_STEPS: Step[] = ['season', 'crop', 'peril', 'timing', 'extent', 'summary'];

const emptyDraft = (lang: LangCode): ClaimDraft => ({
  lang,
  farmerId: null,
  farmer: null,
  villageId: null,
  season: null,
  cropId: null,
  peril: null,
  timing: null,
  extent: null,
});

export default function App() {
  const [lang, setLang] = useState<LangCode>('en');
  const [step, setStep] = useState<Step>('language');
  const [history, setHistory] = useState<Step[]>([]);
  const [draft, setDraft] = useState<ClaimDraft>(() => emptyDraft('en'));
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<keyof typeof DEMO_SCENARIOS | 'live'>('live');
  const [disagreement, setDisagreement] = useState<Disagreement | null>(null);

  const go = useCallback((next: Step) => {
    setStep((current) => {
      setHistory((h) => [...h, current]);
      return next;
    });
  }, []);

  const back = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setStep(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, []);

  const restart = useCallback(() => {
    setDraft(emptyDraft(lang));
    setEvidence(null);
    setAssessment(null);
    setCaseId(null);
    setDisagreement(null);
    setHistory([]);
    setStep('welcome');
  }, [lang]);

  /* Runs the decision once the questionnaire is complete. Evidence is gathered
     first and kept, so the explanation screens show exactly the numbers the
     verdict was computed from. */
  const runAssessment = useCallback(
    (d: ClaimDraft) => {
      const base = collectEvidence(d.villageId!, d.cropId!, d.peril!, d.timing!);
      const override = scenario === 'live' ? {} : DEMO_SCENARIOS[scenario];
      const ev: Evidence = { ...base, ...override };
      const result = assess(
        d.peril!,
        d.extent!,
        ev,
        d.farmer!.sumInsuredPerAcre,
        d.farmer!.insuredAcres,
      );
      setEvidence(ev);
      setAssessment(result);
    },
    [scenario],
  );

  const claimStepIndex = CLAIM_STEPS.indexOf(step);
  const canGoBack = history.length > 0 && step !== 'language' && step !== 'checking';

  const screen = useMemo(() => {
    switch (step) {
      case 'language':
        return (
          <LanguageScreen
            onPick={(code) => {
              setLang(code);
              rememberLanguage(code);
              setDraft((d) => ({ ...d, lang: code }));
              go('welcome');
            }}
          />
        );

      case 'welcome':
        return <WelcomeScreen onBegin={() => go('identify')} onStatus={() => go('status')} />;

      case 'identify':
        return (
          <IdentifyScreen
            onFound={(farmer) => {
              setDraft((d) => ({
                ...d,
                farmerId: farmer.id,
                farmer,
                villageId: farmer.villageId,
              }));
              go('confirmFarm');
            }}
          />
        );

      case 'confirmFarm':
        return (
          <ConfirmFarmScreen
            farmer={draft.farmer!}
            /* Confirming skips the location question entirely — the registered
               village is already known and re-asking would only add taps. */
            onYes={() => go('season')}
            onNo={() => go('location')}
          />
        );

      case 'location':
        return (
          <LocationScreen
            kioskVillage={getVillage(draft.farmer!.villageId)!}
            onConfirm={(villageId) => {
              setDraft((d) => ({ ...d, villageId }));
              go('season');
            }}
          />
        );

      case 'season':
        return (
          <SeasonScreen
            onPick={(season: Season) => {
              setDraft((d) => ({ ...d, season, cropId: null }));
              go('crop');
            }}
          />
        );

      case 'crop':
        return (
          <CropScreen
            season={draft.season!}
            villageName={getVillage(draft.villageId)!.name}
            onPick={(cropId) => {
              setDraft((d) => ({ ...d, cropId }));
              go('peril');
            }}
          />
        );

      case 'peril':
        return (
          <PerilScreen
            onPick={(peril: Peril) => {
              setDraft((d) => ({ ...d, peril }));
              go('timing');
            }}
          />
        );

      case 'timing':
        return (
          <TimingScreen
            onPick={(timing: Timing) => {
              setDraft((d) => ({ ...d, timing }));
              go('extent');
            }}
          />
        );

      case 'extent':
        return (
          <ExtentScreen
            onPick={(extent: Extent) => {
              setDraft((d) => ({ ...d, extent }));
              go('summary');
            }}
          />
        );

      case 'summary':
        return (
          <SummaryScreen
            draft={draft}
            onSubmit={() => {
              runAssessment(draft);
              go('checking');
            }}
          />
        );

      case 'checking':
        return (
          <CheckingScreen
            onDone={() => {
              setHistory([]);
              setStep('result');
            }}
          />
        );

      case 'result':
        return (
          <ResultScreen
            draft={draft}
            evidence={evidence!}
            assessment={assessment!}
            onWhy={() => go('why')}
            onDisagree={() => go('disagree')}
            onTrack={() => {
              /* An approved claim still gets a reference the farmer can quote. */
              setCaseId((existing) => existing ?? makeCaseId());
              go('status');
            }}
          />
        );

      case 'why':
        return (
          <WhyScreen
            draft={draft}
            evidence={evidence!}
            assessment={assessment!}
            onContinue={() => go('match')}
            onDisagree={() => go('disagree')}
            onBack={back}
          />
        );

      case 'match':
        return <MatchScreen onAgree={() => go('confirmed')} onDisagree={() => go('disagree')} />;

      case 'confirmed':
        return <ConfirmedScreen onDone={restart} />;

      case 'disagree':
        return (
          <DisagreeScreen
            onSubmit={(d) => {
              setDisagreement(d);
              setCaseId((existing) => existing ?? makeCaseId());
              go('submitted');
            }}
          />
        );

      case 'submitted':
        return (
          <SubmittedScreen
            caseId={caseId!}
            onDone={() => {
              setHistory([]);
              setStep('status');
            }}
          />
        );

      case 'status':
        return (
          <StatusScreen
            knownCaseId={caseId}
            awaitingHumanReview={disagreement !== null}
            onDone={restart}
          />
        );
    }
  }, [step, draft, evidence, assessment, caseId, disagreement, go, back, restart, runAssessment]);

  return (
    <LangContext.Provider value={lang}>
      <div className="kiosk">
        <div className="frame">
          {step !== 'language' && (
            <Topbar
              canGoBack={canGoBack}
              onBack={back}
              onRestart={restart}
              claimStep={claimStepIndex >= 0 ? claimStepIndex + 1 : null}
              claimTotal={CLAIM_STEPS.length}
            />
          )}
          {screen}
        </div>
      </div>

      <DemoPanel
        active={scenario}
        onPick={(s) => {
          setScenario(s);
          /* If a result is already on screen, recompute it immediately so the
             scenario switch is visible without redoing the questionnaire. */
          if (assessment && draft.peril && draft.extent) {
            const base = collectEvidence(draft.villageId!, draft.cropId!, draft.peril, draft.timing!);
            const override = s === 'live' ? {} : DEMO_SCENARIOS[s];
            const ev: Evidence = { ...base, ...override };
            setEvidence(ev);
            setAssessment(
              assess(
                draft.peril,
                draft.extent,
                ev,
                draft.farmer!.sumInsuredPerAcre,
                draft.farmer!.insuredAcres,
              ),
            );
          }
        }}
      />
    </LangContext.Provider>
  );
}

/* ------------------------------------------------------------------ Chrome */

function Topbar({
  canGoBack,
  onBack,
  onRestart,
  claimStep,
  claimTotal,
}: {
  canGoBack: boolean;
  onBack: () => void;
  onRestart: () => void;
  claimStep: number | null;
  claimTotal: number;
}) {
  const { t } = useT();
  return (
    <header className="topbar">
      {canGoBack ? (
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← {t('btn.back')}
        </button>
      ) : (
        <div className="brandmark">
          <span className="brandmark__seal" aria-hidden="true">
            🌾
          </span>
          {t('welcome.name')}
        </div>
      )}
      <div className="topbar__spacer" />
      {claimStep !== null && <ProgressPill step={claimStep} total={claimTotal} />}
      <button
        type="button"
        className="btn btn--ghost"
        onClick={onRestart}
        aria-label={t('btn.startover')}
      >
        ⟲
      </button>
    </header>
  );
}

/**
 * Demo control. Not part of the farmer-facing product — it pins the evidence to
 * one of the three worked examples from the design document so each outcome can
 * be shown on demand. "Live" uses the generated readings for the claim.
 */
function DemoPanel({
  active,
  onPick,
}: {
  active: keyof typeof DEMO_SCENARIOS | 'live';
  onPick: (s: keyof typeof DEMO_SCENARIOS | 'live') => void;
}) {
  const [open, setOpen] = useState(false);

  const items: { id: keyof typeof DEMO_SCENARIOS | 'live'; label: string }[] = [
    { id: 'live', label: 'Live — generated from the claim' },
    { id: 'approved', label: '✅ 68 mm · 71% stress · 4 km' },
    { id: 'review', label: '⚠️ 42 mm · 20% stress · 21 km' },
    { id: 'denied', label: '❌ 18 mm · 3% stress · 2 km' },
  ];

  return (
    <div className="demo">
      {open && (
        <div className="demo__panel">
          <h3>Evidence scenario</h3>
          <p>
            Pins the weather and satellite readings so each outcome can be demonstrated. The
            verdict is still computed by the engine, never hard-coded.
          </p>
          {items.map((i) => (
            <button
              key={i.id}
              type="button"
              className={`demo__btn ${active === i.id ? 'demo__btn--on' : ''}`}
              onClick={() => onPick(i.id)}
            >
              {i.label}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="demo__toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '✕ Close' : '⚙ Demo'}
      </button>
    </div>
  );
}

/* Re-exported so a future kiosk shell can localise outside React. */
export { translate };
