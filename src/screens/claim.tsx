import { useEffect, useState } from 'react';
import { Button, Option, Screen, SearchBox } from '../components/ui';
import { useT, type TKey } from '../i18n';
import { CROPS, PERILS, TIMINGS, getCrop, getVillage, suggestedCrops } from '../data/registry';
import type { ClaimDraft, Extent, Peril, Season, Timing } from '../types';

/* --------------------------------------------------- SCREEN 6 — Season */

const SEASONS: { id: Season; icon: string }[] = [
  { id: 'kharif', icon: '🌧️' },
  { id: 'rabi', icon: '❄️' },
  { id: 'zaid', icon: '🌱' },
];

export function SeasonScreen({ onPick }: { onPick: (s: Season) => void }) {
  const { t } = useT();
  const [choice, setChoice] = useState<Season | null>(null);

  return (
    <Screen
      title={t('season.title')}
      note={t('season.foot')}
      footer={
        <Button disabled={!choice} onClick={() => choice && onPick(choice)}>
          {t('btn.continue')}
        </Button>
      }
    >
      <div className="options">
        {SEASONS.map((s) => (
          <Option
            key={s.id}
            icon={s.icon}
            label={t(`season.${s.id}` as TKey)}
            hint={t(`season.${s.id}.hint` as TKey)}
            selected={choice === s.id}
            onClick={() => setChoice(s.id)}
          />
        ))}
      </div>
    </Screen>
  );
}

/* ----------------------------------------------------- SCREEN 7 — Crop */

export function CropScreen({
  season,
  villageName,
  onPick,
}: {
  season: Season;
  villageName: string;
  onPick: (cropId: string) => void;
}) {
  const { t } = useT();
  const [choice, setChoice] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const suggested = suggestedCrops(season);
  const q = query.trim().toLowerCase();

  /* Search reaches the whole catalogue, not just the season's shortlist — the
     suggestion is a convenience and must never block a real answer. */
  const shown = q
    ? CROPS.filter((c) => t(`crop.${c.id}` as TKey).toLowerCase().includes(q) || c.id.includes(q))
    : suggested;

  return (
    <Screen
      title={t('crop.title')}
      note={t('crop.foot')}
      footer={
        <Button disabled={!choice} onClick={() => choice && onPick(choice)}>
          {t('btn.continue')}
        </Button>
      }
    >
      <SearchBox value={query} onChange={setQuery} placeholder={t('crop.search')} />

      {!q && (
        <p className="eyebrow">
          {t('crop.based')}: {villageName} · {t(`season.${season}` as TKey)}
        </p>
      )}

      <div className="options options--grid">
        {shown.map((c) => (
          <Option
            key={c.id}
            icon={c.emoji}
            label={t(`crop.${c.id}` as TKey)}
            selected={choice === c.id}
            onClick={() => setChoice(c.id)}
          />
        ))}
      </div>
    </Screen>
  );
}

/* -------------------------------------------- SCREEN 8 — What happened */

const PERIL_ICON: Record<Peril, string> = {
  excess_rain: '🌧️',
  deficit_rain: '☀️',
  hailstorm: '🧊',
  flood: '🌊',
  storm: '🌪️',
  pest_disease: '🐛',
};

export function PerilScreen({ onPick }: { onPick: (p: Peril) => void }) {
  const { t } = useT();
  const [choice, setChoice] = useState<Peril | null>(null);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const shown = q
    ? PERILS.filter((p) => t(`peril.${p}` as TKey).toLowerCase().includes(q))
    : PERILS;

  return (
    <Screen
      title={t('peril.title')}
      note={t('peril.foot')}
      footer={
        <Button disabled={!choice} onClick={() => choice && onPick(choice)}>
          {t('btn.continue')}
        </Button>
      }
    >
      <SearchBox value={query} onChange={setQuery} placeholder={t('peril.search')} />
      <div className="options">
        {shown.map((p) => (
          <Option
            key={p}
            icon={PERIL_ICON[p]}
            label={t(`peril.${p}` as TKey)}
            selected={choice === p}
            onClick={() => setChoice(p)}
          />
        ))}
      </div>
    </Screen>
  );
}

/* --------------------------------------------------- SCREEN 9 — Timing */

export function TimingScreen({ onPick }: { onPick: (v: Timing) => void }) {
  const { t } = useT();
  const [choice, setChoice] = useState<Timing | null>(null);

  return (
    <Screen
      title={t('time.title')}
      note={t('time.foot')}
      footer={
        <Button disabled={!choice} onClick={() => choice && onPick(choice)}>
          {t('btn.continue')}
        </Button>
      }
    >
      <div className="options">
        {TIMINGS.map((v) => (
          <Option
            key={v}
            icon="📅"
            label={t(`time.${v}` as TKey)}
            selected={choice === v}
            onClick={() => setChoice(v)}
          />
        ))}
      </div>
    </Screen>
  );
}

