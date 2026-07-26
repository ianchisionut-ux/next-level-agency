export default function TrustMarquee({ items }: { items: string[] }) {
  // Dublăm lista pentru o buclă continuă și fără sudură.
  const loop = [...items, ...items];

  return (
    <div className="marquee-mask overflow-hidden">
      <div className="flex w-max animate-marquee gap-16 py-1">
        {loop.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="whitespace-nowrap text-sm font-bold tracking-wide text-white/50"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
