import { PlatformKey } from "@/lib/platform-meta";
import { PlatformIcon } from "@/app/components/ui/platform-icon";

interface Props {
  platform: PlatformKey;
  content: string;
  mediaUrls: string[];
  accountName: string;
}

export function PlatformPreview({ platform, content, mediaUrls, accountName }: Props) {
  switch (platform) {
    case "FACEBOOK":
      return <FacebookPreview content={content} mediaUrls={mediaUrls} accountName={accountName} />;
    case "INSTAGRAM":
      return <InstagramPreview content={content} mediaUrls={mediaUrls} accountName={accountName} />;
    case "TIKTOK":
      return <TikTokPreview content={content} mediaUrls={mediaUrls} accountName={accountName} />;
    case "GOOGLE_BUSINESS":
      return <GoogleBusinessPreview content={content} mediaUrls={mediaUrls} accountName={accountName} />;
  }
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-signal to-signal-bright flex items-center justify-center text-xs font-semibold text-white shrink-0">
      {name.slice(0, 1).toUpperCase() || "?"}
    </div>
  );
}

function FacebookPreview({ content, mediaUrls, accountName }: Omit<Props, "platform">) {
  return (
    <div className="rounded-xl bg-white text-neutral-900 overflow-hidden max-w-sm mx-auto">
      <div className="flex items-center gap-2 p-3">
        <Avatar name={accountName} />
        <div>
          <p className="text-sm font-semibold leading-tight">{accountName || "Pagina ta"}</p>
          <p className="text-xs text-neutral-500">Acum · 🌐</p>
        </div>
      </div>
      <p className="px-3 pb-3 text-sm whitespace-pre-wrap break-words">
        {content || <span className="text-neutral-400">Textul postării apare aici…</span>}
      </p>
      {mediaUrls[0] && (
        <img src={mediaUrls[0]} alt="" className="w-full aspect-square object-cover" />
      )}
      <div className="flex items-center justify-around border-t border-neutral-200 py-2 text-xs text-neutral-500">
        <span>👍 Apreciază</span>
        <span>💬 Comentează</span>
        <span>↗ Distribuie</span>
      </div>
    </div>
  );
}

function InstagramPreview({ content, mediaUrls, accountName }: Omit<Props, "platform">) {
  return (
    <div className="rounded-xl bg-white text-neutral-900 overflow-hidden max-w-sm mx-auto">
      <div className="flex items-center gap-2 p-3">
        <div className="h-8 w-8 rounded-full p-[2px] bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#515BD4]">
          <div className="h-full w-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold">
            {accountName.slice(0, 1).toUpperCase() || "?"}
          </div>
        </div>
        <p className="text-sm font-semibold">{accountName || "cont_ig"}</p>
      </div>
      {mediaUrls[0] ? (
        <img src={mediaUrls[0]} alt="" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-neutral-100 flex items-center justify-center text-neutral-400 text-sm">
          Instagram necesită o imagine sau un video
        </div>
      )}
      <div className="p-3">
        <p className="text-xs mb-1">❤️ 🗨️ ✈️</p>
        <p className="text-sm whitespace-pre-wrap break-words">
          <span className="font-semibold">{accountName || "cont_ig"}</span>{" "}
          {content || <span className="text-neutral-400">Descrierea apare aici…</span>}
        </p>
      </div>
    </div>
  );
}

function TikTokPreview({ content, mediaUrls, accountName }: Omit<Props, "platform">) {
  const hasVideo = mediaUrls[0]?.match(/\.(mp4|mov)$/i);
  return (
    <div className="rounded-xl bg-black text-white overflow-hidden max-w-[220px] mx-auto aspect-[9/16] relative">
      {mediaUrls[0] ? (
        hasVideo ? (
          <video src={mediaUrls[0]} className="w-full h-full object-cover" muted loop autoPlay />
        ) : (
          <img src={mediaUrls[0]} alt="" className="w-full h-full object-cover" />
        )
      ) : (
        <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-center text-neutral-500 text-xs p-4">
          TikTok necesită un video
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-xs font-semibold mb-1">@{accountName || "cont_tiktok"}</p>
        <p className="text-xs whitespace-pre-wrap break-words line-clamp-2">
          {content || "Descrierea apare aici…"}
        </p>
      </div>
    </div>
  );
}

function GoogleBusinessPreview({ content, mediaUrls, accountName }: Omit<Props, "platform">) {
  return (
    <div className="rounded-xl bg-white text-neutral-900 overflow-hidden max-w-sm mx-auto border border-neutral-200">
      <div className="flex items-center gap-2 p-3 border-b border-neutral-100">
        <PlatformIcon platform="GOOGLE_BUSINESS" size={20} />
        <div>
          <p className="text-sm font-semibold leading-tight">{accountName || "Locația ta"}</p>
          <p className="text-xs text-neutral-500">Actualizare · Acum</p>
        </div>
      </div>
      {mediaUrls[0] && <img src={mediaUrls[0]} alt="" className="w-full aspect-video object-cover" />}
      <p className="p-3 text-sm whitespace-pre-wrap break-words">
        {content || <span className="text-neutral-400">Textul actualizării apare aici…</span>}
      </p>
    </div>
  );
}
