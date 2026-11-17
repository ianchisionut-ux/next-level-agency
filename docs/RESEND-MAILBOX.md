# NextLevel mailbox

The dashboard mailbox is bound to `contact@nextlevel-agency.ro` and is available
only to the application's super administrator. It uses Resend's native Inbox
API; a sending-only API key is insufficient.

## Production configuration

Configure these variables in the existing NextLevel Vercel project:

- `RESEND_API_KEY`: full-access key, stored as a sensitive secret.
- `RESEND_INBOX_ID`: the inbox belonging to the exact contact address.
- `RESEND_WEBHOOK_SECRET`: the signing secret for
  `https://www.nextlevel-agency.ro/api/mailbox/webhook`, stored as a sensitive secret.
- `EMAIL_FROM` and `OFFER_EMAIL_FROM`: `Next Level Agency <contact@nextlevel-agency.ro>`.
- Keep the existing `ENCRYPTION_KEY` and `CRON_SECRET`. Do not rotate the encryption
  key during mailbox setup: existing integrations also depend on it.

The one-time `scripts/configure-resend-mailbox.cjs` helper requires explicit
owner authorization before reading an owner-copied API key from the Windows
clipboard. It accepts `--apply --from-clipboard`, preserves existing DNS records,
refuses conflicting mail records and checks sending and receiving verification.
It never sends a message or purchases a plan. Secret values stay in memory and
are passed to the Vercel CLI through stdin. Redeploy after changing variables.

## Mail and retention

The dashboard supports HTML messages, external and inline CID images,
attachments, CC/BCC, replies, forwarding, drafts, signatures, read/unread state
and archive folders. Outgoing attachments are limited to 3 MiB total to remain
inside the deployed request-body limit. Incoming HTML runs in an opaque iframe
sandbox with scripts, forms and frames disabled.

Bodies, attachment bytes, drafts and signatures are encrypted with AES-GCM in
PostgreSQL. Message index metadata remains queryable. Signed webhooks enqueue
durable archive jobs; the authenticated daily cron recovers interrupted jobs.
The dashboard reports pending or incomplete archive work. Local history cannot
restore messages already removed by the provider before their first import.

Send operations use a durable operation identifier. An unknown result stays
blocked until reviewed; retrying it does not silently create a new send.
Provider acceptance alone does not establish delivery to the recipient.

## Verification without real messages

Run `npm run test:mailbox`, `npm run test:hero` and `npm run check:public-site`
against the local server. Mailbox suites use mocked provider calls and isolated
PostgreSQL. They do not access production data or send messages.
