"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Archive, ArrowLeft, ArrowUpRight, CheckCircle2, ChevronDown, Code2, FileText, Forward, Inbox, Info, Mail, MailOpen, Paperclip, PenLine, RefreshCw, Reply, Search, Send, Settings2, ShieldCheck, Trash2, X } from "lucide-react";
import { editableAfterRejectedSend, emailAddress, mailDate, mailboxRequest, MailboxRequestError, mailSize, mergeMailPage, recipients, safeMailHtml, textMailHtml, type DraftAttachment, type MailDetail, type MailDraft, type MailEmail, type MailFolder, type MailboxStatus, type MailThread, type ServerDraft } from "./mailbox-utils";
import RichEditor from "./RichEditor";
import styles from "./Mailbox.module.css";

const ADDRESS = "contact@nextlevel-agency.ro";
const DRAFT_KEY = "nextlevel.mailbox.contact.draft";
const RECOVERY_KEY = "nextlevel.mailbox.contact.pending-sends";
type PendingSend = { serverId: string; operationKey: string; subject: string; createdAt: string };
const ATTACHMENT_LIMIT = 3 * 1024 * 1024;
const folders = [{ id: "inbox", label: "Primite", icon: Inbox }, { id: "sent", label: "Trimise", icon: Send }, { id: "drafts", label: "Ciorne", icon: FileText }, { id: "archive", label: "Arhivă", icon: Archive }] as const;

function draftPayload(draft: MailDraft) {
  return { to: recipients(draft.to), cc: recipients(draft.cc), bcc: recipients(draft.bcc), subject: draft.subject, text: draft.text, html: draft.html, attachments: draft.attachments, operationKey: draft.operationKey, kind: draft.kind || "new", ...(draft.threadId ? { threadId: draft.threadId, emailId: draft.emailId } : {}) };
}

function restoreDraft(value: ServerDraft): MailDraft {
  return { to: (value.to || []).join(", "), cc: (value.cc || []).join(", "), bcc: (value.bcc || []).join(", "), subject: value.subject || "", text: value.text || "", html: value.html || "", attachments: (value.attachments || []).map(file => ({ ...file, size: Number.isFinite(file.size) ? file.size : Math.floor((file.content || "").replace(/=+$/, "").length * 3 / 4) })), operationKey: value.operationKey || value.id, serverId: value.id, kind: value.kind || "new", threadId: value.threadId, emailId: value.emailId, attempted: false, updatedAt: value.updatedAt };
}

