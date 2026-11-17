import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY lipseste din .env");
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM || "Next Level Agency <contact@nextlevel-agency.ro>";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
function emailLink(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Link e-mail invalid.");
  return escapeHtml(url.toString());
}

export async function sendInvitationEmail(params: {
  to: string;
  workspaceName: string;
  inviterName: string;
  acceptUrl: string;
}) {
  const resend = getResend();
  const result = await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `${params.inviterName} te-a invitat în ${params.workspaceName} pe Signal`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p style="color: #0E1013; font-size: 15px;">
          <strong>${escapeHtml(params.inviterName)}</strong> te-a invitat să colaborezi în
          <strong>${escapeHtml(params.workspaceName)}</strong> pe Signal, platforma de marketing social.
        </p>
        <a href="${emailLink(params.acceptUrl)}"
           style="display: inline-block; margin-top: 16px; background: #4F7CFF; color: white;
                  padding: 10px 20px; border-radius: 10px; text-decoration: none; font-size: 14px;">
          Acceptă invitația
        </a>
        <p style="color: #8A8F9C; font-size: 12px; margin-top: 24px;">
          Linkul expiră în 7 zile. Dacă nu te așteptai la acest email, îl poți ignora.
        </p>
      </div>
    `,
  });
  if (result.error || !result.data?.id) throw new Error("Resend nu a acceptat trimiterea invitației.");
}

export async function sendPasswordResetEmail(params: { to: string; resetUrl: string }) {
  const resend = getResend();
  const result = await resend.emails.send({
    from: FROM,
    to: params.to,
    subject: "Resetează-ți parola pe Signal",
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <p style="color: #0E1013; font-size: 15px;">
          Ai cerut resetarea parolei pentru contul tău Signal. Apasă butonul de mai jos
          ca să alegi o parolă nouă.
        </p>
        <a href="${emailLink(params.resetUrl)}"
           style="display: inline-block; margin-top: 16px; background: #4F7CFF; color: white;
                  padding: 10px 20px; border-radius: 10px; text-decoration: none; font-size: 14px;">
          Resetează parola
        </a>
        <p style="color: #8A8F9C; font-size: 12px; margin-top: 24px;">
          Linkul expiră în 1 oră. Dacă nu ai cerut tu resetarea, poți ignora acest email —
          parola ta rămâne neschimbată.
        </p>
      </div>
    `,
  });
  if (result.error || !result.data?.id) throw new Error("Resend nu a acceptat trimiterea instrucțiunilor.");
}


export async function sendWebsiteOfferEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resend = getResend();
  const result = await resend.emails.send({
    from: process.env.OFFER_EMAIL_FROM || FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
