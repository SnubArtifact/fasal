import { useMemo, useState } from 'react';
import { Button, FactRow, Feature, Option, Screen, SearchBox } from '../components/ui';
import { Scene, Thumb } from '../components/scenery';
import { LANGUAGES, getRecentLanguages, translate, useT } from '../i18n';
import { FARMERS, VILLAGES, getFarmer, getVillage } from '../data/registry';
import type { Farmer, LangCode, Village } from '../types';

/* ------------------------------------------------- SCREEN 1 — Language */

export function LanguageScreen({ onPick }: { onPick: (code: LangCode) => void }) {
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState<LangCode | null>(null);
  const recent = useMemo(() => getRecentLanguages(), []);

  const matches = LANGUAGES.filter((l) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return l.native.toLowerCase().includes(q) || l.latin.toLowerCase().includes(q);
  });

  const recentOptions = recent
    .map((code) => LANGUAGES.find((l) => l.code === code))
    .filter((l): l is (typeof LANGUAGES)[number] => !!l);

  return (
    <main className="screen">
      {/* Bilingual until a language is chosen — a farmer who reads only one of
          the two must still be able to find the control. */}
      <h1 style={{ marginBottom: 20 }}>Choose your language / अपनी भाषा चुनें</h1>

      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Search language / भाषा खोजें"
      />

      {recentOptions.length > 0 && !query && (
        <>
          <p className="eyebrow">Recently used / हाल में चुनी गई</p>
          <div className="options" style={{ marginBottom: 24 }}>
            {recentOptions.map((l) => (
              <Option
                key={`recent-${l.code}`}
                icon="🕘"
                label={l.native}
                hint={l.latin}
                selected={choice === l.code}
                onClick={() => setChoice(l.code)}
              />
            ))}
          </div>
        </>
      )}

      <div className="options">
        {matches.map((l) => (
          <Option
            key={l.code}
            label={l.native}
            hint={l.latin}
            selected={choice === l.code}
            disabled={!l.ready}
            tag={l.ready ? undefined : 'Coming soon'}
            onClick={() => setChoice(l.code)}
          />
        ))}
        {matches.length === 0 && (
          <p className="muted">No language matches that search. / इस खोज से कोई भाषा नहीं मिली।</p>
        )}
      </div>

      <div className="screen__foot">
        <Button disabled={!choice} onClick={() => choice && onPick(choice)}>
          {choice ? translate(choice, 'lang.start') : 'Start claim / दावा शुरू करें'}
        </Button>
      </div>
    </main>
  );
}

/* -------------------------------------------------- SCREEN 2 — Welcome */

export function WelcomeScreen({
  onBegin,
  onStatus,
}: {
  onBegin: () => void;
  onStatus: () => void;
}) {
  const { t, lang } = useT();

  /* The serif italic accent only reads well in Latin script, so Hindi keeps
     the plain wordmark rather than a form Devanagari has no equivalent for. */
  const wordmark =
    lang === 'hi' ? (
      t('welcome.name')
    ) : (
      <>
        Fasal<span className="accent">Nyay</span>
      </>
    );

  return (
    <main className="screen">
      <Scene variant="valley" tall>
        <p className="scene__sub" style={{ margin: 0, opacity: 0.9 }}>
          {t('welcome.sub')}
        </p>
        <div className="scene__spacer" />
        <h1 className="scene__title">{wordmark}</h1>
        <p className="scene__sub">{t('welcome.body')}</p>
      </Scene>

      <Feature
        title={t('welcome.p1')}
        text={t('welcome.p1sub')}
        scene={<Thumb variant="hills" />}
      />
      <Feature
        title={t('welcome.p2')}
        text={t('welcome.p2sub')}
        scene={<Thumb variant="field" />}
        forest
      />
      <Feature
        title={t('welcome.p3')}
        text={t('welcome.p3sub')}
        scene={<Thumb variant="terrace" />}
      />

      <div className="screen__foot">
        <div className="btnstack">
          <Button onClick={onBegin} arrow>
            {t('welcome.begin')}
          </Button>
          <Button variant="secondary" onClick={onStatus}>
            {t('welcome.status')}
          </Button>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------- SCREEN 3 — Identify */

export function IdentifyScreen({ onFound }: { onFound: (farmer: Farmer) => void }) {
  const { t } = useT();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [scanning, setScanning] = useState(false);

  const submit = (raw: string) => {
    const farmer = getFarmer(raw);
    if (farmer) {
      setError(false);
      onFound(farmer);
    } else {
      setError(true);
    }
  };

  /* Card scan stands in for the kiosk's NFC/QR reader. */
  const scan = () => {
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      onFound(FARMERS[0]);
    }, 1200);
  };

  return (
    <Screen title={t('id.title')} lead={t('id.sub')} note={t('id.foot')}>
      {error && (
        <div className="alert" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>{t('id.notfound')}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <label className="field">
          <span className="field__label">{t('id.label')}</span>
          <input
            className="input"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.toUpperCase());
              setError(false);
            }}
            placeholder="FRM-10284"
            autoComplete="off"
            inputMode="text"
            aria-invalid={error}
          />
        </label>

        <Button type="submit" disabled={value.trim().length < 3}>
          {t('btn.continue')}
        </Button>
      </form>

      <div className="divider">{t('id.or')}</div>

      <Button variant="secondary" onClick={scan} disabled={scanning}>
        {scanning ? (
          <>
            <span className="spinner" aria-hidden="true" />
            {t('id.scanning')}
          </>
        ) : (
          <>📷 {t('id.scan')}</>
        )}
      </Button>

      {/* Demo affordance: a real kiosk would not print valid IDs on screen. */}
      <div className="card card--flat" style={{ marginTop: 22 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          {t('id.demohint')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {FARMERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="demo__btn"
              style={{ width: 'auto', margin: 0 }}
              onClick={() => {
                setValue(f.id);
                submit(f.id);
              }}
            >
              {f.id} · {getVillage(f.villageId)?.name}
            </button>
          ))}
        </div>
      </div>
    </Screen>
  );
}

