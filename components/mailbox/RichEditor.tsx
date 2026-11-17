"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Image as ImageIcon, Italic, Link2, List } from "lucide-react";
import { sanitizeMailBody, textMailHtml } from "./mailbox-utils";
import styles from "./Mailbox.module.css";

export default function RichEditor({ html, text, identity, disabled, onChange }: { html: string; text: string; identity: string; disabled: boolean; onChange: (value: { html: string; text: string }) => void }) {
  const editor = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const lastAccepted = useRef("");
  const [insert, setInsert] = useState<"link" | "image" | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (editor.current) { lastAccepted.current = sanitizeMailBody(html || textMailHtml(text)).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ""); editor.current.innerHTML = lastAccepted.current; } }, [identity]); // Content is owned by the editor while typing.
  function remember() {
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.current?.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
  }
  function range() {
    const result = savedRange.current?.cloneRange() || document.createRange();
    if (!savedRange.current || !editor.current?.contains(result.commonAncestorContainer)) { result.selectNodeContents(editor.current!); result.collapse(false); }
    return result;
  }
  function emit() {
    if (!editor.current) return;
    const html = sanitizeMailBody(editor.current.innerHTML), text = editor.current.innerText;
    if (text.length > 100000 || html.length > 200000) { editor.current.innerHTML = lastAccepted.current; setError("Mesajul este prea lung. Limita este de 100.000 de caractere text și 200.000 HTML."); return; }
    lastAccepted.current = html; setError(""); onChange({ html, text });
  }
  function place(node: Node, selected: Range) {
    selected.deleteContents(); selected.insertNode(node); selected.setStartAfter(node); selected.collapse(true);
    const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(selected); savedRange.current = selected.cloneRange();
    editor.current?.focus(); emit();
  }
  function format(kind: "strong" | "em" | "ul") {
    if (disabled) return;
    const selected = range();
    if (kind === "ul") {
      const list = document.createElement("ul");
      (selected.toString() || "Element de listă").split("\n").filter(Boolean).forEach(line => { const item = document.createElement("li"); item.textContent = line; list.appendChild(item); });
      place(list, selected);
    } else {
      const wrapper = document.createElement(kind);
      wrapper.appendChild(selected.collapsed ? document.createTextNode("Text") : selected.extractContents());
      place(wrapper, selected);
    }
  }
  function addUrl() {
    if (!/^https:\/\/[^\s]+$/i.test(url)) { setError("Folosește o adresă completă care începe cu https://."); return; }
    const selected = range();
    if (insert === "image") { const image = document.createElement("img"); image.src = url; image.alt = "Imagine"; image.style.maxWidth = "100%"; image.style.height = "auto"; place(image, selected); }
    else { const link = document.createElement("a"); link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = selected.toString() || url; place(link, selected); }
    setInsert(null); setUrl(""); setError("");
  }
  return <div className={styles.editor}>
    <div className={styles.toolbar} role="toolbar" aria-label="Formatarea mesajului">
      {[{ kind: "strong", title: "Aldin", icon: Bold }, { kind: "em", title: "Cursiv", icon: Italic }, { kind: "ul", title: "Listă", icon: List }].map(button => <button key={button.kind} type="button" disabled={disabled} title={button.title} aria-label={button.title} onMouseDown={event => { event.preventDefault(); remember(); }} onClick={() => format(button.kind as "strong" | "em" | "ul")}><button.icon size={15} /></button>)}
      <span />
      <button type="button" disabled={disabled} title="Inserează un link" aria-label="Inserează un link" onMouseDown={event => { event.preventDefault(); remember(); }} onClick={() => { setInsert("link"); setError(""); }}><Link2 size={15} /></button>
      <button type="button" disabled={disabled} title="Inserează o imagine dintr-un URL" aria-label="Inserează o imagine dintr-un URL" onMouseDown={event => { event.preventDefault(); remember(); }} onClick={() => { setInsert("image"); setError(""); }}><ImageIcon size={15} /></button>
    </div>
    {insert && <div className={styles.insertUrl}><input type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder={insert === "image" ? "https://site.ro/imagine.jpg" : "https://site.ro"} aria-label="Adresă URL" onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addUrl(); } }} /><button type="button" onClick={addUrl}>Inserează</button><button type="button" onClick={() => setInsert(null)}>Renunță</button></div>}
    {error && <p className={styles.editorError}>{error}</p>}
    <div ref={editor} role="textbox" aria-label="Conținutul mesajului" aria-multiline="true" contentEditable={!disabled} suppressContentEditableWarning className={styles.editorBody} data-placeholder="Bună ziua,…" onInput={emit} onKeyUp={remember} onMouseUp={remember} onBlur={emit} onPaste={event => {
      event.preventDefault(); remember();
      const fragment = document.createDocumentFragment();
      event.clipboardData.getData("text/plain").split("\n").forEach((line, index) => { if (index) fragment.appendChild(document.createElement("br")); fragment.appendChild(document.createTextNode(line)); });
      const marker = document.createElement("span"); marker.appendChild(fragment); place(marker, range());
    }} />
  </div>;
}
