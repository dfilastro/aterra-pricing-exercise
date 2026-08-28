import { getQuote } from "@/lib/store";
import PricingTable from "@/components/PricingTable";

export const dynamic = "force-dynamic";

export default function Page() {
  const quote = getQuote();
  return <PricingTable quote={quote} />;
}
