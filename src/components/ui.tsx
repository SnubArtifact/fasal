import type { ReactNode } from 'react';
import { useT } from '../i18n';
import type { Assessment, Verdict } from '../types';

/* ------------------------------------------------------------------ Shell */

interface ScreenProps {
  title?: string;
  lead?: string;
  children: ReactNode;
  /** Footnote explaining why the app asks for this. */
  note?: string;
  footer?: ReactNode;
}

export function Screen({ title, lead, children, note, footer }: ScreenProps) {
  return (
    <main className="screen">
      {title && <h1>{title}</h1>}
      {lead && <p className="lead">{lead}</p>}
      {children}
      {(note || footer) && (
        <div className="screen__foot">
          {footer}
          {note && (
            <p className="note" style={{ marginTop: footer ? 18 : 0 }}>
              <span aria-hidden="true">ℹ️</span>
              <span>{note}</span>
            </p>
          )}
        </div>
      )}
    </main>
  );
}

/* ---------------------------------------------------------------- Buttons */

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  arrow,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  type?: 'button' | 'submit';
  /** Trailing dark square with an arrow, as on the reference's CTAs. */
  arrow?: boolean;
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      {arrow && (
        <span className="arrowchip" aria-hidden="true">
          ↗
        </span>
      )}
    </button>
  );
}

/** Text-left, landscape-right row — the reference's core card pattern. */
export function Feature({
  title,
  text,
  scene,
  forest,
}: {
  title: string;
  text: string;
  scene: ReactNode;
  /** Deep-forest emphasis, as on "Built for Scale". */
  forest?: boolean;
}) {
  return (
    <div className={`feature ${forest ? 'feature--forest' : ''}`}>
      <div className="feature__body">
        <p className="feature__title">{title}</p>
        <p className="feature__text">{text}</p>
      </div>
      {scene}
    </div>
  );
}

/* ----------------------------------------------------- Selectable option */

export function Option({
  icon,
  label,
  hint,
  selected,
  onClick,
  disabled,
  tag,
  multi,
}: {
  icon?: string;
  label: string;
  hint?: string;
  selected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  tag?: string;
  /** Renders a checkbox instead of a tick, for select-many lists. */
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      className="option"
      aria-pressed={!!selected}
      onClick={onClick}
      disabled={disabled}
    >
      {multi && (
        <span className="checkbox" aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      )}
      {icon && !multi && (
        <span className="option__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="option__body">
        <span className="option__label">{label}</span>
        {hint && <span className="option__hint">{hint}</span>}
      </span>
      {tag && <span className="option__tag">{tag}</span>}
      {!multi && selected && (
        <span className="option__tick" aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------ Fact rows */

export function FactRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="factrow">
      <span className="factrow__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <div className="factrow__label">{label}</div>
        <div className="factrow__value">{value}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- Evidence block */

export type ChipTone = 'good' | 'warn' | 'bad' | 'neutral';

const CHIP_MARK: Record<ChipTone, string> = {
  good: '✅',
  warn: '🟡',
  bad: '❌',
  neutral: '•',
};

export function EvidenceBlock({
  icon,
  title,
  value,
  sub,
  chip,
  tone = 'neutral',
}: {
  icon: string;
  title: string;
  value: ReactNode;
  sub?: ReactNode;
  chip?: string;
  tone?: ChipTone;
}) {
  return (
    <section className="evidence">
      <div className="evidence__head">
        <span aria-hidden="true" style={{ fontSize: '1.5rem' }}>
          {icon}
        </span>
        <span className="evidence__title">{title}</span>
      </div>
      <div className="evidence__value">{value}</div>
      {sub && <div className="evidence__sub">{sub}</div>}
      {chip && (
        <div className={`chip chip--${tone}`}>
          <span aria-hidden="true">{CHIP_MARK[tone]}</span>
          <span>{chip}</span>
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------- Confidence */

/**
 * Shows the confidence number, its band, and — deliberately — the threshold
 * at which the system stops deciding by itself. A farmer can see how near
 * their case sat to that line.
 */
export function ConfidenceMeter({
  confidence,
  band,
  gate,
}: {
  confidence: number;
  band: Assessment['band'];
  gate?: number;
}) {
  const { t } = useT();
  const bandLabel = { high: t('res.high'), moderate: t('res.moderate'), low: t('res.low') }[
    band
  ];
  const pct = Math.round(confidence * 100);

  return (
    <div className="confidence">
      <div className="confidence__row">
        <span className="eyebrow" style={{ margin: 0 }}>
          {t('res.confidence')}
        </span>
        <span className="confidence__band">{bandLabel}</span>
      </div>
      <div className="confidence__value">{pct}%</div>
      <div
        className="meter"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${t('res.confidence')}: ${pct}% — ${bandLabel}`}
        style={{ marginTop: 12 }}
      >
        <div className={`meter__fill meter__fill--${band}`} style={{ width: `${pct}%` }} />
        {gate !== undefined && (
          <div className="meter__gate" style={{ left: `${Math.round(gate * 100)}%` }} />
        )}
      </div>
      {gate !== undefined && (
        <div className="meter__legend">
          <span>0%</span>
          <span>
            ▲ {Math.round(gate * 100)}% — {t('res.confidence')}
          </span>
          <span>100%</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Progress */

export function ProgressPill({ step, total }: { step: number; total: number }) {
  const { t } = useT();
  return (
    <div className="progress" aria-label={`${t('nav.step')} ${step} ${t('nav.of')} ${total}`}>
      <span>
        {step}/{total}
      </span>
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Search */

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="search">
      <span className="search__icon" aria-hidden="true">
        🔍
      </span>
      <input
        className="input input--text"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

/* ---------------------------------------------------------- Verdict head */

export const VERDICT_MARK: Record<Verdict, string> = {
  approved: '✅',
  needs_review: '⚠️',
  not_approved: '❌',
};

export function VerdictBanner({ verdict, text }: { verdict: Verdict; text: string }) {
  return (
    <div className={`verdict verdict--${verdict}`} role="status">
      <span className="verdict__mark" aria-hidden="true">
        {VERDICT_MARK[verdict]}
      </span>
      <p className="verdict__text">{text}</p>
    </div>
  );
}
