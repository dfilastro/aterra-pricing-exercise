'use client';

import { pct, pctPoints, usd, usdWhole } from '@/lib/format';
import { computeQuote, inQuote } from '@/lib/pricing';
import { patchLine, resetQuote, type LinePatch } from '@/lib/quote-api';
import type { LineItem, Quote, SectionName } from '@/lib/types';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GiMountainClimbing } from 'react-icons/gi';
import { LiaMoneyBillSolid } from 'react-icons/lia';
import { MdOutlineBed } from 'react-icons/md';
import { PiCar } from 'react-icons/pi';
import { RxPeople } from 'react-icons/rx';
import PercentControl from './PercentControl';

type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
type LineSaveStatus = 'pending' | 'saving' | 'error';

const AUTOSAVE_DELAY_MS = 2500;

const NAV = [
  { group: 'Work', items: ['Today', 'Inbox', 'Operations'] },
  { group: 'Pipeline', items: ['Sales', 'Trips', 'CRM'] },
  { group: 'Studio', items: ['Itinerary builder', 'Templates'] },
  { group: 'Supply', items: ['Supply'] },
  { group: 'Money', items: ['Invoices', 'Finance', 'Analytics'] },
  { group: 'System', items: ['API & integrations', 'Settings'] },
];

export default function PriceScreen({ initialQuote }: { initialQuote: Quote }) {
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [save, setSave] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lineSaves, setLineSaves] = useState<Record<string, LineSaveStatus>>({});
  const pending = useRef<Record<string, LinePatch>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inFlight = useRef(0);
  const flushing = useRef(new Set<string>());
  const [openSections, setOpenSections] = useState<Record<SectionName, boolean>>({
    ACCOMMODATION: true,
    TRANSPORT: true,
    ACTIVITIES: true,
  });

  const computed = useMemo(() => computeQuote(quote), [quote]);
  const { totals, issues } = computed;
  const blocked = issues.overCeiling || issues.unpriced.length > 0 || issues.overlaps.length > 0;
  const overlapById = useMemo(() => {
    const map = new Map<string, LineItem>();
    for (const { a, b } of issues.overlaps) {
      map.set(a.id, b);
      map.set(b.id, a);
    }
    return map;
  }, [issues.overlaps]);

  const setLineSave = (lineId: string, status: LineSaveStatus | null) => {
    setLineSaves((s) => {
      if (status === null) {
        if (!(lineId in s)) return s;
        const next = { ...s };
        delete next[lineId];
        return next;
      }
      if (s[lineId] === status) return s;
      return { ...s, [lineId]: status };
    });
  };

  const headerFromQueues = () => {
    if (inFlight.current > 0) return 'saving' as const;
    if (Object.keys(pending.current).length > 0) return 'pending' as const;
    return 'saved' as const;
  };

  const flush = useCallback(async (lineId: string) => {
    if (flushing.current.has(lineId)) return;
    const patch = pending.current[lineId];
    if (!patch) return;
    flushing.current.add(lineId);
    clearTimeout(timers.current[lineId]);
    inFlight.current += 1;
    setLineSave(lineId, 'saving');
    setSave('saving');
    setSaveError(null);
    try {
      await patchLine(lineId, patch);
      if (pending.current[lineId] === patch) delete pending.current[lineId];
    } catch (e) {
      setSave('error');
      setSaveError(e instanceof Error ? e.message : 'Save failed');
      setLineSave(lineId, 'error');
      return;
    } finally {
      flushing.current.delete(lineId);
      inFlight.current -= 1;
    }
    if (pending.current[lineId]) {
      setLineSave(lineId, 'pending');
      void flush(lineId);
      return;
    }
    setLineSave(lineId, null);
    setSave((s) =>
      s === 'error' && Object.keys(pending.current).length > 0 ? s : headerFromQueues(),
    );
  }, []);

  const schedule = useCallback(
    (lineId: string, patch: LinePatch) => {
      pending.current[lineId] = { ...pending.current[lineId], ...patch };
      clearTimeout(timers.current[lineId]);
      timers.current[lineId] = setTimeout(() => void flush(lineId), AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  const updateLine = (lineId: string, patch: LinePatch) => {
    setQuote((q) => ({
      ...q,
      lines: q.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
    }));
    setLineSaves((s) => ({
      ...s,
      [lineId]: s[lineId] === 'saving' ? 'saving' : 'pending',
    }));
    setSave((s) => (s === 'saving' ? s : 'pending'));
    schedule(lineId, patch);
  };

  const retrySave = () => {
    setSaveError(null);
    const ids = Object.keys(pending.current);
    if (ids.length === 0) {
      setSave('idle');
      return;
    }
    ids.forEach((id) => void flush(id));
  };

  const handleReset = async () => {
    Object.values(timers.current).forEach(clearTimeout);
    pending.current = {};
    setLineSaves({});
    setQuote(await resetQuote());
    setSave('idle');
    setSaveError(null);
  };

  const fillPct = Math.min(100, (totals.clientPays / quote.clientCeiling) * 100);

  return (
    <div className='flex min-h-screen bg-cream text-ink'>
      <aside className='hidden w-[220px] shrink-0 flex-col border-r border-line bg-sidebar px-4 py-5 lg:flex'>
        <div className='flex items-center gap-2 px-1'>
          <span className='grid h-7 w-7 place-items-center rounded-md bg-terracotta text-[11px] font-semibold text-paper'>
            A
          </span>
          <span className='text-[15px] font-semibold tracking-tight'>AterraAI</span>
        </div>
        <button
          type='button'
          className='mt-5 w-full rounded-lg bg-terracotta py-2 text-[13px] font-medium text-paper'
        >
          + New proposal
        </button>
        <nav className='mt-6 flex-1 space-y-5 text-[13px]'>
          {NAV.map((section) => (
            <div key={section.group}>
              <div className='px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted'>
                {section.group}
              </div>
              <ul className='mt-1 space-y-0.5'>
                {section.items.map((item) => {
                  const active = item === 'Sales';
                  return (
                    <li key={item}>
                      <span
                        className={`block rounded-md px-2 py-1 ${
                          active ? 'bg-[#f0d3c4] font-medium text-terracotta-deep' : 'text-ink/80'
                        }`}
                      >
                        {item}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className='mt-auto border-t border-line pt-4'>
          <div className='text-[13px] font-medium'>Amanda Kam</div>
          <div className='text-[11px] text-muted'>Aterra Africa</div>
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex items-center justify-between border-b border-line px-6 py-3'>
          <div className='text-[12px] text-muted'>Sales / New proposal</div>
          <div className='flex items-center gap-2'>
            <SavePill state={save} onRetry={retrySave} />
            <button
              type='button'
              className='rounded-md border border-line bg-paper px-3 py-1.5 text-[12px]'
            >
              Preview as client
            </button>
          </div>
        </header>

        <div className='flex items-end justify-between gap-4 px-6 pt-5'>
          <div>
            <h1 className='font-display text-[22px] font-medium leading-tight tracking-tight'>
              New proposal: Johnson Honeymoon
            </h1>
            <p className='mt-1 text-[13px] text-muted'>
              {quote.trip} · {quote.dates} · via {quote.advisor} · {quote.pax} travellers ·{' '}
              {quote.reference}
            </p>
          </div>
          <div className='flex shrink-0 items-center gap-2'>
            <button
              type='button'
              className='rounded-md border border-line bg-paper px-3 py-1.5 text-[12px]'
            >
              Back
            </button>
            <button
              type='button'
              disabled={blocked}
              title={
                blocked
                  ? issues.overlaps.length
                    ? 'Two rooms on the same nights — do not send'
                    : issues.overCeiling
                      ? 'Over the client ceiling — do not send'
                      : 'Unpriced services still in the quotation'
                  : undefined
              }
              className='rounded-md bg-terracotta px-3 py-1.5 text-[12px] font-medium text-paper disabled:cursor-not-allowed disabled:opacity-40'
            >
              Next: Design
            </button>
          </div>
        </div>

        <ol className='mx-6 mt-4 flex overflow-hidden rounded-lg border border-line bg-paper text-[12px]'>
          {[
            { n: '1', label: 'Brief', done: true },
            { n: '2', label: 'Plan', done: true },
            { n: '3', label: 'Price', current: true },
            { n: '4', label: 'Design' },
            { n: '5', label: 'Review & send' },
          ].map((s) => (
            <li
              key={s.label}
              className={`flex flex-1 items-center gap-2 border-r border-line px-3 py-2 last:border-r-0 ${
                s.current ? 'bg-terracotta text-paper' : s.done ? 'text-ink' : 'text-muted'
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                  s.current
                    ? 'bg-paper/20'
                    : s.done
                      ? 'bg-sage-soft text-sage'
                      : 'bg-cream text-muted'
                }`}
              >
                {s.done && !s.current ? '✓' : s.n}
              </span>
              {s.label}
            </li>
          ))}
        </ol>

        <div className='mx-6 mt-4 rounded-xl border border-line bg-paper p-4 shadow-card'>
          <div className='flex flex-wrap items-baseline justify-between gap-3'>
            <div>
              <div className='font-medium uppercase tracking-[0.16em] text-muted'>Budget</div>
              <div className='mt-1 text-[13px]'>
                client ceiling {usdWhole(quote.clientCeiling)}
                {issues.unpriced.length > 0 ? (
                  <span className='text-danger'>
                    {' '}
                    · incomplete — {usdWhole(totals.clientPays)} so far, {issues.unpriced.length}{' '}
                    {issues.unpriced.length === 1 ? 'service' : 'services'} unpriced
                  </span>
                ) : issues.overCeiling ? (
                  <span className='font-medium text-danger'>
                    {' '}
                    · you are {usdWhole(issues.amountOver)} over
                  </span>
                ) : (
                  <span> · you are {usdWhole(Math.max(0, issues.headroom))} under</span>
                )}
              </div>
            </div>
            <div className='text-right'>
              <div className='font-display text-[28px] leading-none tracking-tight'>
                {usdWhole(totals.clientPays)}
                <span className='ml-2 font-sans text-[12px] font-normal text-muted'>
                  {issues.unpriced.length > 0 ? 'client price so far' : 'client price'}
                </span>
              </div>
              <div className='mt-1 text-[12px] text-muted'>
                NETT {usdWhole(totals.nett)} · VAT {usdWhole(totals.vatAmount)} · GP{' '}
                {usdWhole(totals.gp)} ·{' '}
                <span
                  className={
                    totals.gp < 0
                      ? 'font-medium text-danger'
                      : issues.thinMargin
                        ? 'font-medium text-warn'
                        : 'font-medium text-sage'
                  }
                >
                  {pct(totals.gpPct)}
                </span>
              </div>
            </div>
          </div>

          <div className='relative mt-3 h-2.5 overflow-hidden rounded-full bg-cream'>
            <div
              className={`h-full ${
                issues.overCeiling
                  ? 'bg-danger'
                  : issues.unpriced.length
                    ? 'hatch bg-terracotta/80'
                    : 'bg-terracotta'
              }`}
              style={{ width: `${Math.max(issues.overCeiling ? 100 : fillPct, 2)}%` }}
            />
            {issues.unpriced.length > 0 && (
              <div className='pointer-events-none absolute inset-y-0 right-0 w-1/5 hatch' />
            )}
          </div>
        </div>

        <div className='mx-6 mt-3 space-y-2'>
          {issues.overCeiling && (
            <Alert tone='danger' title='Over the client ceiling'>
              {quote.client} said they will spend {usdWhole(quote.clientCeiling)}. This quotation is{' '}
              {usdWhole(issues.amountOver)} over. Sending it means going back to the client for more
              money — the most expensive mistake this screen allows. Reduce markup, drop a service,
              or ask them to raise the ceiling before Design.
            </Alert>
          )}
          {issues.overlaps.map(({ a, b }) => (
            <Alert key={`${a.id}-${b.id}`} tone='danger' title='Two rooms on the same nights'>
              {a.service} and {b.service} are both in this quotation for{' '}
              {a.dates === b.dates ? a.dates : `${a.dates} and ${b.dates}`}. {quote.pax}{' '}
              {quote.pax === 1 ? 'traveller does' : 'travellers do'} not need two rooms on the same
              nights. Uncheck one — {overlapKeepHint(a, b)} Nothing goes to the client until this is
              cleared.
            </Alert>
          ))}
          {issues.unpriced.map((line) => {
            const alternative = overlapById.get(line.id);
            const pricedAlt = alternative && alternative.nett !== null ? alternative : null;
            return (
              <Alert key={line.id} tone='danger' title='No contracted rate'>
                {`${line.service} is checked in with no price. Not zero — unknown. Uncheck it to leave it out of this quotation${
                  pricedAlt
                    ? ` (${pricedAlt.service} on ${
                        pricedAlt.dates === line.dates ? 'the same dates' : pricedAlt.dates
                      } ${pricedAlt.confirmed ? 'is confirmed' : 'already has a rate'})`
                    : ''
                }, or chase ${line.supplier}. Until then the ${usdWhole(totals.clientPays)} total is understated by an unknown amount, and this is not ready to send.`}
              </Alert>
            );
          })}
          {issues.lossLines.map(({ line, gp }) => (
            <Alert key={line.id} tone='warn' title='Priced below cost'>
              {line.service} is selling at a {usd(Math.abs(gp))} loss. {lossTripNote(totals.gpPct, line.mrkpPct)}
            </Alert>
          ))}
          {issues.thinMargin && (
            <Alert tone='warn' title='Thin trip margin'>
              Gross profit is {pct(totals.gpPct)} on what Aterra actually banks. No line is at a
              loss, but this is below a comfortable DMC margin for a trip of this value.
            </Alert>
          )}
          {save === 'error' && (
            <Alert tone='danger' title='Changes did not save'>
              {saveError ?? 'The last markup or commission change did not reach the server.'}{' '}
              <button type='button' className='underline' onClick={retrySave}>
                Retry
              </button>
            </Alert>
          )}
        </div>

        <div className='mx-6 mt-4 flex flex-wrap items-center gap-2 text-[12px]'>
          <div className='rounded-xl border border-line bg-paper px-2.5 py-1 text-muted flex gap-1 items-center'>
            <RxPeople className='size-4' /> Set {quote.pax} pax
          </div>
          <div className='rounded-xl border border-line bg-paper px-2.5 py-1 text-muted flex gap-1 items-center'>
            <LiaMoneyBillSolid className='size-4' />
            USD
          </div>
          {issues.lossLines.length > 0 && (
            <span className='rounded-md bg-warn-soft px-2.5 py-1 text-warn'>
              {issues.lossLines.length} {issues.lossLines.length === 1 ? 'line' : 'lines'} below cost
            </span>
          )}
          {issues.overlaps.length > 0 && (
            <span className='rounded-md bg-danger-soft px-2.5 py-1 text-danger'>
              overlapping stays
            </span>
          )}
          {issues.unpriced.length > 0 && (
            <span className='rounded-md bg-danger-soft px-2.5 py-1 text-danger'>
              {issues.unpriced.length} unpriced
            </span>
          )}
          <button
            type='button'
            onClick={() => void handleReset()}
            className='ml-auto text-muted hover:text-ink'
          >
            Reset quote
          </button>
        </div>

        <div className='mx-6 mt-3 mb-10 max-h-[min(70vh,calc(100dvh-8rem))] overflow-auto rounded-xl border border-line bg-paper shadow-card'>
          <table className='w-full min-w-[1280px] table-fixed border-separate border-spacing-0 text-[12.5px]'>
            <colgroup>
              <col className='w-[40px]' />
              <col className='w-[240px]' />
              <col className='w-[120px]' />
              <col className='w-[12px]' />
              <col className='w-[92px]' />
              <col className='w-[56px]' />
              <col className='w-[100px]' />
              <col className='w-[124px]' />
              <col className='w-[124px]' />
              <col className='w-[100px]' />
              <col className='w-[88px]' />
              <col className='w-[72px]' />
              <col className='w-[220px]' />
            </colgroup>
            <thead>
              <tr className='text-left text-[10px] font-medium uppercase tracking-[0.12em] text-muted [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:border-b [&_th]:border-line [&_th]:bg-paper'>
                <th className='px-2 py-2.5' aria-label='In this quotation' />
                <th className='px-3 py-2.5 font-medium'>Service / Supplier</th>
                <th className='whitespace-nowrap px-2 py-2.5 font-medium'>Dates / Units</th>
                <th className='px-2 py-2.5 font-medium' />
                <th className='whitespace-nowrap px-2 py-2.5 text-right font-medium'>Nett</th>
                <th className='whitespace-nowrap px-2 py-2.5 text-right font-medium'>VAT</th>
                <th className='whitespace-nowrap px-2 py-2.5 text-right font-medium'>Cost + VAT</th>
                <th className='whitespace-nowrap px-2 py-2.5 text-center font-medium'>Comm.</th>
                <th className='whitespace-nowrap px-2 py-2.5 text-center font-medium'>Mrkp.</th>
                <th className='whitespace-nowrap px-2 py-2.5 text-right font-medium'>
                  Client pays
                </th>
                <th className='whitespace-nowrap px-2 py-2.5 text-right font-medium'>GP</th>
                <th className='whitespace-nowrap px-2 py-2.5 text-right font-medium'>GP %</th>
                <th className='px-3 py-2.5 font-medium'>Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {computed.sections.map((section) => {
                const open = openSections[section.name];
                return (
                  <React.Fragment key={section.name}>
                    <tr
                      className='cursor-pointer bg-[#f3eadc] [&_td]:border-b [&_td]:border-line/80'
                      onClick={() =>
                        setOpenSections((s) => ({ ...s, [section.name]: !s[section.name] }))
                      }
                    >
                      <td colSpan={4} className='p-0'>
                        <button
                          type='button'
                          aria-expanded={open}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenSections((s) => ({ ...s, [section.name]: !s[section.name] }));
                          }}
                          className='flex w-full items-center gap-3 px-3 py-2.5 text-left'
                        >
                          <span
                            className={`text-[11px] text-muted transition-transform ${open ? 'rotate-90' : ''}`}
                          >
                            ▸
                          </span>
                          <span className='text-[11px] font-semibold tracking-wide'>
                            {section.name}{' '}
                            <span className='font-normal text-muted'>
                              ({section.includedCount} of {section.lines.length} in quote)
                            </span>
                          </span>
                          {section.unpricedCount > 0 && (
                            <span className='rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-paper'>
                              {section.unpricedCount} no rate
                            </span>
                          )}
                          {section.lossCount > 0 && (
                            <span className='rounded-full bg-warn px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-paper'>
                              {section.lossCount} below cost
                            </span>
                          )}
                        </button>
                      </td>
                      {open ? <td colSpan={9} /> : <SectionTotals section={section} />}
                    </tr>
                    {open &&
                      section.lines.map((line) => (
                        <LineRow
                          key={line.id}
                          line={line}
                          computed={computed.byId[line.id]}
                          overlapWith={overlapById.get(line.id) ?? null}
                          saveStatus={lineSaves[line.id] ?? null}
                          onChange={(patch) => updateLine(line.id, patch)}
                        />
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className='bg-[#f3eadc] font-medium [&_td]:border-t-2 [&_td]:border-ink/20'>
                <td className='px-3 py-3' colSpan={4}>
                  Trip total
                  {issues.unpriced.length > 0 && (
                    <span className='ml-2 font-normal text-danger'>
                      excluding unpriced services
                    </span>
                  )}
                </td>
                <td className='px-2 py-3 text-right tabular'>{usd(totals.nett)}</td>
                <td className='px-2 py-3 text-right tabular'>{usd(totals.vatAmount)}</td>
                <td className='px-2 py-3 text-right tabular'>{usd(totals.costVat)}</td>
                <td colSpan={2} />
                <td className='px-2 py-3 text-right tabular'>{usd(totals.clientPays)}</td>
                <td className='px-2 py-3 text-right tabular'>{usd(totals.gp)}</td>
                <td className='px-2 py-3 text-right tabular'>{pct(totals.gpPct)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function SectionTotals({
  section,
}: {
  section: ReturnType<typeof computeQuote>['sections'][number];
}) {
  const empty = section.unpricedCount > 0 && section.totals.nett === 0;
  const cell = 'px-2 py-2.5 text-[11px] text-muted tabular';

  return (
    <>
      <td className={`${cell} text-right`}>{empty ? <Dash /> : usd(section.totals.nett)}</td>
      <td className={`${cell} text-right`}>{empty ? <Dash /> : usd(section.totals.vatAmount)}</td>
      <td className={`${cell} text-right`}>{empty ? <Dash /> : usd(section.totals.costVat)}</td>
      <td className={`${cell} text-center`}>{empty ? <Dash /> : pct(section.avgCommPct)}</td>
      <td className={`${cell} text-center`}>{empty ? <Dash /> : pct(section.avgMrkpPct)}</td>
      <td className={`${cell} text-right`}>{empty ? <Dash /> : usd(section.totals.clientPays)}</td>
      <td className={`${cell} text-right`}>{empty ? <Dash /> : usd(section.totals.gp)}</td>
      <td className={`${cell} text-right`}>{empty ? <Dash /> : pct(section.totals.gpPct)}</td>
      <td className='px-3 py-2.5 text-[11px] leading-snug text-muted'>
        {empty ? 'No priced lines yet' : section.unpricedCount > 0 ? 'Excluding unpriced' : null}
      </td>
    </>
  );
}

const iconsMap = {
  ACCOMMODATION: <MdOutlineBed className='size-4' color='#996122' />,
  TRANSPORT: <PiCar className='size-4' color='#996122' />,
  ACTIVITIES: <GiMountainClimbing className='size-4' color='#996122' />,
};

function overlapKeepHint(a: LineItem, b: LineItem): string {
  const aPriced = a.nett !== null;
  const bPriced = b.nett !== null;
  if (aPriced !== bPriced) {
    const kept = aPriced ? a : b;
    const drop = aPriced ? b : a;
    const status = kept.confirmed ? 'has a rate and is confirmed' : 'has a rate';
    return `${kept.service} ${status}; ${drop.service} does not.`;
  }
  if (a.confirmed !== b.confirmed) {
    const kept = a.confirmed ? a : b;
    const drop = a.confirmed ? b : a;
    return `${kept.service} is confirmed with the supplier; ${drop.service} is not.`;
  }
  if (aPriced) return 'both have rates — keep the one you intend to send.';
  return 'neither has a contracted rate.';
}

function lossTripNote(tripGpPct: number, lineMrkpPct: number): string {
  const discount =
    lineMrkpPct < 0 ? ` after a ${pctPoints(Math.abs(lineMrkpPct))} discount` : '';
  if (tripGpPct < 0) {
    return `Trip GP is ${pct(tripGpPct)} — the blended number is not healthy${discount}.`;
  }
  if (tripGpPct < 0.1) {
    return `Trip GP is only ${pct(tripGpPct)} — the blended number is already thin. The loss is on this line${discount}.`;
  }
  return `Trip GP is still ${pct(tripGpPct)} — the blended number looks healthy. The loss is on this line${discount}.`;
}

function LineRow({
  line,
  computed: c,
  overlapWith,
  saveStatus,
  onChange,
}: {
  line: LineItem;
  computed: ReturnType<typeof computeQuote>['byId'][string];
  overlapWith: LineItem | null;
  saveStatus: LineSaveStatus | null;
  onChange: (patch: LinePatch) => void;
}) {
  const selected = inQuote(line);
  const unpriced = !c.priced;
  const loss = selected && c.belowCost;
  const overlap = overlapWith !== null;
  const saving = saveStatus === 'saving';
  const pendingSave = saveStatus === 'pending';

  return (
    <tr
      aria-busy={saving || undefined}
      className={`[&_td]:align-middle [&_td]:border-b [&_td]:border-line/80 ${
        !selected
          ? 'bg-cream/60 text-muted'
          : unpriced
            ? 'bg-danger-soft/60'
            : overlap
              ? 'bg-danger-soft/40'
              : loss
                ? 'bg-warn-soft/70'
                : 'bg-paper'
      }`}
    >
      <td className='px-2 py-2.5 text-center'>
        <input
          type='checkbox'
          checked={selected}
          disabled={saving}
          aria-label={`Include ${line.service} in this quotation`}
          className='h-3.5 w-3.5 accent-terracotta disabled:cursor-not-allowed disabled:opacity-40'
          onChange={(e) => onChange({ included: e.target.checked })}
        />
      </td>
      <td className='overflow-hidden py-2.5'>
        <div className='flex items-center gap-2'>
          <div className='rounded-full bg-terracotta/10 p-1'>{iconsMap[line.section]}</div>
          <div className='flex flex-col gap-1'>
            <div
              className={`font-medium leading-snug flex items-center gap-1 ${selected ? 'text-ink' : ''}`}
            >
              {line.service}
            </div>
            <div className='text-[11px] text-muted'>{line.supplier}</div>
          </div>
        </div>
        {saving && (
          <span className='mt-1 inline-block rounded-full bg-terracotta/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-terracotta'>
            Saving
          </span>
        )}
        {pendingSave && !saving && (
          <span className='mt-1 inline-block rounded-full bg-cream px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted'>
            Unsaved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className='mt-1 inline-block rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-paper'>
            Save failed
          </span>
        )}
        {selected && unpriced && (
          <span className='mt-1 inline-block rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-paper'>
            No rate
          </span>
        )}
        {selected && overlap && (
          <span className='mt-1 ml-1 inline-block rounded-full bg-danger px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-paper'>
            Same nights
          </span>
        )}
        {loss && (
          <span className='mt-1 inline-block rounded-full bg-warn px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-paper'>
            Below cost
          </span>
        )}
        {!selected && (
          <span className='mt-1 inline-block text-[10px] uppercase tracking-wide'>
            Not in quote
          </span>
        )}
      </td>
      <td className='whitespace-nowrap px-2 py-2.5'>
        <div>{line.dates}</div>
        <div className='text-[11px] text-muted flex flex-col'>
          {line.units}
          <span className='text-muted/70'>
            {line.basis === 'per_person' ? 'per person' : 'per unit'}
          </span>
        </div>
      </td>
      <td className='whitespace-nowrap px-2 py-2.5'>
        <span
          className='inline-flex items-center gap-1.5'
          title={
            line.confirmed
              ? 'The supplier has confirmed this service'
              : 'Not confirmed with the supplier — still a hold, a request, or unpriced'
          }
        >
          <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
              line.confirmed ? 'bg-sage' : 'border border-muted/40 bg-transparent'
            }`}
          />
        </span>
      </td>
      <td className='px-2 py-2.5 text-right tabular'>
        {unpriced ? <span className='font-medium text-danger'>—</span> : usd(line.nett ?? 0)}
      </td>
      <td className='px-2 py-2.5 text-right tabular text-muted'>{pctPoints(line.vatPct)}</td>
      <td className='px-2 py-2.5 text-right tabular'>
        {c.costVat === null ? <Dash /> : usd(c.costVat)}
      </td>
      <td className='overflow-hidden px-2 py-2.5 text-center'>
        <PercentControl
          value={line.commPct}
          min={0}
          max={40}
          disabled={saving}
          pending={pendingSave}
          onChange={(commPct) => onChange({ commPct })}
        />
      </td>
      <td className='overflow-hidden px-2 py-2.5 text-center'>
        <PercentControl
          value={line.mrkpPct}
          min={-50}
          max={80}
          danger={loss}
          disabled={saving}
          pending={pendingSave}
          onChange={(mrkpPct) => onChange({ mrkpPct })}
        />
      </td>
      <td className='px-2 py-2.5 text-right tabular font-medium'>
        {c.clientPays === null ? <Dash /> : usd(c.clientPays)}
      </td>
      <td className={`px-2 py-2.5 text-right tabular ${loss ? 'font-medium text-danger' : ''}`}>
        {c.gp === null ? <Dash /> : usd(c.gp)}
      </td>
      <td
        className={`px-2 py-2.5 text-right tabular ${
          loss ? 'font-medium text-danger' : c.gpPct !== null && c.gpPct >= 0 ? 'text-sage' : ''
        }`}
      >
        {c.gpPct === null ? <Dash /> : pct(c.gpPct)}
      </td>
      <td className='overflow-hidden px-3 py-2.5 text-[11px] leading-snug text-muted'>
        {selected && unpriced && (
          <div className='mb-1 font-medium text-danger'>
            Uncheck to leave this out of the quotation. Totals ignore it until it has a rate.
          </div>
        )}
        {selected && overlapWith && (
          <div className='mb-1 font-medium text-danger'>
            {overlapWith.service} is already in this quotation for these nights.
          </div>
        )}
        {loss && c.gp !== null && (
          <div className='mb-1 font-medium text-warn'>
            DMC loses {usd(Math.abs(c.gp))} on this line.
          </div>
        )}
        <div>{line.rate.note}</div>
        <div className='mt-1 flex flex-wrap items-center gap-1.5'>
          <span>Source: {line.rate.document}</span>
          <ConfidenceBadge level={line.rate.confidence} />
        </div>
      </td>
    </tr>
  );
}

function Dash() {
  return <span className='text-muted'>—</span>;
}

function ConfidenceBadge({ level }: { level: LineItem['rate']['confidence'] }) {
  const cls =
    level === 'high'
      ? 'bg-sage-soft text-sage'
      : level === 'medium'
        ? 'bg-warn-soft text-warn'
        : 'bg-danger-soft text-danger';
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {level}
    </span>
  );
}

function Alert({
  tone,
  title,
  children,
}: {
  tone: 'danger' | 'warn';
  title: string;
  children: React.ReactNode;
}) {
  const cls =
    tone === 'danger'
      ? 'border-danger/25 bg-danger-soft text-ink'
      : 'border-warn/25 bg-warn-soft text-ink';
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-[13px] leading-snug ${cls}`}>
      <div
        className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${tone === 'danger' ? 'text-danger' : 'text-warn'}`}
      >
        {title}
      </div>
      <div className='mt-1 text-ink/90'>{children}</div>
    </div>
  );
}

function SavePill({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === 'pending') {
    return (
      <span className='rounded-md border border-line bg-paper px-3 py-1.5 text-[12px] text-muted'>
        Unsaved
      </span>
    );
  }
  if (state === 'saving') {
    return (
      <span className='rounded-md border border-line bg-paper px-3 py-1.5 text-[12px] text-muted'>
        Saving…
      </span>
    );
  }
  if (state === 'error') {
    return (
      <button
        type='button'
        onClick={onRetry}
        className='rounded-md bg-danger-soft px-3 py-1.5 text-[12px] font-medium text-danger'
      >
        Save failed — retry
      </button>
    );
  }
  if (state === 'saved') {
    return (
      <span className='rounded-md border border-line bg-paper px-3 py-1.5 text-[12px] text-sage'>
        Saved
      </span>
    );
  }
  return (
    <span className='rounded-md border border-line bg-paper px-3 py-1.5 text-[12px] text-muted'>
      Autosave
    </span>
  );
}