function Message({ email, threadId }: { email: MailEmail; threadId: string }) {
  const [design, setDesign] = useState(Boolean(email.html));
  const [images, setImages] = useState(true);
  const [cidImages, setCidImages] = useState<Record<string, string>>({});
  useEffect(() => {
    let canceled = false;
    const abort = new AbortController();
    const inline = (email.attachments || []).filter(attachment => attachment.contentId && /^image\//i.test(attachment.contentType) && attachment.size <= ATTACHMENT_LIMIT);
    void Promise.all(inline.map(async attachment => {
      try {
        const response = await fetch(`/api/mailbox/attachments/${encodeURIComponent(email.id)}/${encodeURIComponent(attachment.id)}?threadId=${encodeURIComponent(threadId)}&inline=1`, { signal: abort.signal });
        if (!response.ok || !/^image\/(png|jpe?g|gif|webp|avif)/i.test(response.headers.get("Content-Type") || "")) return null;
        const blob = await response.blob();
        if (blob.size > ATTACHMENT_LIMIT || canceled) return null;
        const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
        if (canceled) return null;
        return [attachment.contentId!.replace(/^<|>$/g, ""), url] as const;
      } catch { return null; }
    })).then(entries => { if (!canceled) setCidImages(Object.fromEntries(entries.filter(entry => entry !== null))); });
    return () => { canceled = true; abort.abort(); };
  }, [email.id, email.attachments, threadId]);
  const html = useMemo(() => email.html && design ? safeMailHtml(email.html, images, cidImages) : null, [email.html, design, images, cidImages]);
  return <article className={styles.message} aria-label={`Mesaj de la ${email.from}`}>
    <div className={styles.messageHead}>
      <div className={styles.avatar} aria-hidden="true">{emailAddress(email.from).slice(0, 2).toUpperCase()}</div>
      <div className={styles.messageInfo}>
        <div className={styles.sender}><span>{email.from}</span><time dateTime={email.createdAt}>{mailDate(email.createdAt, true)}</time></div>
        <div className={styles.recipients}>Către: {(email.to || []).join(", ")}{Boolean(email.cc?.length) && <> · Cc: {email.cc?.join(", ")}</>}</div>
      </div>
    </div>
    {html !== null ? <iframe loading="lazy" className={styles.htmlFrame} title={`Mesaj: ${email.subject || "fără subiect"}`} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={html} /> : <div className={styles.body}>{email.text?.trim() || "Mesaj fără conținut text."}</div>}
    {Boolean(email.attachments?.length) && <div className={styles.attachments}>{email.attachments?.map(attachment => <a key={attachment.id} className={styles.attachment} href={`/api/mailbox/attachments/${encodeURIComponent(email.id)}/${encodeURIComponent(attachment.id)}?threadId=${encodeURIComponent(threadId)}`} target="_blank" rel="noopener noreferrer" title={`Descarcă ${attachment.filename}`}><Paperclip size={13} aria-hidden="true" /><span>{attachment.filename}<small>{mailSize(attachment.size)}</small></span><ArrowUpRight size={11} aria-hidden="true" /></a>)}</div>}
    {email.html && <div className={styles.messageOptions}><button type="button" className={styles.htmlToggle} onClick={() => setDesign(current => !current)}><Code2 size={13} aria-hidden="true" />{design ? "Text simplu" : "Design original"}</button>{design && <button type="button" className={styles.htmlToggle} onClick={() => setImages(current => !current)}>{images ? "Ascunde imaginile" : "Afișează imaginile"}</button>}</div>}
  </article>;
}

export default function Mailbox() {
  const [status, setStatus] = useState<MailboxStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [threads, setThreads] = useState<MailThread[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [listLoading, setListLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<MailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messagePageLoading, setMessagePageLoading] = useState(false);
  const [historyWarning, setHistoryWarning] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [draft, setDraft] = useState<MailDraft | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [draftRemoving, setDraftRemoving] = useState(false);
  const [attachmentsReading, setAttachmentsReading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [serverDrafts, setServerDrafts] = useState<ServerDraft[]>([]);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState("");
  const [signature, setSignature] = useState("");
  const [signatureValue, setSignatureValue] = useState("");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [pendingSends, setPendingSends] = useState<PendingSend[]>([]);
  const [recoveryBusy, setRecoveryBusy] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const syncLock = useRef(false);
  const pendingSendsRef = useRef<PendingSend[]>([]);
  const preferencesDialog = useRef<HTMLDialogElement>(null);
  const attachmentsInput = useRef<HTMLInputElement>(null);
  const draftRef = useRef<MailDraft | null>(null);
  const draftSaveLock = useRef<Promise<string> | null>(null);
  const preferencesLock = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const composeTrigger = useRef<HTMLButtonElement>(null);
  const sendLock = useRef(false);
  const actionLock = useRef(false);
  const listRequest = useRef(0);
  const selectedRequest = useRef(0);
  const messagePageAbort = useRef<AbortController | null>(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try { setStatus(await mailboxRequest<MailboxStatus>("/api/mailbox/status")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Conexiunea nu a putut fi verificată."); }
    finally { setStatusLoading(false); }
  }, []);

  const loadThreads = useCallback(async (after?: string) => {
    const request = ++listRequest.current;
    setListLoading(true);
    try {
      if (folder === "drafts") {
        const result = await mailboxRequest<{ items: ServerDraft[]; nextCursor?: string }>(`/api/mailbox/drafts${after ? `?after=${encodeURIComponent(after)}` : ""}`);
        if (request !== listRequest.current) return;
        setServerDrafts(current => after ? [...new Map([...current, ...(result.items || [])].map(item => [item.id, item])).values()] : result.items || []);
        setThreads([]); setCursor(result.nextCursor); return;
      }
      const result = await mailboxRequest<{ items: MailThread[]; nextCursor?: string; warning?: string }>(`/api/mailbox/threads?folder=${folder}${after ? `&after=${encodeURIComponent(after)}` : ""}`);
      if (request !== listRequest.current) return;
      setThreads(current => after ? [...new Map([...current, ...(result.items || [])].map(thread => [thread.id, thread])).values()] : result.items || []);
      setCursor(result.nextCursor);
      setHistoryWarning(result.warning || "");
    } catch (caught) { if (request === listRequest.current) setError(caught instanceof Error ? caught.message : "Mesajele nu au putut fi încărcate."); }
    finally { if (request === listRequest.current) setListLoading(false); }
  }, [folder]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => { mailboxRequest<{ signature: string }>("/api/mailbox/preferences").then(value => { setSignature(value.signature || ""); setSignatureValue(value.signature || ""); }).catch(() => {}); }, []);
  useEffect(() => {
    ++listRequest.current; setListLoading(false); setThreads([]); setCursor(undefined); setSelected(null); setDetail(null); setSearch(""); setHistoryWarning("");
    if (status?.configured || folder === "drafts") void loadThreads();
  }, [status?.configured, loadThreads]);
  useEffect(() => {
    try {
      const pending = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || "[]") as PendingSend[];
      if (!Array.isArray(pending) || pending.some(item => !/^[A-Za-z0-9_-]{16,160}$/.test(item.operationKey) || !/^[A-Za-z0-9_-]{16,160}$/.test(item.serverId))) throw new Error("Operațiunile anterioare nu pot fi citite.");
      pendingSendsRef.current = pending; setPendingSends(pending);
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const value = JSON.parse(raw) as MailDraft;
      if (!/^[A-Za-z0-9:_-]{16,160}$/.test(value.operationKey) || [value.to, value.cc, value.subject, value.text].some(part => typeof part !== "string")) throw new Error("Ciorna salvată nu poate fi citită.");
      const restored = { ...value, bcc: value.bcc || "", html: value.html || "", attachments: value.attachments || [], kind: value.kind || (value.threadId ? "reply" : "new") };
      draftRef.current = restored; setDraft(restored);
      if (restored.attempted && restored.serverId) recordPendingSend({ serverId: restored.serverId, operationKey: restored.operationKey, subject: restored.subject, createdAt: new Date().toISOString() });
    } catch { setError("Ciorna salvată nu poate fi recuperată. Conținutul existent nu a fost șters."); }
  }, []);
  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    if (composeOpen && !modal.open) modal.showModal();
    if (!composeOpen && modal.open) modal.close();
  }, [composeOpen]);
  useEffect(() => { const modal = preferencesDialog.current; if (!modal) return; if (preferencesOpen && !modal.open) modal.showModal(); if (!preferencesOpen && modal.open) modal.close(); }, [preferencesOpen]);
  useEffect(() => {
    const request = ++selectedRequest.current;
    messagePageAbort.current?.abort(); messagePageAbort.current = null; setMessagePageLoading(false);
    setDetail(null);
    if (!selected) { setDetailLoading(false); return; }
    const abort = new AbortController();
    setDetailLoading(true);
    mailboxRequest<MailDetail>(`/api/mailbox/threads/${encodeURIComponent(selected)}`, { signal: abort.signal }).then(result => {
      if (request !== selectedRequest.current) return;
      setDetail(result);
      if (result.thread.unread && !actionLock.current) {
        actionLock.current = true; setActionBusy(true);
        void mailboxRequest(`/api/mailbox/threads/${encodeURIComponent(selected)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unread: false }) }).then(() => {
          setThreads(current => current.map(thread => thread.id === selected ? { ...thread, unread: false } : thread));
          setDetail(current => current?.thread.id === selected ? { ...current, thread: { ...current.thread, unread: false } } : current);
        }).catch(() => {}).finally(() => { actionLock.current = false; setActionBusy(false); });
      }
    }).catch(caught => { if (!abort.signal.aborted && request === selectedRequest.current) setError(caught instanceof Error ? caught.message : "Mesajul nu poate fi deschis."); }).finally(() => { if (request === selectedRequest.current) setDetailLoading(false); });
    return () => abort.abort();
  }, [selected]);

  async function loadMoreMessages() {
    if (!detail?.nextCursor || messagePageAbort.current) return;
    const id = detail.thread.id, after = detail.nextCursor, request = selectedRequest.current;
    const abort = new AbortController(); messagePageAbort.current = abort; setMessagePageLoading(true);
    try {
      const page = await mailboxRequest<MailDetail>(`/api/mailbox/threads/${encodeURIComponent(id)}?after=${encodeURIComponent(after)}`, { signal: abort.signal });
      if (abort.signal.aborted || request !== selectedRequest.current) return;
      setDetail(current => current?.thread.id === id ? mergeMailPage(current, page) : current);
    } catch (caught) { if (!abort.signal.aborted && request === selectedRequest.current) setError(caught instanceof Error ? caught.message : "Următoarele mesaje nu pot fi încărcate."); }
    finally { if (messagePageAbort.current === abort) { messagePageAbort.current = null; setMessagePageLoading(false); } }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ro");
    return threads.filter(thread => !query || [thread.subject, thread.from, ...(thread.to || []), thread.preview].join(" ").toLocaleLowerCase("ro").includes(query));
  }, [search, threads]);
  const filteredDrafts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ro");
    return serverDrafts.filter(item => !query || [item.subject, ...(item.to || []), item.text].join(" ").toLocaleLowerCase("ro").includes(query));
  }, [search, serverDrafts]);

  const persistDraft = useCallback(async (snapshot: MailDraft): Promise<string> => {
    const previous = draftSaveLock.current;
    const operation = (async () => {
      if (previous) await previous.catch(() => {});
      const active = draftRef.current?.operationKey === snapshot.operationKey ? draftRef.current : null;
      const id = active?.serverId || snapshot.serverId;
      const payload = draftPayload(snapshot);
      const body = JSON.stringify(payload);
      if (new TextEncoder().encode(body).length > 4_400_000) throw new Error("Mesajul complet este prea mare. Redu dimensiunea atașamentelor sau a conținutului.");
      setDraftSaving(true);
      const result = await mailboxRequest<{ id: string }>(id ? `/api/mailbox/drafts/${encodeURIComponent(id)}` : "/api/mailbox/drafts", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body });
      if (!result.id) throw new Error("Ciorna nu a putut fi confirmată pe server.");
      if (draftRef.current?.operationKey === snapshot.operationKey) {
        const next = { ...draftRef.current, serverId: result.id };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next)); draftRef.current = next; setDraft(next);
        setDraftSavedAt(new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }));
      }
      setServerDrafts(current => [{ ...payload, id: result.id, updatedAt: new Date().toISOString() }, ...current.filter(item => item.id !== result.id)]);
      return result.id;
    })();
    draftSaveLock.current = operation;
    try { return await operation; } finally { if (draftSaveLock.current === operation) { draftSaveLock.current = null; setDraftSaving(false); } }
  }, []);
  const draftFingerprint = useMemo(() => draft ? JSON.stringify({ ...draft, serverId: undefined, updatedAt: undefined }) : "", [draft]);
  useEffect(() => {
    const snapshot = draftRef.current;
    if (!snapshot || snapshot.attempted || sendBusy || !status?.configured || ![snapshot.subject, snapshot.text, snapshot.to].some(value => value.trim())) return;
    try { recipients(snapshot.to); recipients(snapshot.cc); recipients(snapshot.bcc); } catch { return; }
    const timer = window.setTimeout(() => { if (!sendLock.current) void persistDraft(snapshot).catch(caught => setSendError(caught instanceof Error ? caught.message : "Ciorna rămâne salvată în această filă.")); }, 1200);
    return () => window.clearTimeout(timer);
  }, [draftFingerprint, sendBusy, status?.configured, persistDraft]);

  function storeDraft(value: MailDraft) {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(value));
    draftRef.current = value;
    setDraft(value);
  }
  function recordPendingSend(value: PendingSend) {
    const items = [...pendingSendsRef.current.filter(item => item.operationKey !== value.operationKey), value];
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(items)); pendingSendsRef.current = items; setPendingSends(items);
  }
  function completePendingSend(operationKey: string) {
    const items = pendingSendsRef.current.filter(item => item.operationKey !== operationKey);
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(items)); pendingSendsRef.current = items; setPendingSends(items);
  }
  async function openCompose(kind: "new" | "reply" | "forward" = "new") {
    setSendError("");
    if (kind !== "new" && (detail?.nextCursor || messagePageLoading)) { setError("Încarcă mesajele rămase pentru a răspunde sau redirecționa din cea mai recentă parte a conversației."); return; }
    if (draft && !draft.attempted && [draft.to, draft.subject, draft.text].some(value => value.trim())) {
      try { await persistDraft(draft); } catch (caught) { setError(caught instanceof Error ? caught.message : "Salvează ciorna curentă înainte de a începe alt mesaj."); return; }
    }
    const reply = kind === "reply", forward = kind === "forward";
    const email = (reply || forward) && detail ? [...detail.emails].reverse().find(message => emailAddress(message.from).toLowerCase() !== ADDRESS) || detail.emails.at(-1) : null;
    const replyTo = email ? email.replyTo?.length ? email.replyTo.join(", ") : emailAddress(email.from).toLowerCase() !== ADDRESS ? emailAddress(email.from) : (email.to || []).filter(address => emailAddress(address).toLowerCase() !== ADDRESS).join(", ") : "";
    const subject = (reply || forward) && detail ? new RegExp(forward ? "^fwd?:" : "^re:", "i").test(detail.thread.subject) ? detail.thread.subject : `${forward ? "Fwd" : "Re"}: ${detail.thread.subject || "Mesaj"}` : "";
    try {
      const text = signature ? `\n\n${signature}` : "";
      storeDraft({ to: forward ? "" : replyTo, cc: "", bcc: "", subject, text, html: textMailHtml(text), attachments: [], kind, operationKey: crypto.randomUUID(), attempted: false, ...((reply || forward) && detail && email ? { threadId: detail.thread.id, emailId: email.id } : {}) });
      setDraftSavedAt("");
      setComposeOpen(true);
    } catch { setError("Browserul nu poate salva ciorna. Activează stocarea locală înainte de a trimite un mesaj."); }
  }
  async function openServerDraft(id: string) {
    try {
      if (draft && !draft.attempted && draft.serverId !== id && [draft.to, draft.subject, draft.text].some(value => value.trim())) await persistDraft(draft);
      const saved = await mailboxRequest<ServerDraft>(`/api/mailbox/drafts/${encodeURIComponent(id)}`);
      storeDraft(restoreDraft(saved)); setSendError(""); setComposeOpen(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Ciorna nu poate fi deschisă."); }
  }
  async function addAttachments(files: FileList | null) {
    if (!draft || !files || draft.attempted || sendLock.current || attachmentsReading) return;
    const identity = draft.operationKey;
    const total = draft.attachments.reduce((sum, file) => sum + file.size, 0) + [...files].reduce((sum, file) => sum + file.size, 0);
    if (total > ATTACHMENT_LIMIT) { setSendError("Atașamentele pot avea maximum 3 MB în total."); return; }
    setAttachmentsReading(true);
    try {
      const added = await Promise.all([...files].map(file => new Promise<DraftAttachment>((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error("Fișierul nu a putut fi citit.")); reader.onload = () => resolve({ filename: file.name, contentType: file.type || "application/octet-stream", content: String(reader.result).split(",")[1], size: file.size }); reader.readAsDataURL(file);
      })));
      const current = draftRef.current;
      if (!current || current.operationKey !== identity || sendLock.current) return;
      if ([...current.attachments, ...added].reduce((sum, file) => sum + file.size, 0) > ATTACHMENT_LIMIT) throw new Error("Atașamentele pot avea maximum 3 MB în total.");
      storeDraft({ ...current, attachments: [...current.attachments, ...added] }); setSendError("");
    } catch (caught) { setSendError(caught instanceof Error ? caught.message : "Atașamentul nu poate fi adăugat."); }
    finally { setAttachmentsReading(false); if (attachmentsInput.current) attachmentsInput.current.value = ""; }
  }
  async function discardDraft() {
    if (!draft || sendLock.current) return;
    if (draft.attempted) { setSendError("Confirmă mai întâi trimiterea inițială. Ciorna și identificatorul ei rămân protejate."); return; }
    sendLock.current = true; setSendBusy(true); setDraftRemoving(true);
    try {
      if (draftSaveLock.current) await draftSaveLock.current.catch(() => {});
      const current = draftRef.current;
      if (current?.serverId) await mailboxRequest(`/api/mailbox/drafts/${encodeURIComponent(current.serverId)}`, { method: "DELETE" });
      sessionStorage.removeItem(DRAFT_KEY); draftRef.current = null; setDraft(null); setComposeOpen(false); setDraftSavedAt("");
      if (folder === "drafts") void loadThreads();
    } catch (caught) { setSendError(caught instanceof Error ? caught.message : "Ciorna nu poate fi eliminată."); }
    finally { sendLock.current = false; setSendBusy(false); setDraftRemoving(false); }
  }
  async function saveSignature() {
    if (preferencesLock.current) return;
    preferencesLock.current = true; setPreferencesBusy(true); setPreferencesError("");
    try { await mailboxRequest("/api/mailbox/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signature: signatureValue }) }); setSignature(signatureValue); setPreferencesOpen(false); setNotice("Semnătura a fost salvată pentru mesajele noi."); }
    catch (caught) { setPreferencesError(caught instanceof Error ? caught.message : "Semnătura nu a putut fi salvată."); }
    finally { preferencesLock.current = false; setPreferencesBusy(false); }
  }
  function changeDraft(patch: Partial<MailDraft>) {
    if (!draft || sendBusy || draft.attempted) return;
    try { storeDraft({ ...draft, ...patch }); }
    catch { setSendError("Ciorna nu poate fi salvată. Mesajul nu va fi trimis până când stocarea devine disponibilă."); }
  }
  function closeCompose() {
    if (sendLock.current) return;
    setComposeOpen(false);
    composeTrigger.current?.focus();
  }
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendLock.current || attachmentsReading || !draft || !status?.sendingReady) return;
    sendLock.current = true; setSendBusy(true); setSendError("");
    let requestSent = false;
    try {
      const to = recipients(draft.to); recipients(draft.cc); recipients(draft.bcc);
      if (!to.length) throw new Error("Completează cel puțin un destinatar.");
      if (!draft.subject.trim()) throw new Error("Completează subiectul mesajului.");
      if (!draft.text.trim() && !/<img\s/i.test(draft.html)) throw new Error("Scrie mesajul înainte de trimitere.");
      const pending = { ...draft };
      let serverId = pending.serverId;
      try { serverId = await persistDraft(pending); }
      catch (caught) { if (!(draft.attempted && serverId && caught instanceof MailboxRequestError && caught.status === 404)) throw caught; }
      storeDraft({ ...pending, serverId, attempted: true });
      recordPendingSend({ serverId: serverId!, operationKey: pending.operationKey, subject: pending.subject, createdAt: new Date().toISOString() });
      requestSent = true;
      const result = await mailboxRequest<{ id: string; threadId: string; accepted: boolean }>(`/api/mailbox/drafts/${encodeURIComponent(serverId!)}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationKey: pending.operationKey }) });
      if (!result.id || !result.accepted) throw new Error("Trimiterea nu a putut fi confirmată. Reîncearcă folosind aceeași ciornă.");
      completePendingSend(pending.operationKey);
      sessionStorage.removeItem(DRAFT_KEY); draftRef.current = null; setDraft(null); setComposeOpen(false);
      setServerDrafts(current => current.filter(item => item.id !== serverId));
      setNotice("Mesajul a fost acceptat pentru trimitere.");
      if (folder === "sent") void loadThreads(); else setFolder("sent");
      setSelected(null); setDetail(null);
      composeTrigger.current?.focus();
    } catch (caught) {
      const current = draftRef.current?.operationKey === draft.operationKey ? draftRef.current : null;
      const editable = current ? editableAfterRejectedSend(current, caught, crypto.randomUUID()) : null;
      if (editable) {
        try {
          completePendingSend(draft.operationKey);
          storeDraft(editable);
          await persistDraft(editable);
        } catch { setSendError("Mesajul nu a fost trimis. Ciorna corectabilă este păstrată în această filă; salvarea pe server trebuie reîncercată."); return; }
        setSendError(`${caught instanceof Error ? caught.message : "Mesajul nu a fost trimis."} Poți corecta această ciornă și trimite din nou.`);
        return;
      }
      if (!requestSent && !draft.attempted && current) { try { storeDraft({ ...current, attempted: false }); } catch { /* The original key remains unchanged. */ } }
      setSendError(caught instanceof Error ? caught.message : "Trimiterea nu a putut fi confirmată. Reîncearcă din aceeași ciornă.");
    }
    finally { sendLock.current = false; setSendBusy(false); }
  }
  async function recoverSend(pending: PendingSend) {
    if (sendLock.current) return;
    sendLock.current = true; setRecoveryBusy(pending.operationKey); setError("");
    try {
      const result = await mailboxRequest<{ id: string; accepted: boolean }>(`/api/mailbox/drafts/${encodeURIComponent(pending.serverId)}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationKey: pending.operationKey }) });
      if (!result.id || !result.accepted) throw new Error("Trimiterea inițială nu a putut fi confirmată.");
      completePendingSend(pending.operationKey);
      if (draftRef.current?.operationKey === pending.operationKey) { sessionStorage.removeItem(DRAFT_KEY); draftRef.current = null; setDraft(null); setComposeOpen(false); }
      setServerDrafts(current => current.filter(item => item.id !== pending.serverId));
      setNotice(`Trimiterea „${pending.subject || "Mesaj"}” a fost confirmată.`);
      if (folder === "sent") void loadThreads();
    } catch (caught) {
      if (caught instanceof MailboxRequestError && caught.definiteNoSend) {
        try {
          completePendingSend(pending.operationKey);
          const saved = await mailboxRequest<ServerDraft>(`/api/mailbox/drafts/${encodeURIComponent(pending.serverId)}`);
          const editable = editableAfterRejectedSend(restoreDraft(saved), caught, crypto.randomUUID())!;
          await persistDraft(editable);
          if (!draftRef.current || draftRef.current.operationKey === pending.operationKey) { storeDraft(editable); setComposeOpen(true); setSendError("Trimiterea nu a fost acceptată. Poți corecta această ciornă și trimite din nou."); }
          else setNotice("Mesajul nu a fost trimis. Ciorna este disponibilă în Ciorne pentru corectare.");
          return;
        } catch (failure) { setError(failure instanceof Error ? failure.message : "Ciorna trebuie recuperată înainte de corectare."); return; }
      }
      setError(caught instanceof Error ? caught.message : "Operațiunea rămâne disponibilă pentru reverificare.");
    }
    finally { sendLock.current = false; setRecoveryBusy(null); }
  }
  async function synchronize() {
    if (syncLock.current) return;
    syncLock.current = true; setSyncBusy(true); setError(""); setNotice("");
    try {
      if (status?.configured) {
        const result = await mailboxRequest<{ pending?: number; deferred?: number; partial?: boolean }>("/api/mailbox/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        setNotice(result.partial || result.pending || result.deferred ? "Mai există mesaje sau atașamente de importat. Folosește din nou sincronizarea pentru a continua." : "Mesajele și arhiva au fost actualizate.");
      }
      await loadStatus(); if (status?.configured || folder === "drafts") await loadThreads();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sincronizarea nu a putut fi finalizată."); }
    finally { syncLock.current = false; setSyncBusy(false); }
  }
  async function updateThread(patch: { archived?: boolean; unread?: boolean }) {
    if (actionLock.current || !detail) return;
    actionLock.current = true; setActionBusy(true); setError("");
    try {
      await mailboxRequest(`/api/mailbox/threads/${encodeURIComponent(detail.thread.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (patch.archived !== undefined) { setSelected(null); setDetail(null); setNotice(patch.archived ? "Conversația a fost mutată în arhivă." : "Conversația a fost scoasă din arhivă."); void loadThreads(); }
      else { setThreads(current => current.map(thread => thread.id === detail.thread.id ? { ...thread, ...patch } : thread)); setDetail(current => current ? { ...current, thread: { ...current.thread, ...patch } } : current); setNotice(patch.unread ? "Conversația a fost marcată ca necitită." : "Conversația a fost marcată ca citită."); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Conversația nu a putut fi actualizată."); }
    finally { actionLock.current = false; setActionBusy(false); }
  }

  const ready = Boolean(status?.sendingReady && status?.receivingReady);
  const composerLocked = sendBusy || Boolean(draft?.attempted);
  return <div className={styles.mailbox}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Comunicare</p><h1>E-mail</h1><p className={styles.address}>{status?.address || ADDRESS}</p></div>
      <div className={styles.headerActions}>
        <span className={`${styles.badge} ${!ready ? styles.pending : ""}`}>{ready ? <CheckCircle2 size={12} /> : <Info size={12} />}{statusLoading ? "Se verifică…" : ready ? "Conectat" : "Configurare în curs"}</span>
        <button type="button" className={styles.iconButton} disabled={statusLoading || listLoading || syncBusy} aria-label="Sincronizează mesajele și arhiva" title="Sincronizează mesajele și arhiva" onClick={() => void synchronize()}><RefreshCw size={16} className={statusLoading || listLoading || syncBusy ? styles.spin : ""} /></button>
        {draft && <button type="button" className={`${styles.secondary} ${styles.resumeDraft}`} onClick={() => setComposeOpen(true)}><FileText size={14} />Continuă ciorna</button>}
        <button ref={composeTrigger} type="button" className={styles.primary} disabled={!status?.sendingReady || draftSaving} onClick={() => void openCompose()}><PenLine size={15} aria-hidden="true" />Mesaj nou</button>
      </div>
    </header>
    {error && <div role="alert" className={`${styles.banner} ${styles.error}`}><Info size={16} /><span>{error}</span></div>}
    {historyWarning && <div role="status" className={styles.banner}><Info size={16} /><span>{historyWarning}</span></div>}
    {notice && <div role="status" className={`${styles.banner} ${styles.notice}`}><CheckCircle2 size={16} /><span>{notice}</span><button type="button" aria-label="Închide notificarea" onClick={() => setNotice("")} style={{ marginLeft: "auto" }}><X size={14} /></button></div>}
    {pendingSends.map(item => <div key={item.operationKey} className={styles.banner}><Info size={16} /><div style={{ flex: 1 }}>Așteaptă confirmare: <strong>{item.subject || "Mesaj fără subiect"}</strong><p className={styles.draftNote}>Reverificarea păstrează mesajul inițial și identificatorul său.</p></div><button type="button" className={styles.secondary} disabled={Boolean(recoveryBusy) || sendBusy} onClick={() => void recoverSend(item)}>{recoveryBusy === item.operationKey ? "Se confirmă…" : "Confirmă trimiterea"}</button></div>)}
    {Boolean(status?.archive?.pending || status?.archive?.deferred) && <div className={styles.banner}><Archive size={16} /><span>Arhiva se completează. Unele atașamente sunt în așteptare; folosește sincronizarea pentru a continua.</span></div>}
    {status?.archiveReady === false && <div className={styles.banner}><Archive size={16} /><span>Arhiva permanentă necesită configurare. Verifică din nou conexiunea după activare.</span></div>}
    {!statusLoading && !ready && <section className={styles.setup} aria-label="Configurarea adresei de e-mail">
      <div className={styles.setupHeader}><div className={styles.emptyIcon}><Mail size={28} /></div><div><h2>Adresa ta, într-un singur loc.</h2><p>{status?.message || "Conectăm domeniul și verificăm setările necesare pentru ca mesajele primite și trimise să apară aici."}</p></div></div>
      <div className={styles.steps}>
        <div className={styles.step}>{status?.configured ? <CheckCircle2 size={20} /> : <Mail size={20} />}<strong>Conectare adresă</strong>{status?.configured ? "Conexiunea este disponibilă." : "Se pregătește conexiunea adresei agenției."}</div>
        <div className={styles.step}>{status?.sendingReady ? <CheckCircle2 size={20} /> : <ShieldCheck size={20} />}<strong>Validare domeniu</strong>{status?.sendingReady ? "Trimiterea mesajelor este activă." : "Domeniul trebuie validat pentru trimitere."}</div>
        <div className={styles.step}>{status?.receivingReady ? <CheckCircle2 size={20} /> : <Inbox size={20} />}<strong>Mesaje primite</strong>{status?.receivingReady ? "Recepția mesajelor este activă." : "Recepția va fi disponibilă după activare."}</div>
      </div>
      <button type="button" className={styles.secondary} onClick={() => void loadStatus()} disabled={statusLoading}><RefreshCw size={13} />Verifică din nou conexiunea</button>
    </section>}
    <div className={styles.workspace}>
      <nav className={styles.folders} aria-label="Dosare e-mail"><p className={styles.folderTitle}>Căsuța poștală</p>{folders.map(item => <button key={item.id} type="button" className={`${styles.folder} ${folder === item.id ? styles.folderActive : ""}`} aria-current={folder === item.id ? "page" : undefined} onClick={() => { setFolder(item.id); setError(""); setNotice(""); }}><item.icon size={15} aria-hidden="true" />{item.label}{item.id === "inbox" && folder === "inbox" && threads.some(thread => thread.unread) && <span className={styles.folderCount}>{threads.filter(thread => thread.unread).length}</span>}</button>)}<button type="button" className={styles.folder} onClick={() => { setSignatureValue(signature); setPreferencesOpen(true); }}><Settings2 size={15} />Semnătură</button><p className={styles.folderFoot}>NEXT LEVEL AGENCY<br />Conversații. Conexiuni.<br />Totul, la alt nivel.</p></nav>
      <section className={styles.list} aria-label="Lista conversațiilor">
        <div className={styles.listTop}><div className={styles.listHeading}>{folders.find(item => item.id === folder)?.label}<span>{folder === "drafts" ? `${serverDrafts.length} ciorne` : threads.length ? `${threads.length} conversații` : ""}</span></div><label className={styles.search}><Search size={14} aria-hidden="true" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Caută în conversațiile încărcate" placeholder="Caută în mesajele încărcate…" /></label></div>
        <div className={styles.threadScroll} aria-busy={listLoading}>
          {folder === "drafts" && draft && !draft.serverId && <button type="button" className={styles.thread} onClick={() => setComposeOpen(true)}><span className={styles.threadMeta}>Ciornă în această filă</span><span className={styles.threadSubject}>{draft.subject || "Mesaj nou"}</span><span className={styles.preview}>{draft.text || "Continuă redactarea"}</span></button>}
          {folder === "drafts" ? filteredDrafts.map(item => <button key={item.id} type="button" className={styles.thread} onClick={() => void openServerDraft(item.id)}><span className={styles.threadMeta}><span className={styles.threadFrom}>{(item.to || []).join(", ") || "Fără destinatar"}</span><time>{mailDate(item.updatedAt || item.createdAt || "")}</time></span><span className={styles.threadSubject}><FileText size={12} />{item.subject || "(fără subiect)"}</span><span className={styles.preview}>{item.text || "Continuă redactarea"}</span></button>) : filtered.map(thread => <button key={thread.id} type="button" className={`${styles.thread} ${selected === thread.id ? styles.threadSelected : ""}`} aria-pressed={selected === thread.id} onClick={() => { setSelected(thread.id); setError(""); }}><span className={styles.threadMeta}><span className={`${styles.threadFrom} ${thread.unread ? styles.unread : ""}`}>{folder === "sent" ? (thread.to || []).join(", ") : thread.from}</span><time dateTime={thread.lastMessageAt}>{mailDate(thread.lastMessageAt)}</time></span><span className={`${styles.threadSubject} ${thread.unread ? styles.unread : ""}`}>{thread.unread && <span className={styles.unreadDot} aria-label="Necitită" />}{thread.subject || "(fără subiect)"}{thread.messageCount > 1 && <small>({thread.messageCount})</small>}</span><span className={styles.preview}>{thread.preview || "Deschide conversația"}</span></button>)}
          {!(folder === "drafts" ? filteredDrafts.length || (draft && !draft.serverId) : filtered.length) && <div className={styles.empty}><div className={styles.emptyIcon}>{listLoading || statusLoading ? <RefreshCw size={22} className={styles.spin} /> : <Inbox size={24} />}</div><h2>{listLoading || statusLoading ? "Se încarcă mesajele…" : search ? "Niciun rezultat" : folder === "drafts" ? "Nicio ciornă salvată" : "Încă nicio conversație"}</h2><p>{search ? "Căutarea se aplică mesajelor deja încărcate. Încearcă un alt nume sau subiect." : folder === "drafts" ? "Ciornele sunt salvate automat pe server în timp ce scrii." : folder === "sent" ? "Mesajele pe care le trimiți vor apărea aici." : folder === "archive" ? "Conversațiile arhivate rămân disponibile aici." : "Mesajele primite de agenție vor apărea aici după conectarea adresei."}</p></div>}
          {cursor && <div className={styles.loadMore}><button type="button" className={styles.secondary} disabled={listLoading} onClick={() => void loadThreads(cursor)}><ChevronDown size={13} />{listLoading ? "Se încarcă…" : "Încarcă mai multe"}</button></div>}
        </div>
      </section>
      <section className={`${styles.reader} ${selected ? styles.readerOpen : ""}`} aria-label="Conversația selectată" aria-busy={detailLoading}>
        <div className={styles.readerTop}><button type="button" className={`${styles.iconButton} ${styles.mobileBack}`} onClick={() => setSelected(null)} aria-label="Înapoi la conversații"><ArrowLeft size={16} /></button><span className={styles.readerLabel}>{selected ? "Conversație" : "Next Level Mail"}</span>{detail && <div className={styles.readerActions}><button className={styles.iconButton} type="button" disabled={actionBusy} aria-label={detail.thread.unread ? "Marchează ca citită" : "Marchează ca necitită"} title={detail.thread.unread ? "Marchează ca citită" : "Marchează ca necitită"} onClick={() => void updateThread({ unread: !detail.thread.unread })}>{detail.thread.unread ? <MailOpen size={15} /> : <Mail size={15} />}</button><button className={styles.iconButton} type="button" disabled={actionBusy} aria-label={folder === "archive" ? "Mută în Primite" : "Arhivează conversația"} title={folder === "archive" ? "Mută în Primite" : "Arhivează"} onClick={() => void updateThread({ archived: folder !== "archive" })}>{folder === "archive" ? <Inbox size={15} /> : <Archive size={15} />}</button></div>}</div>
        {detailLoading ? <div className={styles.empty}><RefreshCw size={24} className={styles.spin} /><p>Se deschide conversația…</p></div> : detail ? <div className={styles.readerScroll}><h2 className={styles.subject}>{detail.thread.subject || "(fără subiect)"}</h2>{detail.warning && <p role="status" className={styles.banner}>{detail.warning}</p>}{detail.emails.map(email => <Message key={email.id} email={email} threadId={detail.thread.id} />)}{detail.nextCursor && <div className={styles.loadMore}><p className={styles.draftNote}>Mai sunt mesaje în conversație. Încarcă-le înainte de răspuns sau redirecționare.</p><button type="button" className={styles.secondary} disabled={messagePageLoading} onClick={() => void loadMoreMessages()}>{messagePageLoading ? <RefreshCw size={13} className={styles.spin} /> : <ChevronDown size={13} />}{messagePageLoading ? "Se încarcă mesajele…" : "Încarcă următoarele mesaje"}</button></div>}<div className={styles.replyRow}><button type="button" className={styles.primary} disabled={!status?.sendingReady || draftSaving || messagePageLoading || Boolean(detail.nextCursor)} onClick={() => void openCompose("reply")}><Reply size={14} />Răspunde</button><button type="button" className={styles.secondary} disabled={!status?.sendingReady || draftSaving || messagePageLoading || Boolean(detail.nextCursor)} onClick={() => void openCompose("forward")}><Forward size={14} />Redirecționează</button></div></div> : <div className={styles.empty}><div className={styles.emptyIcon}><MailOpen size={29} /></div><h2>Loc pentru conversații bune.</h2><p>Selectează un mesaj din listă sau începe o conversație nouă cu un client.</p><span className={styles.eyebrow} style={{ marginTop: 14 }}>NEXT LEVEL · ÎMPREUNĂ CONSTRUIM</span></div>}
      </section>
    </div>
    <dialog ref={dialog} className={styles.dialog} onCancel={event => { event.preventDefault(); closeCompose(); }} onClose={() => { if (!sendLock.current) setComposeOpen(false); }} aria-labelledby="mail-compose-title">
      {draft && <form onSubmit={send}>
        <div className={styles.composeTop}><div><h2 id="mail-compose-title">{draft.kind === "forward" ? "Redirecționează mesajul" : draft.threadId ? "Răspunde la conversație" : "Mesaj nou"}</h2><p>De la {status?.address || ADDRESS}</p></div><button type="button" className={styles.iconButton} disabled={sendBusy} aria-label="Închide și păstrează ciorna" onClick={closeCompose}><X size={16} /></button></div>
        <div className={styles.composeBody}><label className={styles.field}>Către<input autoFocus autoComplete="off" type="text" value={draft.to} disabled={composerLocked} onChange={event => changeDraft({ to: event.target.value })} placeholder="client@companie.ro" required /></label><div className={styles.ccRow}><label className={styles.field}>Cc · opțional<input autoComplete="off" type="text" value={draft.cc} disabled={composerLocked} onChange={event => changeDraft({ cc: event.target.value })} placeholder="Copie" /></label><label className={styles.field}>Bcc · copie ascunsă<input autoComplete="off" type="text" value={draft.bcc} disabled={composerLocked} onChange={event => changeDraft({ bcc: event.target.value })} placeholder="Copie ascunsă" /></label></div><label className={styles.field}>Subiect<input type="text" value={draft.subject} disabled={composerLocked} maxLength={300} onChange={event => changeDraft({ subject: event.target.value })} placeholder="Despre ce vorbim?" required /></label><div className={styles.field}><span>Mesaj</span><RichEditor identity={draft.operationKey} html={draft.html} text={draft.text} disabled={composerLocked} onChange={changeDraft} /></div>{draft.kind === "forward" && <p className={styles.draftNote}>Mesajul original și atașamentele sale sunt incluse la redirecționare.</p>}<div className={styles.attachments}>{draft.attachments.map((file, index) => <span key={`${file.filename}-${index}`} className={styles.attachment}><Paperclip size={12} />{file.filename}<small>{mailSize(file.size)}</small><button type="button" disabled={composerLocked} aria-label={`Elimină ${file.filename}`} onClick={() => changeDraft({ attachments: draft.attachments.filter((_, current) => current !== index) })}><X size={12} /></button></span>)}</div><input ref={attachmentsInput} type="file" multiple hidden disabled={composerLocked || attachmentsReading} onChange={event => void addAttachments(event.target.files)} /><button type="button" className={styles.secondary} disabled={composerLocked || attachmentsReading} onClick={() => attachmentsInput.current?.click()}><Paperclip size={13} />Adaugă fișiere</button><span className={styles.draftNote} style={{ marginLeft: 10 }}>Maximum 3 MB în total</span>{draft.attempted && <p className={styles.draftNote} style={{ marginTop: 12 }}>Așteptăm confirmarea cererii inițiale. Conținutul rămâne protejat; reîncercarea din această ciornă evită o trimitere dublă.</p>}</div>
        {sendError && <p role="alert" className={styles.dialogError}>{sendError}</p>}
        <div className={styles.composeFoot}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><button type="button" className={styles.iconButton} aria-label="Șterge ciorna" title="Șterge ciorna" disabled={composerLocked || draftSaving || attachmentsReading} onClick={() => void discardDraft()}><Trash2 size={14} /></button><span className={styles.draftNote}>{attachmentsReading ? "Se pregătesc fișierele…" : draftSaving ? "Se salvează ciorna…" : draftSavedAt ? `Salvată pe server la ${draftSavedAt}` : draft.serverId ? "Ciornă salvată pe server" : "Ciornă păstrată în această filă"}</span></div><button type="submit" className={styles.primary} disabled={sendBusy || attachmentsReading || !status?.sendingReady}>{sendBusy || attachmentsReading ? <RefreshCw size={14} className={styles.spin} /> : <Send size={14} />}{draftRemoving ? "Se șterge ciorna…" : sendBusy ? "Se trimite…" : attachmentsReading ? "Se pregătesc fișierele…" : draft.attempted ? "Confirmă trimiterea" : "Trimite mesajul"}</button></div>
      </form>}
    </dialog>
    <dialog ref={preferencesDialog} className={styles.dialog} onCancel={() => setPreferencesOpen(false)} onClose={() => setPreferencesOpen(false)} aria-labelledby="mail-signature-title"><div className={styles.composeTop}><h2 id="mail-signature-title">Semnătura ta</h2><button type="button" className={styles.iconButton} aria-label="Închide" disabled={preferencesBusy} onClick={() => setPreferencesOpen(false)}><X size={16} /></button></div><div className={styles.composeBody}><p className={styles.draftNote} style={{ marginBottom: 16 }}>Semnătura se adaugă automat la mesajele noi, răspunsuri și redirecționări.</p><label className={styles.field}>Semnătură personală<textarea value={signatureValue} maxLength={10000} onChange={event => setSignatureValue(event.target.value)} placeholder={"Nume Prenume\nNext Level Agency\ncontact@nextlevel-agency.ro"} /></label></div>{preferencesError && <p role="alert" className={styles.dialogError}>{preferencesError}</p>}<div className={styles.composeFoot}><span /><button type="button" className={styles.primary} disabled={preferencesBusy} onClick={() => void saveSignature()}>{preferencesBusy ? "Se salvează…" : "Salvează semnătura"}</button></div></dialog>
  </div>;
}
