// Data model for the AterraAI pricing screen.
// You are free to change any of this.

export type SectionName = "ACCOMMODATION" | "TRANSPORT" | "ACTIVITIES";

/** How a service is priced. Relevant if you attempt the bonus. */
export type PricingBasis = "per_unit" | "per_person";

export type RateSource = {
  /** Where the nett rate came from. Shown in the REASONING column. */
  document: string;
  /** Free text the consultant reads. */
  note: string;
  confidence: "high" | "medium" | "low";
};

export type LineItem = {
  id: string;
  section: SectionName;
  service: string;
  supplier: string;
  dates: string;
  /** Human-readable unit description, e.g. "1 ste x 3 nt". */
  units: string;
  basis: PricingBasis;

  /**
   * Nett cost to Aterra, in USD, before VAT.
   * NULL means no contracted rate has been found for this service yet.
   * It does NOT mean zero.
   */
  nett: number | null;

  /** VAT percentage that applies to this line. Varies by country. */
  vatPct: number;

  /** Agent commission percentage. Editable by the consultant. */
  commPct: number;

  /** Aterra markup percentage. Editable by the consultant. May be negative. */
  mrkpPct: number;

  /** Whether the service is confirmed with the supplier. */
  confirmed: boolean;

  rate: RateSource;
};

export type Quote = {
  reference: string;
  client: string;
  trip: string;
  dates: string;
  advisor: string;
  /** Number of travellers. Only relevant if you attempt the bonus. */
  pax: number;
  /** The maximum the client has said they will spend, in USD. */
  clientCeiling: number;
  currency: string;
  lines: LineItem[];
};
