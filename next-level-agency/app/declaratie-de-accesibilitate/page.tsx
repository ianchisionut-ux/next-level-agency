import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: "Declarație de Accesibilitate | Next Level Advertising Agency",
};

export default function AccessibilityPage() {
  return (
    <LegalPage title="Declarație de Accesibilitate" updated="26 iulie 2026">
      <p>
        {siteConfig.name} {siteConfig.tagline} își dorește ca acest site să
        fie accesibil unui public cât mai larg posibil, indiferent de
        tehnologia folosită sau de eventuale dizabilități.
      </p>

      <h2>1. Măsuri luate pentru accesibilitate</h2>
      <ul>
        <li>Structură clară a paginilor, cu titluri ierarhizate;</li>
        <li>Contrast de culoare gândit pentru lizibilitate pe fundal deschis și închis;</li>
        <li>Navigare posibilă cu tastatura, cu indicatori de focus vizibili;</li>
        <li>Respectăm preferința sistemului pentru mișcare redusă (reduced motion);</li>
        <li>Text alternativ pentru imagini relevante (ex. logo-uri de parteneri).</li>
      </ul>

      <h2>2. Limitări cunoscute</h2>
      <p>
        Depunem eforturi continue pentru a îmbunătăți accesibilitatea
        Site-ului. Este posibil ca anumite secțiuni (ex. conținut încorporat
        de la terți, precum harta Google Maps din pagina de Contact) să nu
        fie încă perfect optimizate pentru tehnologii asistive.
      </p>

      <h2>3. Feedback</h2>
      <p>
        Dacă întâmpini dificultăți în accesarea vreunei părți a Site-ului sau
        ai sugestii de îmbunătățire, te rugăm să ne scrii la{" "}
        <a href={`mailto:${siteConfig.email}`} className="text-blue underline">
          {siteConfig.email}
        </a>{" "}
        sau să ne contactezi la {siteConfig.phone}. Vom depune eforturi
        rezonabile pentru a răspunde solicitării tale.
      </p>

      <p className="mt-8 rounded-lg border border-line-light bg-paper-soft p-4 text-xs">
        Notă: aceasta este o declarație standard, orientativă. Pentru
        conformitate deplină cu standardele de accesibilitate (ex. WCAG 2.1,
        Legea nr. 60/2023), recomandăm o evaluare tehnică dedicată.
      </p>
    </LegalPage>
  );
}
