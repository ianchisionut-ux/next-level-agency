import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { siteConfig } from "@/lib/data";
import CookieSettingsLink from "@/components/CookieSettingsLink";

export const metadata: Metadata = {
  title: "Politica de Cookies | Next Level Advertising Agency",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Politica de Cookies" updated="26 iulie 2026">
      <p>
        Această pagină explică ce sunt cookie-urile, ce tipuri de cookie-uri
        folosește site-ul {siteConfig.name} {siteConfig.tagline} și cum îți
        poți gestiona preferințele.
      </p>

      <h2>1. Ce sunt cookie-urile</h2>
      <p>
        Cookie-urile sunt fișiere text mici, stocate de browser-ul tău atunci
        când vizitezi un site web. Ele ajută site-ul să funcționeze corect,
        să-și amintească preferințele tale și să ne ofere informații despre
        modul în care este utilizat Site-ul.
      </p>

      <h2>2. Ce categorii de cookie-uri folosim</h2>
      <ul>
        <li>
          <strong>Necesare</strong> — esențiale pentru funcționarea de bază a
          Site-ului (ex. reținerea preferinței tale privind cookie-urile).
          Acestea nu pot fi dezactivate.
        </li>
        <li>
          <strong>Analitice</strong> — ne ajută să înțelegem cum este folosit
          Site-ul (ex. pagini vizitate, timp petrecut), pentru a-l putea
          îmbunătăți. Se activează doar cu acordul tău.
        </li>
        <li>
          <strong>Marketing</strong> — folosite pentru a măsura eficiența
          campaniilor și, eventual, pentru a-ți afișa reclame relevante pe
          alte platforme. Se activează doar cu acordul tău.
        </li>
      </ul>

      <h2>3. Cum îți poți gestiona preferințele</h2>
      <p>
        Poți accepta sau respinge cookie-urile opționale din bannerul afișat
        la prima vizită, sau oricând ulterior din{" "}
        <CookieSettingsLink className="text-blue underline">
          Setări Cookies
        </CookieSettingsLink>
        , disponibil și în footer-ul Site-ului. De asemenea, poți gestiona
        sau bloca cookie-urile direct din setările browser-ului tău.
      </p>

      <h2>4. Cookie-uri de la terți</h2>
      <p>
        Unele funcționalități (ex. harta încorporată în pagina de Contact,
        eventuale instrumente de analiză sau publicitate) pot seta propriile
        cookie-uri, guvernate de politicile de confidențialitate ale acelor
        terți.
      </p>

      <h2>5. Modificări</h2>
      <p>
        Putem actualiza această politică periodic. Data ultimei actualizări
        este afișată în partea de sus a paginii.
      </p>

      <p className="mt-8 rounded-lg border border-line-light bg-paper-soft p-4 text-xs">
        Notă: acest document este un model standard, orientativ. Recomandăm
        revizuirea lui de către un consultant specializat înainte de
        publicare, mai ales dacă adaugi ulterior instrumente de analiză sau
        publicitate (Google Analytics, Meta Pixel etc.).
      </p>
    </LegalPage>
  );
}
