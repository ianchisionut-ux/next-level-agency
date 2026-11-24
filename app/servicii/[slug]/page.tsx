import PublicPageTransition from "@/components/PublicPageTransition";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Check, CircleHelp, Code2, Layers3, MessageSquare, MousePointer2, Sparkles, Workflow } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "@/components/IntentLink";
import JsonLd from "@/components/JsonLd";
import ServiceExplainer from "@/components/services/ServiceExplainer";
import { webProjects } from "@/lib/data";
import { getServiceDetail, serviceDetails, type ServiceDetailKind } from "@/lib/service-detail-content";
import { breadcrumbSchema, businessSchema, pageMetadata, SITE_URL } from "@/lib/seo";
import "../service-detail.css";

type PageProps = { params: Promise<{ slug: string }> };
const artwork: Record<ServiceDetailKind, { src: string; alt: string }> = {
  web: { src: "/services/web-design-concept.webp", alt: "Ilustrație 3D cu interfețe web și mobile din sticlă, conectate într-un concept digital alb și albastru" },
  marketing: { src: "/services/performance-marketing-concept.webp", alt: "Ilustrație 3D a unui traseu de marketing, cu elemente vizuale conectate și accente albastre" },
  automation: { src: "/services/ai-automation-concept.webp", alt: "Ilustrație 3D a unui nucleu și a unor module conectate, reprezentând un flux de automatizare" },
};
const serviceIcons = { web: Code2, marketing: MousePointer2, automation: Workflow };
const exampleIcons = [Layers3, MousePointer2, MessageSquare];

export const dynamicParams = false;