/* --------------------------------------------- SCREEN 4 — Confirm farm */

export function ConfirmFarmScreen({
  farmer,
  onYes,
  onNo,
}: {
  farmer: Farmer;
  onYes: () => void;
  onNo: () => void;
}) {
  const { t, n } = useT();
  const village = getVillage(farmer.villageId)!;

  return (
    <Screen title={t('farm.title')} note={t('farm.foot')}>
      <div className="card">
        <FactRow icon="👨‍🌾" label={t('farm.farmer')} value={farmer.name} />
        <FactRow
          icon="📍"
          label={t('farm.registered')}
          value={`${village.name}, ${village.district}, ${village.state}`}
        />
        <FactRow
          icon="📐"
          label={t('farm.area')}
          value={`${n(farmer.insuredAcres)} ${t('farm.acres')}`}
        />
        <FactRow
          icon="📋"
          label={t('farm.insurance')}
          value={`${farmer.scheme} — ${farmer.policyActive ? t('farm.active') : '—'}`}
        />
      </div>

      <p className="lead">{t('farm.ask')}</p>

      <div className="btnstack">
        <Button onClick={onYes}>{t('farm.yes')}</Button>
        <Button variant="secondary" onClick={onNo}>
          {t('farm.no')}
        </Button>
      </div>
    </Screen>
  );
}

/* --------------------------------------------- SCREEN 5 — Farm location */

export function LocationScreen({
  kioskVillage,
  onConfirm,
}: {
  kioskVillage: Village;
  onConfirm: (villageId: string) => void;
}) {
  const { t } = useT();
  const [picking, setPicking] = useState(false);

  return (
    <Screen note={t('loc.foot')}>
      <p className="eyebrow">{t('loc.serves')}</p>
      <h1 style={{ marginBottom: 24 }}>
        📍 {kioskVillage.name}, {kioskVillage.district}, {kioskVillage.state}
      </h1>

      {!picking ? (
        <>
          <p className="lead">{t('loc.ask')}</p>
          <div className="options">
            <Option icon="✅" label={t('loc.yes')} onClick={() => onConfirm(kioskVillage.id)} />
            <Option icon="🧭" label={t('loc.no')} onClick={() => setPicking(true)} />
          </div>
        </>
      ) : (
        <>
          <p className="lead">{t('loc.pick')}</p>
          <div className="options">
            {VILLAGES.map((v) => (
              <Option
                key={v.id}
                icon="📍"
                label={v.name}
                /* Station distance is shown up front. It is a property of where
                   the farm is, not something the farmer should discover only
                   once it has already shaped their result. */
                hint={`${t('loc.station')}: ${v.stationName} — ${v.stationDistanceKm} ${t('loc.away')}`}
                onClick={() => onConfirm(v.id)}
              />
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <Button variant="ghost" onClick={() => setPicking(false)}>
              ← {t('btn.back')}
            </Button>
          </div>
        </>
      )}
    </Screen>
  );
}
