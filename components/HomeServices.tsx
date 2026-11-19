import Link from "@/components/IntentLink";
import { Code2, Fingerprint, MousePointer2, Search, Sparkles, Workflow } from "lucide-react";
import { services } from "@/lib/data";
import { serviceHref } from "@/lib/service-links";

const details = {
  code: { title: "Experiențe digitale. Un alt nivel.", label: "Web design & development", href: "web-development", icon: Code2 },
  bot: { title: "Mai puțin repetitiv. Mai mult posibil.", label: "AI & automatizări", href: "ai-automatizari", icon: Workflow },
  chart: { title: "Idei creative. Direcție măsurabilă.", label: "Performance marketing", href: "performance-marketing", icon: MousePointer2 },
  target: { title: "Un brand care te reprezintă.", label: "Strategie & identitate", href: "branding-identitate", icon: Fingerprint },
  search: { title: "Conținut clar. Structură cu sens.", label: "SEO & content", href: "seo-content-marketing", icon: Search },
} as const;

function ServiceArtwork({ kind }: { kind: keyof typeof details }) {
  if (kind === "code") return <div className="nl-design-art" aria-hidden="true">
    <div className="nl-design-window"><div className="nl-window-top"><span /><span /><span /><i>nextlevel / digital experiences</i></div><div className="nl-design-browser"><div className="nl-design-nav"><b>NL.</b><span>Acasă · Servicii · Contact</span></div><p>Ideea ta.<br /><em>Într-o formă nouă.</em></p><div className="nl-design-orb" /><div className="nl-design-mini-cta">Să construim ceva</div><div className="nl-design-lines"><i /><i /><i /></div></div></div>
    <div className="nl-design-float"><Code2 size={17} /><span>Design. Dezvoltare. Lansare.</span></div>
  </div>;
  if (kind === "bot") return <div className="nl-flow-art" aria-hidden="true"><span><MousePointer2 size={17} /> Solicitare</span><i /><span className="nl-flow-core"><Sparkles size={20} /></span><i /><span><Workflow size={17} /> Organizare</span></div>;
  if (kind === "chart") return <div className="nl-performance-art" aria-hidden="true"><div>{[22, 37, 31, 54, 47, 69, 85, 74, 96].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><span>Strategie · Creație · Optimizare</span></div>;
  if (kind === "target") return <div className="nl-brand-art" aria-hidden="true"><b>N<span>L</span>.</b><div><i /><i /><i /><i /></div><span>O identitate. O direcție.</span></div>;
  return <div className="nl-search-art" aria-hidden="true"><div><Search size={18} /><span>Afacerile bune merită descoperite.</span></div><i /><i /><i /></div>;
}

export default function HomeServices() {
  return <section id="servicii" className="nl-capabilities" aria-labelledby="capabilities-title">
    <div className="nl-section-shell">
      <div className="nl-section-heading"><div><p className="nl-eyebrow">De la strategie la experiență</p><h2 id="capabilities-title">Soluții complete pentru creșterea afacerii tale</h2></div><p>Designul, tehnologia și marketingul funcționează mai bine împreună. Alegem ce are sens pentru proiectul tău.</p></div>
      <div className="nl-capability-grid">
        {(["code", "bot", "chart", "target", "search"] as const).map(kind => {
          const item = details[kind], Icon = item.icon, service = services.find(service => service.icon === kind)!;
          return <Link key={kind} href={serviceHref(item.href)} className={`nl-capability nl-capability--${kind}`} data-spotlight data-reveal>
            <div className="nl-capability-label"><Icon size={19} aria-hidden="true" /><span>{item.label}</span></div>
            <h3>{item.title}</h3><p>{service.description}</p><ServiceArtwork kind={kind} /><span className="nl-card-link">Explorează serviciul</span>
          </Link>;
        })}
      </div>
    </div>
  </section>;
}