export function generateStaticParams() {
  return serviceDetails.map(service => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const service = getServiceDetail((await params).slug);
  if (!service) notFound();
  const metadata = pageMetadata(service.metaTitle, service.metaDescription, `/servicii/${service.slug}`);
  const visual = artwork[service.kind];
  const imageUrl = new URL(visual.src, SITE_URL).toString();
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images: [{ url: imageUrl, alt: visual.alt }] },
    twitter: { ...metadata.twitter, images: [{ url: imageUrl, alt: visual.alt }] },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const service = getServiceDetail((await params).slug);
  if (!service) notFound();
  const path = `/servicii/${service.slug}`;
  const url = new URL(path, SITE_URL).toString();
  const Icon = serviceIcons[service.kind];
  const inquiryPath = service.kind === "web" ? "/chestionar-audit" : "/contact";
  const illustration = artwork[service.kind];
  const related = serviceDetails.filter(item => item.slug !== service.slug);
  const projects = webProjects.filter(project => ["Daily Menu", "PM Customs", "BookEasy"].includes(project.title));

  return <>
    <Header />
    <PublicPageTransition key={service.slug}><main id="service-content" className={`service-detail-page sd-${service.kind}`}>
      <JsonLd data={businessSchema} />
      <JsonLd data={breadcrumbSchema([{ name: "Acasă", path: "/" }, { name: "Servicii", path: "/servicii" }, { name: service.label, path }])} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Service", "@id": `${url}#service`, name: service.eyebrow, serviceType: service.eyebrow, description: service.metaDescription, url, image: new URL(illustration.src, SITE_URL).toString(), provider: { "@id": `${SITE_URL}/#organization` }, areaServed: { "@type": "Country", name: "România" } }} />

      <div className="sd-shell"><nav className="sd-breadcrumbs" aria-label="Fir de navigare"><Link href="/">Acasă</Link><span aria-hidden="true">/</span><Link href="/servicii">Servicii</Link><span aria-hidden="true">/</span><span aria-current="page">{service.label}</span></nav></div>
      <section className="sd-hero" aria-labelledby="service-title"><div className="sd-shell sd-hero-grid">
        <div className="sd-hero-copy"><p className="sd-eyebrow"><Icon size={18} aria-hidden="true" />{service.eyebrow}</p><h1 id="service-title">{service.title}</h1><p className="sd-lead">{service.lead}</p><div className="sd-actions"><Link href={inquiryPath} className="sd-button">Hai să discutăm proiectul</Link><a href="#explicatie-vizuala" className="sd-button sd-button-secondary">Vezi cum funcționează</a></div><p className="sd-hero-note">Pentru afaceri din Zalău, Sălaj și din toată România.</p></div>
        <figure className="sd-hero-figure"><div className="sd-hero-image"><Image src={illustration.src} alt={illustration.alt} fill loading="eager" fetchPriority="high" sizes="(min-width: 1400px) 620px, (min-width: 801px) 46vw, (min-width: 690px) 650px, calc(100vw - 40px)" className="sd-concept-image" /></div><figcaption>{service.visualCaption}</figcaption></figure>
      </div></section>

      <section className="sd-benefits" aria-labelledby="benefits-title"><div className="sd-shell"><div className="sd-section-heading"><p className="sd-eyebrow">Ce contează în practică</p><h2 id="benefits-title">O direcție clară, de la început.</h2></div><div className="sd-benefit-grid">{service.benefits.map((item, index) => <article className="sd-benefit" key={item.title}><span className="sd-icon"><Icon size={24} strokeWidth={1.6} aria-hidden="true" /></span><h3>{item.title}</h3><p>{item.text}</p><span className={`sd-card-line sd-card-line-${index}`} aria-hidden="true" /></article>)}</div></div></section>

      <section id="explicatie-vizuala" className="sd-explainer-section" aria-labelledby="explainer-title"><div className="sd-shell"><div className="sd-section-heading"><p className="sd-eyebrow">Mai simplu de văzut decât de explicat</p><h2 id="explainer-title">Explorează traseul, pas cu pas.</h2><p>Alege etapele și urmărește ce se schimbă. Este un exemplu ilustrativ; proiectul tău se adaptează obiectivului și aplicațiilor folosite.</p></div><ServiceExplainer kind={service.kind} /></div></section>

      <section className="sd-examples" aria-labelledby="examples-title"><div className="sd-shell"><div className="sd-section-heading"><p className="sd-eyebrow">Puncte de pornire</p><h2 id="examples-title">Cum se poate potrivi afacerii tale.</h2></div><div className="sd-example-grid">{service.examples.map((item, index) => { const ExampleIcon = exampleIcons[index]; return <article key={item.title} className="sd-example"><ExampleIcon size={28} strokeWidth={1.5} aria-hidden="true" /><h3>{item.title}</h3><p>{item.text}</p></article>; })}</div></div></section>

      {service.kind === "web" && <section className="sd-portfolio" aria-labelledby="service-projects-title"><div className="sd-shell"><div className="sd-section-heading"><p className="sd-eyebrow">Exemple reale din portofoliu</p><h2 id="service-projects-title">Idei diferite. Proiecte construite.</h2><p>Explorează câteva dintre site-urile realizate. Le folosim ca puncte de discuție pentru structură și funcții, nu ca promisiune de rezultate identice.</p></div><div className="sd-project-grid">{projects.map(project => <a key={project.url} href={project.url} target="_blank" rel="noopener noreferrer" className="sd-project"><div className="sd-project-image"><Image src={project.thumbnail} alt={`Site-ul ${project.title}, proiect din portofoliul Next Level`} fill sizes="(min-width: 1400px) 420px, (min-width: 801px) 30vw, calc(100vw - 56px)" /></div><div><h3>{project.title}</h3><span>Vezi site-ul</span></div></a>)}</div><Link href="/portofoliu" className="sd-text-link">Vezi întregul portofoliu</Link></div></section>}

      <section className="sd-process" aria-labelledby="service-process-title"><div className="sd-shell"><div className="sd-section-heading"><p className="sd-eyebrow">Cum lucrăm împreună</p><h2 id="service-process-title">Din idee, într-un plan concret.</h2></div><div className="sd-process-grid">{service.process.map((item, index) => <article key={item.title}><div className="sd-process-node" aria-hidden="true">{index === 0 ? <MessageSquare size={22} /> : index === 1 ? <Layers3 size={22} /> : index === 2 ? <Workflow size={22} /> : <Check size={23} />}</div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>

      <section className="sd-scope" aria-labelledby="scope-title"><div className="sd-shell sd-scope-grid"><div><p className="sd-eyebrow">Ce clarificăm în ofertă</p><h2 id="scope-title">Știi ce construim și de unde pornim.</h2><ul className="sd-checklist">{service.deliverables.map(item => <li key={item}><Check size={18} aria-hidden="true" /><span>{item}</span></li>)}</ul></div><aside className="sd-preparation"><span className="sd-icon"><CircleHelp size={25} aria-hidden="true" /></span><h3>Ce ne ajută înainte de discuție</h3><ul>{service.preparation.map(item => <li key={item}>{item}</li>)}</ul></aside></div><div className="sd-shell"><div className="sd-boundary"><strong>De stabilit împreună</strong><p>{service.boundary}</p></div></div></section>

      <section className="sd-faq" aria-labelledby="service-faq-title"><div className="sd-shell sd-faq-grid"><div><p className="sd-eyebrow">Răspunsuri utile</p><h2 id="service-faq-title">Ce ai putea vrea să știi.</h2></div><div>{service.faq.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></div></section>

      <section className="sd-related" aria-labelledby="related-title"><div className="sd-shell"><div className="sd-section-heading"><p className="sd-eyebrow">Părți din același ecosistem</p><h2 id="related-title">Când se leagă, funcționează mai bine.</h2></div><div className="sd-related-grid">{related.map(item => <Link key={item.slug} href={`/servicii/${item.slug}`} className="sd-related-card"><div className="sd-related-image"><Image src={artwork[item.kind].src} alt={artwork[item.kind].alt} fill sizes="(min-width: 1400px) 240px, (min-width: 1001px) 18vw, (min-width: 521px) 44vw, calc(100vw - 76px)" /></div><div><span className="sd-eyebrow">{item.eyebrow}</span><h3>{item.title}</h3><span className="sd-text-link">Explorează serviciul</span></div></Link>)}</div></div></section>

      <section className="sd-cta" aria-labelledby="service-cta-title"><div className="sd-shell"><div className="sd-cta-card"><Sparkles size={29} strokeWidth={1.4} aria-hidden="true" /><h2 id="service-cta-title">Hai să pornim de la ideea ta.</h2><p>Nu trebuie să ai toate răspunsurile. Spune-ne ce vrei să obții, iar detaliile le clarificăm împreună.</p><Link href={inquiryPath} className="sd-button">Spune-ne despre proiect</Link></div></div></section>
    </main></PublicPageTransition>
    <Footer />
  </>;
}
