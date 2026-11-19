import { MessageSquare, PenTool, Layers3, Rocket } from "lucide-react";

const steps = [
  { icon: MessageSquare, title: "Pornim de la tine", text: "Înțelegem afacerea, oamenii și ce vrei să construiești." },
  { icon: PenTool, title: "Dăm formă ideii", text: "Stabilim structura, mesajul și direcția vizuală." },
  { icon: Layers3, title: "Construim împreună", text: "Dezvoltăm, verificăm și ajustăm detaliile proiectului." },
  { icon: Rocket, title: "Pregătim lansarea", text: "Punem totul în mișcare și stabilim pașii următori." },
];

export default function HomeProcess() {
  return <section className="nl-process" aria-labelledby="process-title"><div className="nl-section-shell">
    <div className="nl-section-heading"><div><p className="nl-eyebrow">Proces clar. Idei ambițioase.</p><h2 id="process-title">De la prima idee,<br />la următorul nivel.</h2></div><p>Un proiect bun începe cu o conversație. Continuă cu decizii clare, feedback și atenție la detalii.</p></div>
    <div className="nl-process-grid">{steps.map(({ icon: Icon, title, text }) => <div className="nl-process-step" key={title} data-reveal><div className="nl-process-icon"><Icon size={24} strokeWidth={1.5} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></div>)}</div>
  </div></section>;
}
