import Image from "next/image";

const platformLogos: Record<string, { src: string; width: number; height: number; href: string }> = {
  Google: { src: "/platforms/google.svg", width: 270, height: 82, href: "https://www.google.com/" },
  Meta: { src: "/platforms/meta.svg", width: 948, height: 191, href: "https://www.meta.com/" },
  TikTok: { src: "/platforms/tiktok.png", width: 361, height: 97, href: "https://www.tiktok.com/" },
  Stripe: { src: "/platforms/stripe.svg", width: 360, height: 150, href: "https://stripe.com/" },
  YouTube: { src: "/platforms/youtube.svg", width: 1469, height: 317, href: "https://www.youtube.com/" },
  "Banca Transilvania": { src: "/platforms/banca-transilvania.svg", width: 300, height: 56, href: "https://www.bancatransilvania.ro/" },
};

export default function TrustMarquee({ items }: { items: string[] }) {
  const renderItems = (duplicate: boolean) => items.map((name) => {
    const logo = platformLogos[name];
    if (!logo) return <span key={name} className="whitespace-nowrap text-sm font-bold text-slate-700">{name}</span>;

    const image = (
      <Image
        src={logo.src}
        alt={duplicate ? "" : name}
        width={logo.width}
        height={logo.height}
        className={`w-auto object-contain ${name === "Banca Transilvania" ? "h-10 max-w-[200px]" : name === "Stripe" ? "h-9 max-w-[170px]" : "h-8 max-w-[170px]"}`}
      />
    );

    return duplicate ? (
      <span key={name} className="flex h-12 shrink-0 items-center">{image}</span>
    ) : (
      <a
        key={name}
        href={logo.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={name}
        className="flex h-12 shrink-0 items-center rounded-md transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        {image}
      </a>
    );
  });

  return (
    <div className="marquee-mask overflow-hidden">
      <div className="flex w-max animate-marquee">
        <div className="flex shrink-0 items-center gap-16 pr-16">{renderItems(false)}</div>
        <div className="flex shrink-0 items-center gap-16 pr-16" aria-hidden="true">{renderItems(true)}</div>
      </div>
    </div>
  );
}