/* -------------------------------------------------- SCREEN 10 — Extent */

const EXTENTS: Extent[] = ['small', 'half', 'most', 'entire'];
const EXTENT_ICON: Record<Extent, string> = {
  small: '▫️',
  half: '◧',
  most: '◼️',
  entire: '⬛',
};

export function ExtentScreen({ onPick }: { onPick: (v: Extent) => void }) {
  const { t } = useT();
  const [choice, setChoice] = useState<Extent | null>(null);

  return (
    <Screen
      title={t('ext.title')}
      note={t('ext.foot')}
      footer={
        <Button disabled={!choice} onClick={() => choice && onPick(choice)}>
          {t('btn.continue')}
        </Button>
      }
    >
      <div className="options">
        {EXTENTS.map((v) => (
          <Option
            key={v}
            icon={EXTENT_ICON[v]}
            label={t(`ext.${v}` as TKey)}
            selected={choice === v}
            onClick={() => setChoice(v)}
          />
        ))}
      </div>
    </Screen>
  );
}

/* ------------------------------------------------- SCREEN 11 — Summary */

export function SummaryScreen({
  draft,
  onSubmit,
}: {
  draft: ClaimDraft;
  onSubmit: () => void;
}) {
  const { t } = useT();
  const village = getVillage(draft.villageId)!;
  const crop = getCrop(draft.cropId)!;

  const rows: { icon: string; label: string; value: string }[] = [
    {
      icon: '📍',
      label: t('sum.location'),
      value: `${village.name}, ${village.district}, ${village.state}`,
    },
    { icon: '🌦️', label: t('sum.season'), value: t(`season.${draft.season}` as TKey) },
    { icon: '🌾', label: t('sum.crop'), value: t(`crop.${crop.id}` as TKey) },
    { icon: '🌧️', label: t('sum.problem'), value: t(`peril.${draft.peril}` as TKey) },
    { icon: '📅', label: t('sum.when'), value: t(`time.${draft.timing}` as TKey) },
    { icon: '🌾', label: t('sum.extent'), value: t(`ext.${draft.extent}` as TKey) },
    {
      icon: '📋',
      label: t('sum.policy'),
      value: `${draft.farmer!.scheme} — ${draft.farmer!.name}`,
    },
  ];

  return (
    <Screen
      title={t('sum.title')}
      footer={<Button onClick={onSubmit}>{t('sum.submit')}</Button>}
    >
      <div className="card">
        {rows.map((r) => (
          <div className="factrow" key={r.label}>
            <span className="factrow__icon" aria-hidden="true">
              {r.icon}
            </span>
            <div style={{ flex: 1 }}>
              <div className="factrow__label">{r.label}</div>
              <div className="factrow__value">{r.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

/* ------------------------------------------------ SCREEN 12 — Checking */

const CHECK_STEPS: TKey[] = ['check.s1', 'check.s2', 'check.s3', 'check.s4', 'check.s5'];

export function CheckingScreen({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (stage >= CHECK_STEPS.length) {
      const id = window.setTimeout(onDone, 450);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setStage((s) => s + 1), 620);
    return () => window.clearTimeout(id);
  }, [stage, onDone]);

  return (
    <Screen title={t('check.title')} lead={t('check.sub')} note={t('check.foot')}>
      <ul className="steps">
        {CHECK_STEPS.map((key, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li
              key={key}
              className={`steps__item ${done ? 'steps__item--done' : ''} ${
                active ? 'steps__item--active' : ''
              }`}
            >
              <span className="steps__mark" aria-hidden="true">
                {done ? '✓' : active ? '' : ''}
              </span>
              <span>{t(key)}</span>
              {active && <span className="spinner" style={{ marginLeft: 'auto' }} aria-hidden="true" />}
            </li>
          );
        })}
      </ul>
      {/* Large light numerals, as on the reference's "01/04" card. */}
      <div className="numeral" style={{ marginTop: 26 }} aria-hidden="true">
        {String(Math.min(stage + 1, CHECK_STEPS.length)).padStart(2, '0')}
        <small>/{String(CHECK_STEPS.length).padStart(2, '0')}</small>
      </div>

      <p className="sr-only" role="status">
        {stage >= CHECK_STEPS.length ? t('check.title') : t(CHECK_STEPS[stage])}
      </p>
    </Screen>
  );
}
