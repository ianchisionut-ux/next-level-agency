import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: "Termeni și Condiții | Next Level Advertising Agency",
};

export default function TermsPage() {
  return (
    <LegalPage title="Termeni și Condiții" updated="25 august 2026">
      <p>
        Acești Termeni și Condiții reglementează utilizarea website-ului{" "}
        <strong>{siteConfig.name} {siteConfig.tagline}</strong> (denumit în
        continuare &bdquo;Site-ul&rdquo;) și a serviciilor prezentate pe
        acesta. Prin accesarea și utilizarea Site-ului, confirmi că ai citit,
        înțeles și ești de acord cu acești termeni.
      </p>

      <h2>1. Informații despre operator</h2>
      <p>
        Site-ul este operat de <strong>{siteConfig.legalName}</strong>, cu sediul social în {siteConfig.address},
        CUI {siteConfig.cui}, înregistrată la Registrul Comerțului sub nr. {siteConfig.tradeRegistryNumber}.
        Societatea a fost înființată la {siteConfig.registrationDate}, iar activitatea principală este realizarea
        de software la comandă (CAEN {siteConfig.caen}).
      </p>

      <h2>2. Obiectul site-ului</h2>
      <p>
        Site-ul are caracter de prezentare a serviciilor de marketing digital,
        branding, web design și automatizări oferite de {siteConfig.name}. Nu
        este un magazin online și nu se procesează plăți sau comenzi direct
        pe Site.
      </p>

      <h2>3. Proprietate intelectuală</h2>
      <p>
        Conținutul Site-ului — texte, logo, grafică, imagini și structura
        vizuală — aparține {siteConfig.name} sau este utilizat cu acordul
        titularilor de drepturi și este protejat de legislația privind
        drepturile de autor. Este interzisă reproducerea, distribuirea sau
        utilizarea comercială a conținutului fără acordul scris prealabil al{" "}
        {siteConfig.name}.
      </p>

      <h2>4. Utilizarea acceptabilă</h2>
      <p>Prin utilizarea Site-ului, te obligi:</p>
      <ul>
        <li>Să nu folosești Site-ul în scopuri ilegale sau neautorizate;</li>
        <li>Să nu încerci să afectezi funcționarea sau securitatea Site-ului;</li>
        <li>Să nu extragi automatizat conținut de pe Site (scraping) fără acord scris.</li>
      </ul>

      <h2>5. Limitarea răspunderii</h2>
      <p>
        Informațiile de pe Site au caracter general și informativ. Deși
        depunem eforturi rezonabile pentru acuratețea conținutului, nu
        garantăm că informațiile sunt complete, exacte sau actualizate în
        permanență. {siteConfig.name} nu răspunde pentru eventuale prejudicii
        rezultate din utilizarea sau imposibilitatea utilizării Site-ului.
      </p>

      <h2>6. Linkuri către site-uri terțe</h2>
      <p>
        Site-ul poate conține linkuri către platforme terțe (ex. rețele
        sociale ale partenerilor și clienților noștri). Nu avem control
        asupra conținutului acestor site-uri terțe și nu ne asumăm
        răspunderea pentru acestea.
      </p>

      <h2>7. Modificarea termenilor</h2>
      <p>
        Ne rezervăm dreptul de a actualiza acești Termeni și Condiții
        periodic. Versiunea aplicabilă este întotdeauna cea publicată pe
        această pagină, cu data ultimei actualizări afișată mai sus.
      </p>

      <h2>8. Legea aplicabilă</h2>
      <p>
        Acești termeni sunt guvernați de legislația română. Orice litigiu va
        fi soluționat pe cale amiabilă sau, în lipsa unui acord, de instanțele
        competente din România.
      </p>

      <h2>9. Contact</h2>
      <p>
        Pentru întrebări legate de acești Termeni și Condiții, ne poți
        contacta la{" "}
        <a href={`mailto:${siteConfig.email}`} className="text-blue underline">
          {siteConfig.email}
        </a>{" "}
        sau la {siteConfig.phone}.
      </p>
    </LegalPage>
  );
}
