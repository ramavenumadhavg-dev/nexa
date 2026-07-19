# Nexa Push Worker

The server half of real push notifications for Nexa (Settings > Notifications).
Full setup steps (both a no-terminal, browser-only path, and a terminal/CLI
path) are in the comment header at the top of index.js — open that file first.

Files:
- index.js           the Worker itself (uses the 'web-push' npm package)
- wrangler.toml       Cloudflare Workers config
- package.json        declares the 'web-push' dependency — this is what lets
                       Cloudflare's "Connect to Git" auto-deploy install it for
                       you with no terminal required. If you do use a terminal
                       instead, run "npm install" here before "wrangler deploy".

Both VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are read from environment
variables/secrets (set in the Cloudflare dashboard, or via "wrangler secret
put") — you never need to hand-edit this file with your keys.
