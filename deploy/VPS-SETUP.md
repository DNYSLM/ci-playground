# VPS setup (Plesk)

The VPS runs Plesk on AlmaLinux 9. Plesk's nginx owns ports 80 and 443, so
nothing here installs Docker or a second web server. Everything runs as one
unprivileged user, `devplay`, which owns the `dev.slotboom.ninja` subscription
and nothing else. Your other sites are out of its reach.

One step at a time. Each step says how to undo it.

## How it fits together

```
browser ──https──> Plesk nginx ──> router :4000 ──> todo@staging     :4001
  staging.dev.slotboom.ninja                   ──> todo@production  :4002
  prod.dev.slotboom.ninja                      ──> todo@pr-<n>      :5000+n
  preview.dev.slotboom.ninja/pr-<n>/
```

| Piece | Where |
| --- | --- |
| App releases and secrets | `~devplay/apps/<env>/` (`current`, `releases/`, `env`) |
| Router | `~devplay/apps/router/router.mjs`, service `todo-router` |
| App processes | user services `todo@staging`, `todo@production`, `todo@pr-<n>` |
| Runner | `~devplay/actions-runner/`, service `github-runner` |
| Node | Plesk's `/opt/plesk/node/24/bin/node` |

All services are `devplay` user services: `systemctl --user ...` and
`journalctl --user -u ...`, run as `devplay`.

## Done already

* `dev.slotboom.ninja` is its own subscription with system user `devplay`,
  shell `/bin/bash`.
* Your Mac's key `~/.ssh/slotboom_vps` logs in as `devplay`, and only there.
* DNS: Hostnet already resolves `*.dev.slotboom.ninja` to the VPS.

## 1. Let devplay's services run while nobody is logged in (root)

In the VPS console as root:

```bash
loginctl enable-linger devplay
rpm -q libicu || dnf install -y libicu
```

The second line makes sure the runner's one system dependency is there.

Undo: `loginctl disable-linger devplay` (and `dnf remove libicu` only if this
step installed it).

## 2. Three subdomains with certificates (Plesk, as admin)

In the `dev.slotboom.ninja` subscription, *Add Subdomain* three times:
`staging`, `prod`, `preview`. For each one:

* *SSL/TLS Certificates*: issue a free Let's Encrypt certificate.
* *Hosting Settings*: tick the permanent 301 redirect from HTTP to HTTPS.

Undo: remove the subdomains.

## 3. Send their traffic to the router (Plesk, as admin)

For each of the three subdomains: *Apache & nginx Settings*:

* untick *Proxy mode*
* paste the contents of [`plesk-nginx.conf`](plesk-nginx.conf) into
  *Additional nginx directives*

Until step 4, the pages show a 502 from nginx. That's expected.

Undo: empty the box and tick *Proxy mode* again.

## 4. Router and services (devplay)

From your Mac, in this repo:

```bash
scp -i ~/.ssh/slotboom_vps -r deploy devplay@185.57.10.82:setup
ssh -i ~/.ssh/slotboom_vps devplay@185.57.10.82 'setup/install-user-services.sh'
```

Check: `https://staging.dev.slotboom.ninja` now says "Nothing is running for
this environment". That text comes from the router, so the whole path works.

Undo: `ssh ... 'setup/install-user-services.sh uninstall'`.

## 5. The runner (devplay)

In GitHub: *repo > Settings > Actions > Runners > New self-hosted runner >
Linux x64*. SSH in as `devplay` and run its *Download* commands in
`~/actions-runner`. Then configure it:

```bash
cd ~/actions-runner
./config.sh --url https://github.com/<you>/ci-playground --labels playground-vps --unattended --token <token>
systemctl --user enable --now github-runner
```

Type the token straight into the VPS shell. Never paste it into a chat, a
ticket or a file. It expires after an hour anyway.

Check: the runner shows *Idle* on the GitHub page.

Undo: `systemctl --user disable --now github-runner`, then
`./config.sh remove --token <removal token from the same page>`.

## 6. GitHub settings

*Settings > Secrets and variables > Actions*:

| Kind | Name | Value |
| --- | --- | --- |
| Variable | `BASE_DOMAIN` | `dev.slotboom.ninja` |
| Secret | `STAGING_SEED_PASSWORD` | any long random string |
| Secret | `PROD_SEED_PASSWORD` | a different one |
| Secret | `PREVIEW_SEED_PASSWORD` | a third one |

Generate each with `openssl rand -hex 16` in your own terminal. Hex keeps them
safe for the env files.

Undo: delete them on the same page.

## Looking around (devplay)

```bash
systemctl --user list-units 'todo*' github-runner.service
journalctl --user -u todo@staging -n 50
curl -s http://127.0.0.1:4001/api/version
```

## Rolling back by hand (devplay)

Each environment keeps its last three releases:

```bash
ls -t ~/apps/staging/releases/
ln -sfn ~/apps/staging/releases/<older one> ~/apps/staging/current
systemctl --user restart todo@staging
```

`/api/version` then reports the older commit, because each release carries its
own `release.env`. The next push to main replaces it again.
