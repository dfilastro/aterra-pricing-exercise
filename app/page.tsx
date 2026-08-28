import { getQuote } from "@/lib/store";
import PriceScreen from "@/components/PriceScreen";

export const dynamic = "force-dynamic";

export default function Page() {
  const quote = getQuote();
  return <PriceScreen initialQuote={quote} />;
}
