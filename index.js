/**
 * nexa-push-worker — sends real Web Push notifications to devices that subscribed
 * from Nexa's Settings > Notifications screen. This is the missing "server half" —
 * Nexa's client code can subscribe to push, but only a server holding your VAPID
 * private key can actually trigger a notification when the app is fully closed.
 *
 * ===== OPTION A: No terminal, browser-only (recommended if you don't have a
 * command line / Node.js / Wrangler CLI available) =====
 * 1. Create a free GitHub account at github.com if you don't have one.
 * 2. On github.com, click "+" > "New repository", name it e.g. "nexa-push-worker",
 *    make it Public or Private (either works), create it.
 * 3. On the repo page, click "Add file" > "Upload files", and drag in index.js,
 *    wrangler.toml, and package.json (all three from this download) — no git
 *    commands needed, this is just a drag-and-drop upload on the website.
 * 4. Go to dash.cloudflare.com (free account is fine) > Workers & Pages > Create
 *    > "Import a repository" / "Connect to Git" > choose the repo you just made.
 *    Cloudflare will detect wrangler.toml and package.json and build+deploy it
 *    automatically (this is where npm install for the 'web-push' package happens
 *    — you never run that command yourself).
 * 5. Once deployed, open the worker in the Cloudflare dashboard > Settings >
 *    Variables and Secrets:
 *      - Add "VAPID_PUBLIC_KEY" as a plain (non-secret) variable, value = the
 *        public key from Nexa's "Generate VAPID keys" button.
 *      - Add "VAPID_PRIVATE_KEY" as an encrypted Secret, value = the private key
 *        from the same place. Save — the worker redeploys automatically.
 * 6. Your worker's URL is shown at the top of its dashboard page, e.g.
 *      https://nexa-push-worker.yourname.workers.dev
 *    Add "/send" to the end of that and paste it into Nexa's Settings >
 *    Notifications > push worker URL field.
 *
 * ===== OPTION B: Terminal / Wrangler CLI (if you do have Node.js + a terminal) =====
 * 1. npm install -g wrangler
 * 2. mkdir nexa-push-worker && cd nexa-push-worker
 * 3. Save index.js, wrangler.toml, and package.json (all provided) into this folder.
 * 4. npm install
 * 5. wrangler login
 * 6. wrangler secret put VAPID_PRIVATE_KEY   (paste the private key when prompted)
 * 7. wrangler deploy
 *    (VAPID_PUBLIC_KEY can be set the same way, as a secret, or added as a plain
 *    [vars] entry in wrangler.toml — either works, since the code below reads it
 *    from env either way.)
 * 8. Paste the deployed worker's URL + "/send" and your VAPID public key into
 *    Nexa's Settings > Notifications.
 *
 * Honest limits: this worker only SENDS pushes you trigger — it does not itself
 * decide when to notify someone. Wiring "notify me every Monday at 9am" into a
 * fully-closed-app guarantee means also running a Cron Trigger (Cloudflare
 * Workers support this natively, see the commented example below) that calls
 * /send on your own schedule.
 */
import webpush from 'web-push';

const VAPID_SUBJECT = 'mailto:you@example.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (url.pathname === '/send' && request.method === 'POST') {
      try {
        if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
          return json({ error: 'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — add them in the Cloudflare dashboard under Settings > Variables and Secrets' }, 500);
        }
        const { subscription, title, body } = await request.json();
        if (!subscription) return json({ error: 'missing subscription' }, 400);
        webpush.setVapidDetails(VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
        await webpush.sendNotification(subscription, JSON.stringify({ title: title || 'Nexa', body: body || '' }));
        return json({ ok: true });
      } catch (e) {
        return json({ error: String(e && e.message || e) }, 500);
      }
    }
    return json({ ok: true, message: 'nexa-push-worker is running. POST /send with {subscription, title, body}.' });
  }
  // Optional recurring schedule (uncomment + add a [triggers] crons entry in wrangler.toml
  // to actually fire notifications on a timer even if no one opens Nexa):
  // async scheduled(event, env, ctx) {
  //   webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  //   // look up subscriptions you've saved somewhere (KV, D1, etc.) and send to each
  // }
};
function corsHeaders(){ return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }; }
function json(obj, status){ return new Response(JSON.stringify(obj), { status: status||200, headers: { 'Content-Type':'application/json', ...corsHeaders() } }); }
