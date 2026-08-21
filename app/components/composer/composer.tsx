"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORM_META, PLATFORM_ORDER, PlatformKey } from "@/lib/platform-meta";
import { PlatformIcon } from "@/app/components/ui/platform-icon";
import { PlatformPreview } from "@/app/components/composer/platform-preview";
import { EmojiPicker } from "@/app/components/composer/emoji-picker";
import { MediaLibraryPicker } from "@/app/components/composer/media-library-picker";

const DRAFT_STORAGE_KEY = "signal_compose_draft";

interface StoredDraft {
  useSameContent: boolean;
  sharedContent: string;
  sharedMedia: string[];
  contentTags: string[];
  perPlatform: Record<string, VariantState>;
  scheduledAt: string;
  savedAt: number;
}

export interface ComposerAccount {
  id: string;
  platform: PlatformKey;
  accountName: string;
}

interface VariantState {
  content: string;
  mediaUrls: string[];
  scheduledAt: string; // datetime-local override, empty = use global
}

export function Composer({
  accounts,
  workspaceId,
  suggestedHashtags = [],
  suggestedKeywords = [],
  bestTimeHint = null,
  campaignId = null,
  campaignName = null,
}: {
  accounts: ComposerAccount[];
  workspaceId: string;
  suggestedHashtags?: string[];
  suggestedKeywords?: string[];
  bestTimeHint?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
}) {
  const router = useRouter();
  const availablePlatforms = useMemo(
    () => PLATFORM_ORDER.filter((p) => accounts.some((a) => a.platform === p)),
    [accounts]
  );

  const [selected, setSelected] = useState<Set<PlatformKey>>(new Set(availablePlatforms));
  const [useSameContent, setUseSameContent] = useState(true);
  const [sharedContent, setSharedContent] = useState("");
  const CONTENT_TAG_OPTIONS = ["Educațional", "Promoțional", "Behind the scenes", "Testimonial", "Anunț", "Distractiv"];
  const [contentTags, setContentTags] = useState<string[]>([]);
  const [sharedMedia, setSharedMedia] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<PlatformKey | null>(availablePlatforms[0] ?? null);
  const [perPlatform, setPerPlatform] = useState<Record<string, VariantState>>({});
  const [scheduledAt, setScheduledAt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState<{ savedAt: number } | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState<"shared" | PlatformKey | null>(null);

  // La montare: verificam daca exista o ciorna salvata automat (localStorage)
  // - fie de la o inchidere accidentala, fie de la "Duplica postarea" apasat
  // pe o postare anterioara (foloseste acelasi mecanism).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft: StoredDraft = JSON.parse(raw);
      // Ignoram ciorne foarte vechi (peste 7 zile) - probabil irelevante.
      if (Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      // Nu aratam bannerul daca ciorna e goala (nimic de recuperat).
      const hasContent = draft.sharedContent.trim() || Object.values(draft.perPlatform).some((v) => v.content.trim());
      if (hasContent) setDraftBanner({ savedAt: draft.savedAt });
    } catch {
      // ciorna corupta - o ignoram silentios
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-salvare: la fiecare schimbare relevanta, salvam starea curenta in
  // localStorage, cu un mic debounce ca sa nu scriem la fiecare tasta.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const hasContent = sharedContent.trim() || Object.values(perPlatform).some((v) => v.content.trim());
      if (!hasContent) return;
      const draft: StoredDraft = {
        useSameContent,
        sharedContent,
        sharedMedia,
        contentTags,
        perPlatform,
        scheduledAt,
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // localStorage plin/indisponibil - ignoram silentios, nu e critic
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [useSameContent, sharedContent, sharedMedia, contentTags, perPlatform, scheduledAt]);

  // Avertizare daca userul incearca sa inchida tab-ul cu text nesalvat (nepublicat).
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      const hasContent = sharedContent.trim() || Object.values(perPlatform).some((v) => v.content.trim());
      if (hasContent) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sharedContent, perPlatform]);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft: StoredDraft = JSON.parse(raw);
      setUseSameContent(draft.useSameContent);
      setSharedContent(draft.sharedContent);
      setSharedMedia(draft.sharedMedia);
      setContentTags(draft.contentTags);
      setPerPlatform(draft.perPlatform);
      setScheduledAt(draft.scheduledAt);
    } catch {
      // ignoram
    } finally {
      setDraftBanner(null);
    }
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftBanner(null);
  }

  function clearDraftAfterSubmit() {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }

  const activePlatforms = availablePlatforms.filter((p) => selected.has(p));

  function togglePlatform(p: PlatformKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
    if (!activeTab || activeTab === p) {
      const remaining = availablePlatforms.filter((x) => (selected.has(x) ? x !== p : x === p));
      setActiveTab(remaining[0] ?? null);
    }
  }

  function getVariant(p: PlatformKey): VariantState {
    return perPlatform[p] ?? { content: "", mediaUrls: [], scheduledAt: "" };
  }

  function updateVariant(p: PlatformKey, patch: Partial<VariantState>) {
    setPerPlatform((prev) => ({ ...prev, [p]: { ...getVariant(p), ...patch } }));
  }

  // Adaugă textul (hashtag sau cuvânt cheie) la finalul conținutului activ -
  // fie textarea comună (dacă "același conținut" e pornit), fie cea a
  // platformei curent selectate.
  function insertIntoActiveContent(text: string) {
    if (useSameContent) {
      setSharedContent((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    } else if (activeTab) {
      const current = getVariant(activeTab).content;
      updateVariant(activeTab, { content: current.trim() ? `${current.trim()} ${text}` : text });
    }
  }

  async function handleUpload(file: File, target: "shared" | PlatformKey) {
    setUploading(true);
    setError(null);
    try {
      // Upload direct din browser catre Vercel Blob - fisierul NU mai trece
      // prin serverul nostru, deci nu exista limita de marime (~4.5MB) care
      // dadea eroarea "Request Entity Too Large" la fisiere video mai mari.
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/media/upload",
      });

      if (target === "shared") {
        setSharedMedia((prev) => [...prev, blob.url]);
      } else {
        const v = getVariant(target);
        updateVariant(target, { mediaUrls: [...v.mediaUrls, blob.url] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(publishNow: boolean) {
    setError(null);
    if (activePlatforms.length === 0) {
      setError("Alege cel puțin o platformă.");
      return;
    }

    const variants = activePlatforms.map((p) => {
      const account = accounts.find((a) => a.platform === p)!;
      const content = useSameContent ? sharedContent : getVariant(p).content;
      const mediaUrls = useSameContent ? sharedMedia : getVariant(p).mediaUrls;
      const override = getVariant(p).scheduledAt;
      // Extragem automat hashtag-urile scrise in text (#exemplu), ca sa fie
      // urmarite corect pe pagina de Analytics - nu trebuie introduse separat.
      const hashtags = Array.from(content.matchAll(/#(\w+)/g)).map((m) => m[1]);
      return {
        accountId: account.id,
        platform: p,
        content,
        mediaUrls,
        hashtags,
        contentTags,
        // new Date(...) interpretează string-ul "datetime-local" ca oră locală
        // a browser-ului (corect - user-ul a ales ora din perspectiva lui),
        // iar .toISOString() îl convertește la UTC, fără ambiguitate pe server.
        scheduledAt: override ? new Date(override).toISOString() : undefined,
      };
    });

    const missingContent = variants.find((v) => !v.content.trim());
    if (missingContent) {
      setError(`Adaugă text pentru ${PLATFORM_META[missingContent.platform].label}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          useSameContent,
          campaignId: campaignId ?? undefined,
          scheduledAt: publishNow
            ? new Date().toISOString()
            : scheduledAt
              ? new Date(scheduledAt).toISOString()
              : undefined,
          variants,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Eroare la salvare");
      clearDraftAfterSubmit();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la salvare");
    } finally {
      setSubmitting(false);
    }
  }

  if (availablePlatforms.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-700 bg-ink-800 p-10 text-center">
        <p className="text-mist-300">Nu ai niciun cont conectat încă.</p>
        <a href="/dashboard/accounts" className="text-signal-bright text-sm font-medium hover:underline mt-2 inline-block">
          Conectează un cont →
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="space-y-5">
        {draftBanner && (
          <div className="rounded-xl border border-signal/30 bg-signal-soft px-4 py-2.5 text-sm text-signal-bright flex items-center justify-between gap-3">
            <span>
              Ai o ciornă nesalvată, din{" "}
              {new Date(draftBanner.savedAt).toLocaleString("ro-RO", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              .
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={restoreDraft}
                className="rounded-lg bg-signal hover:bg-signal-bright text-white text-xs font-medium px-3 py-1.5 transition-colors"
              >
                Continuă
              </button>
              <button
                onClick={discardDraft}
                className="rounded-lg border border-ink-600 hover:border-ink-500 text-mist-100 text-xs font-medium px-3 py-1.5 transition-colors"
              >
                Renunță
              </button>
            </div>
          </div>
        )}

        {campaignName && (
          <div className="rounded-xl border border-signal/30 bg-signal-soft px-4 py-2.5 text-sm text-signal-bright">
            Această postare va fi asociată campaniei <strong>{campaignName}</strong>
          </div>
        )}

        {/* Selector platforme */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-mist-500 uppercase tracking-wide mb-3">Publică pe</p>
          <div className="flex flex-wrap gap-2">
            {availablePlatforms.map((p) => {
              const meta = PLATFORM_META[p];
              const account = accounts.find((a) => a.platform === p)!;
              const active = selected.has(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    active
                      ? "border-signal bg-signal-soft text-mist-100"
                      : "border-ink-600 text-mist-500 hover:border-ink-500"
                  }`}
                >
                  <PlatformIcon platform={p} size={16} />
                  {meta.label}
                  <span className="text-xs text-mist-500">· {account.accountName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle continut identic */}
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Același conținut pe toate platformele</p>
            <p className="text-xs text-mist-500 mt-0.5">
              Dezactivează dacă vrei text sau imagini diferite per platformă
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={useSameContent}
            onClick={() => setUseSameContent((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              useSameContent ? "bg-signal" : "bg-ink-600"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                useSameContent ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Editor */}
        {useSameContent ? (
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <textarea
              value={sharedContent}
              onChange={(e) => setSharedContent(e.target.value)}
              placeholder="Ce vrei să comunici?"
              rows={6}
              className="w-full bg-ink-900 border border-ink-600 rounded-xl p-3 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal outline-none resize-none"
            />
            <CharCounts content={sharedContent} platforms={activePlatforms} />
            <div className="flex items-center gap-2">
              <EmojiPicker onSelect={(emoji) => insertIntoActiveContent(emoji)} />
              <MediaUploader
                mediaUrls={sharedMedia}
                onUpload={(f) => handleUpload(f, "shared")}
                onRemove={(url) => setSharedMedia((prev) => prev.filter((u) => u !== url))}
                uploading={uploading}
              />
              <button
                type="button"
                onClick={() => setShowMediaLibrary("shared")}
                className="h-16 px-3 rounded-lg border border-dashed border-ink-600 hover:border-signal flex items-center justify-center text-mist-500 text-xs transition-colors"
              >
                Din bibliotecă
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex border-b border-ink-700">
              {activePlatforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setActiveTab(p)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                    activeTab === p
                      ? "border-signal text-mist-100"
                      : "border-transparent text-mist-500 hover:text-mist-300"
                  }`}
                >
                  <PlatformIcon platform={p} size={15} />
                  {PLATFORM_META[p].label}
                </button>
              ))}
            </div>
            {activeTab && (
              <div className="p-5 space-y-3">
                <textarea
                  value={getVariant(activeTab).content}
                  onChange={(e) => updateVariant(activeTab, { content: e.target.value })}
                  placeholder={`Text pentru ${PLATFORM_META[activeTab].label}…`}
                  rows={6}
                  className="w-full bg-ink-900 border border-ink-600 rounded-xl p-3 text-sm text-mist-100 placeholder:text-mist-700 focus:border-signal outline-none resize-none"
                />
                <CharCounts content={getVariant(activeTab).content} platforms={[activeTab]} />
                <div className="flex items-center gap-2">
                  <EmojiPicker onSelect={(emoji) => insertIntoActiveContent(emoji)} />
                  <MediaUploader
                    mediaUrls={getVariant(activeTab).mediaUrls}
                    onUpload={(f) => handleUpload(f, activeTab)}
                    onRemove={(url) =>
                      updateVariant(activeTab, {
                        mediaUrls: getVariant(activeTab).mediaUrls.filter((u) => u !== url),
                      })
                    }
                    uploading={uploading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMediaLibrary(activeTab)}
                    className="h-16 px-3 rounded-lg border border-dashed border-ink-600 hover:border-signal flex items-center justify-center text-mist-500 text-xs transition-colors"
                  >
                    Din bibliotecă
                  </button>
                </div>
                <label className="block text-xs text-mist-500 pt-1">
                  Oră personalizată pentru {PLATFORM_META[activeTab].label} (opțional)
                  <input
                    type="datetime-local"
                    value={getVariant(activeTab).scheduledAt}
                    onChange={(e) => updateVariant(activeTab, { scheduledAt: e.target.value })}
                    className="mt-1 w-full bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-sm text-mist-100 focus:border-signal outline-none"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Etichete de conținut (piloni) - pentru breakdown de performanță pe categorie */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm font-medium mb-0.5">Categorie de conținut</p>
          <p className="text-xs text-mist-500 mb-3">
            Opțional — te ajută să vezi mai târziu ce tip de conținut performează cel mai bine
          </p>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TAG_OPTIONS.map((tag) => {
              const active = contentTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setContentTags((prev) =>
                      active ? prev.filter((t) => t !== tag) : [...prev, tag]
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? "border-signal bg-signal-soft text-signal-bright"
                      : "border-ink-600 text-mist-300 hover:border-ink-500"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sugestii: hashtag-uri (din performanța ta reală) + cuvinte cheie (din Search Console) */}
        {(suggestedHashtags.length > 0 || suggestedKeywords.length > 0) && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            {suggestedHashtags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-0.5">Hashtag-uri sugerate</p>
                <p className="text-xs text-mist-500 mb-3">
                  Cele care au adus cele mai multe interacțiuni la postările tale anterioare
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedHashtags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertIntoActiveContent(`#${tag}`)}
                      className="rounded-full border border-ink-600 px-3 py-1.5 text-xs text-signal-bright hover:border-signal hover:bg-signal-soft transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {suggestedKeywords.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-0.5">Cuvinte cheie de folosit</p>
                <p className="text-xs text-mist-500 mb-3">
                  Din Google Search Console — cele care aduc deja trafic din căutări
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedKeywords.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => insertIntoActiveContent(kw)}
                      className="rounded-full border border-ink-600 px-3 py-1.5 text-xs text-mist-300 hover:border-signal hover:text-signal-bright transition-colors"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Programare */}
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm font-medium mb-3">Când se publică</p>
          {bestTimeHint && (
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const target = new Date(now);
                // gasim urmatoarea aparitie a zilei/orei recomandate
                target.setHours(Number(bestTimeHint.split(", ")[1].split(":")[0]), 0, 0, 0);
                if (target <= now) target.setDate(target.getDate() + 1);
                const iso = target.toISOString().slice(0, 16);
                setScheduledAt(iso);
              }}
              className="mb-3 flex items-center gap-2 rounded-lg border border-signal/30 bg-signal-soft px-3 py-2 text-xs text-signal-bright hover:border-signal transition-colors"
            >
              💡 Cel mai bun moment, pe baza datelor tale: <strong>{bestTimeHint}</strong> — click pentru a folosi
            </button>
          )}
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-sm text-mist-100 focus:border-signal outline-none"
          />
          <p className="text-xs text-mist-500 mt-2">
            Lasă gol și apasă „Publică acum" pentru postare imediată.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-state-error/30 bg-state-error/10 px-4 py-3 text-sm text-state-error">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="flex-1 rounded-xl border border-ink-600 hover:border-ink-500 active:scale-[0.98] text-mist-100 text-sm font-medium py-3 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <ButtonSpinner />}
            {scheduledAt ? "Programează" : "Salvează ca ciornă"}
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex-1 rounded-xl bg-signal hover:bg-signal-bright active:scale-[0.98] shadow-floating text-white text-sm font-medium py-3 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <ButtonSpinner />}
            Publică acum
          </button>
        </div>
      </div>

      {/* Preview live */}
      <div className="lg:sticky lg:top-8 space-y-3">
        <p className="text-xs text-mist-500 uppercase tracking-wide">Previzualizare</p>
        {activePlatforms.length === 0 && (
          <p className="text-sm text-mist-500">Alege cel puțin o platformă pentru a vedea previzualizarea.</p>
        )}
        {activePlatforms.map((p) => {
          const account = accounts.find((a) => a.platform === p)!;
          const content = useSameContent ? sharedContent : getVariant(p).content;
          const mediaUrls = useSameContent ? sharedMedia : getVariant(p).mediaUrls;
          return (
            <div key={p} className="rounded-2xl border border-ink-700 bg-ink-950 p-4">
              <PlatformPreview
                platform={p}
                content={content}
                mediaUrls={mediaUrls}
                accountName={account.accountName}
              />
            </div>
          );
        })}
      </div>

      {showMediaLibrary && (
        <MediaLibraryPicker
          workspaceId={workspaceId}
          onClose={() => setShowMediaLibrary(null)}
          onSelect={(url) => {
            if (showMediaLibrary === "shared") {
              setSharedMedia((prev) => [...prev, url]);
            } else {
              const v = getVariant(showMediaLibrary);
              updateVariant(showMediaLibrary, { mediaUrls: [...v.mediaUrls, url] });
            }
            setShowMediaLibrary(null);
          }}
        />
      )}
    </div>
  );
}

function CharCounts({ content, platforms }: { content: string; platforms: PlatformKey[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {platforms.map((p) => {
        const limit = PLATFORM_META[p].charLimit ?? 0;
        const over = limit > 0 && content.length > limit;
        return (
          <span key={p} className={`text-xs font-mono ${over ? "text-state-error" : "text-mist-500"}`}>
            {PLATFORM_META[p].short}: {content.length}
            {limit ? `/${limit}` : ""}
          </span>
        );
      })}
    </div>
  );
}

function MediaUploader({
  mediaUrls,
  onUpload,
  onRemove,
  uploading,
}: {
  mediaUrls: string[];
  onUpload: (file: File) => void;
  onRemove: (url: string) => void;
  uploading: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {mediaUrls.map((url) => (
        <div key={url} className="relative h-16 w-16 rounded-lg overflow-hidden group">
          {url.match(/\.(mp4|mov)$/i) ? (
            <video src={url} className="h-full w-full object-cover" />
          ) : (
            <img src={url} alt="" className="h-full w-full object-cover" />
          )}
          <button
            onClick={() => onRemove(url)}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity"
          >
            Șterge
          </button>
        </div>
      ))}
      <label className="h-16 w-16 rounded-lg border border-dashed border-ink-600 hover:border-signal flex items-center justify-center text-mist-500 text-xs cursor-pointer transition-colors">
        {uploading ? "…" : "+ Media"}
        <input
          type="file"
          accept="image/*,video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

function ButtonSpinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4Z" />
    </svg>
  );
}
