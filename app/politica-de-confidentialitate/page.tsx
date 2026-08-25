import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: "Politica de Confidențialitate | Next Level Advertising Agency",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Politica de Confidențialitate" updated="25 august 2026">
      <p>
        Această Politică de Confidențialitate explică modul în care{" "}
        <strong>{siteConfig.name} {siteConfig.tagline}</strong> colectează,
        utilizează și protejează datele cu caracter personal ale
        vizitatorilor Site-ului, în conformitate cu Regulamentul (UE)
        2016/679 (GDPR) și legislația română aplicabilă.
      </p>

      <h2>1. Operatorul de date</h2>
      <p>
        Operator de date este <strong>{siteConfig.legalName}</strong>, cu sediul social în {siteConfig.address},
        CUI {siteConfig.cui}, înregistrată la Registrul Comerțului sub nr. {siteConfig.tradeRegistryNumber}.
        Ne poți contacta la{" "}
        <a href={`mailto:${siteConfig.email}`} className="text-blue underline">
          {siteConfig.email}
        </a>.
      </p>

      <h2>2. Ce date colectăm</h2>
      <p>Colectăm date cu caracter personal doar atunci când ni le furnizezi voluntar, de exemplu:</p>
      <ul>
        <li>Nume, adresă de email, număr de telefon — atunci când completezi formularul de contact sau ne scrii pe WhatsApp/email;</li>
        <li>Date tehnice de navigare (adresă IP, tip de browser, pagini vizitate) — colectate automat prin cookie-uri și instrumente de analiză.</li>
      </ul>

      <h2>3. Scopul prelucrării</h2>
      <p>Datele sunt folosite pentru:</p>
      <ul>
        <li>A răspunde solicitărilor tale de contact sau ofertare;</li>
        <li>A îmbunătăți funcționarea și conținutul Site-ului;</li>
        <li>A analiza traficul, în scop statistic (dacă acceptul pentru cookie-uri de analiză este dat);</li>
        <li>A respecta obligații legale, atunci când este cazul.</li>
      </ul>

      <h2>4. Temeiul legal al prelucrării</h2>
      <p>
        Prelucrăm datele în baza consimțământului tău (ex. formular de
        contact, cookie-uri opționale), a interesului nostru legitim de a
        răspunde solicitărilor și de a îmbunătăți serviciile, sau a unei
        obligații legale, după caz.
      </p>

      <h2>5. Durata de stocare</h2>
      <p>
        Păstrăm datele personale doar atât timp cât este necesar pentru
        scopul pentru care au fost colectate, sau conform termenelor impuse
        de legislația aplicabilă.
      </p>

      <h2>6. Cui transmitem datele</h2>
      <p>
        Nu vindem și nu închiriem datele tale personale către terți. Putem
        transmite date către furnizori tehnici (ex. hosting, unelte de
        email/analiză) strict în măsura necesară funcționării Site-ului,
        respectând acorduri de confidențialitate.
      </p>

      <h2>7. Drepturile tale</h2>
      <p>Conform GDPR, ai dreptul de a solicita:</p>
      <ul>
        <li>Accesul la datele personale pe care le deținem despre tine;</li>
        <li>Rectificarea datelor incorecte sau incomplete;</li>
        <li>Ștergerea datelor (&bdquo;dreptul de a fi uitat&rdquo;);</li>
        <li>Restricționarea sau opoziția față de prelucrare;</li>
        <li>Portabilitatea datelor;</li>
        <li>Retragerea consimțământului, în orice moment.</li>
      </ul>
      <p>
        Pentru exercitarea acestor drepturi, ne poți contacta la{" "}
        <a href={`mailto:${siteConfig.email}`} className="text-blue underline">
          {siteConfig.email}
        </a>
        . Ai, de asemenea, dreptul de a depune o plângere la Autoritatea
        Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal
        (ANSPDCP).
      </p>

      <h2>8. Securitatea datelor</h2>
      <p>
        Aplicăm măsuri tehnice și organizatorice rezonabile pentru a proteja
        datele personale împotriva accesului neautorizat, pierderii sau
        divulgării accidentale.
      </p>

      <h2>9. Modificări ale acestei politici</h2>
      <p>
        Putem actualiza periodic această politică. Orice modificare va fi
        publicată pe această pagină, împreună cu data actualizării.
      </p>

      <p className="mt-8 rounded-lg border border-line-light bg-paper-soft p-4 text-xs">
        Notă: acest document este un model standard, orientativ. Recomandăm
        revizuirea lui de către un consultant specializat în protecția
        datelor înainte de publicare.
      </p>
    </LegalPage>
  );
}
