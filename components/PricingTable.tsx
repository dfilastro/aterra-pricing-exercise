"use client";

import React from "react";
import type { Quote, LineItem, SectionName } from "@/lib/types";

/**
 * A deliberately plain rendering of the quotation.
 *
 * It shows the raw data only. None of the derived columns are calculated,
 * and nothing is editable. That is the exercise.
 *
 * Replace, restructure or delete any of this. Nothing here is precious.
 */

const SECTIONS: SectionName[] = ["ACCOMMODATION", "TRANSPORT", "ACTIVITIES"];

function Row({ line }: { line: LineItem }) {
  return (
    <tr className="border-b border-neutral-200 align-top">
      <td className="py-2 pr-3">
        <div>{line.service}</div>
        <div className="text-neutral-500">{line.supplier}</div>
      </td>
      <td className="py-2 pr-3 whitespace-nowrap">
        <div>{line.dates}</div>
        <div className="text-neutral-500">{line.units}</div>
      </td>
      <td className="py-2 pr-3 text-center">{line.confirmed ? "yes" : "no"}</td>
      <td className="py-2 pr-3 text-right whitespace-nowrap">
        {line.nett === null ? "no rate" : line.nett.toFixed(2)}
      </td>
      <td className="py-2 pr-3 text-right">{line.vatPct}%</td>
      {/* Derived columns. Not calculated. */}
      <td className="py-2 pr-3 text-right text-neutral-400">&mdash;</td>
      <td className="py-2 pr-3 text-right">{line.commPct}%</td>
      <td className="py-2 pr-3 text-right">{line.mrkpPct}%</td>
      <td className="py-2 pr-3 text-right text-neutral-400">&mdash;</td>
      <td className="py-2 pr-3 text-right text-neutral-400">&mdash;</td>
      <td className="py-2 pr-3 text-right text-neutral-400">&mdash;</td>
      <td className="py-2 pr-3 max-w-xs">
        <div>{line.rate.note}</div>
        <div className="text-neutral-500">
          Source: {line.rate.document} &middot; Confidence: {line.rate.confidence}
        </div>
      </td>
    </tr>
  );
}

export default function PricingTable({ quote }: { quote: Quote }) {
  return (
    <main className="p-6 text-[13px] text-neutral-900">
      <h1 className="text-lg font-semibold">Price</h1>
      <p className="text-neutral-600">
        {quote.client} &middot; {quote.trip} &middot; {quote.dates} &middot; via {quote.advisor}
      </p>

      <div className="mt-3 border border-neutral-300 p-3">
        <div>
          Client ceiling: {quote.currency} {quote.clientCeiling.toFixed(2)}
        </div>
        <div>Travellers: {quote.pax}</div>
        <div className="text-neutral-500">
          Trip totals are not calculated in this scaffold.
        </div>
      </div>

      <table className="mt-5 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-400 text-left text-[11px] uppercase tracking-wide text-neutral-600">
            <th className="py-2 pr-3 font-medium">Service / Supplier</th>
            <th className="py-2 pr-3 font-medium">Dates / Units</th>
            <th className="py-2 pr-3 font-medium text-center">Conf.</th>
            <th className="py-2 pr-3 font-medium text-right">Nett</th>
            <th className="py-2 pr-3 font-medium text-right">VAT</th>
            <th className="py-2 pr-3 font-medium text-right">Cost + VAT</th>
            <th className="py-2 pr-3 font-medium text-right">Comm.</th>
            <th className="py-2 pr-3 font-medium text-right">Mrkp.</th>
            <th className="py-2 pr-3 font-medium text-right">Client pays</th>
            <th className="py-2 pr-3 font-medium text-right">GP</th>
            <th className="py-2 pr-3 font-medium text-right">GP %</th>
            <th className="py-2 pr-3 font-medium">Reasoning</th>
          </tr>
        </thead>
        <tbody>
          {SECTIONS.map((section) => {
            const lines = quote.lines.filter((l) => l.section === section);
            if (lines.length === 0) return null;
            return (
              <React.Fragment key={section}>
                <tr className="bg-neutral-100">
                  <td colSpan={12} className="py-2 pr-3 font-medium">
                    {section} ({lines.length})
                  </td>
                </tr>
                {lines.map((line) => (
                  <Row key={line.id} line={line} />
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
