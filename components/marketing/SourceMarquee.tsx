import { CONNECTORS } from "@/lib/catalog";
import { ConnectorMark } from "@/components/ui";

const ROW = CONNECTORS.filter((c) => c.category === "Paid advertising" || c.popular).slice(0, 22);

/** Two copies of the same row make the CSS translate loop seamless. */
export default function SourceMarquee() {
  return (
    <div className="relative overflow-hidden py-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="marquee-track flex w-max gap-3">
        {[...ROW, ...ROW].map((connector, i) => (
          <div
            key={connector.slug + i}
            className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-4 py-2.5 shadow-sm"
          >
            <ConnectorMark name={connector.name} color={connector.color} size={26} />
            <span className="whitespace-nowrap text-sm font-medium text-ink-700">{connector.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
