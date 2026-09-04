# AGENTS.md — Gigvora infrastructure notes for AI agents

This file orients any agent (Claude Code or otherwise) working in this repo about
the real, live infrastructure that exists outside the repo itself. Read this
before assuming you need to provision new infrastructure — a staging server,
domain, and CDN already exist.

## Where secrets live

**Never put real credentials in this file or anywhere committed to git.**
All real credentials (API tokens, server IPs paired with keys, generated
passwords) live in `server.env` at the repo root, which is gitignored. Source
it in a shell before running any infra command:

```
set -a && source ./server.env && set +a
```

If `server.env` is missing, ask the human operator for it — do not try to
reconstruct credentials from provider dashboards you don't have access to,
and do not provision duplicate infrastructure (a second server, a second
Cloudflare zone, a second GitHub repo) just because you can't find the
existing one. Ask first.

## Staging server

- Provider: Hetzner Cloud, server name `gigvora-staging-01`, type CX33
  (4 vCPU / 8GB / 80GB), region `fsn1`.
- Access: SSH as root using the key at `HETZNER_SSH_PRIVATE_KEY_PATH` in
  `server.env` (a dedicated deploy key, not the operator's personal key).
  Password auth is disabled server-side — key-only.
- Firewall: both a Hetzner Cloud Firewall and host-level `ufw` restrict
  inbound traffic to ports 22, 80, 443 only. Do not open other ports to
  the public internet without deliberately updating both layers.
- Hardening already in place: `fail2ban` on sshd, `unattended-upgrades`
  for security patches, ClamAV (`clamav-daemon`) running with a daily
  cron scan — do not disable these.
- App stack runs via Docker Compose (`infra/docker/docker-compose.yml`)
  on the server at `/opt/gigvora`. Postgres, Redis, and the ML service
  are bound to `127.0.0.1` only — never expose them publicly. Only
  Nginx (host-installed, not containerized) terminates public traffic
  on 80/443 and reverse-proxies to the app containers, including
  WebSocket upgrade handling for Socket.io.
- The site is currently behind an IP-allowlist + HTTP Basic Auth wall
  (Nginx `satisfy any / allow / deny all / auth_basic`) since it's
  pre-launch staging, not public production. Credentials are in
  `server.env` under `STAGING_BASIC_AUTH_*`. The allowlist file is at
  `/etc/nginx/staging_allowlist.conf` on the server — extend it rather
  than removing the auth wall entirely.
- Real per-service secrets (DB password, JWT secrets, ML service key,
  encryption key) are generated on the server itself and live only in
  the real `apps/*/.env` files there and `/root/secrets/gigvora-secrets.env`
  — they are never committed to git and never copied back to a local
  machine's repo checkout.

## Domain and CDN

- Domain `gigvora.com` (registered at IONOS) has its nameservers pointed
  at Cloudflare. The Cloudflare zone fronts `gigvora.com` and
  `www.gigvora.com`, proxied (CDN + DDoS protection active) to the
  Hetzner server's IP.
- TLS: the origin runs a Cloudflare Origin CA certificate (long-dated,
  trusted by Cloudflare specifically) so the Cloudflare↔origin hop is
  also encrypted, not just the visitor↔Cloudflare hop. Cloudflare SSL
  mode should be "Full (strict)" once that cert is confirmed installed
  — check current mode via the Cloudflare API before assuming, since it
  may temporarily be "Flexible" during setup.
- Cloudflare zone ID and account ID are in `server.env`. Do not create a
  second Cloudflare zone for this domain.

## Deployment

- A GitHub repo (`Blackwellen/gigvora` — check `server.env`'s `GITHUB_REPO`
  for the current value, repo creation may still be pending an operator
  permission fix) is the source of truth for deploys.
- Intended flow: push to `main` → GitHub Actions SSHs into the server
  (using a dedicated, forced-command-restricted CI deploy key — it can
  only run the deploy script, nothing else) → deploy script does
  `git pull && docker compose up -d --build` in `/opt/gigvora`.
- Do not set up a second, competing deploy mechanism (e.g. a different
  CD tool, a different target server) without checking with the
  operator first — this one may still be mid-setup; check `server.env`'s
  notes fields for current status before assuming it's finished.

## Ground rules for agents touching this infrastructure

- This is a real, billed, internet-facing server. Treat destructive or
  costly actions (recreating the server, wiping the database, rotating
  all secrets, changing DNS/firewall rules) as requiring explicit
  operator confirmation first, same as any other production system.
- Never print, log, or commit the contents of `server.env` or any
  server-side secrets file.
- If something in this file looks stale (server recreated, domain
  changed, deploy pipeline replaced), fix this file to match reality
  as part of your change, and say so — don't silently leave it wrong
  for the next agent.
