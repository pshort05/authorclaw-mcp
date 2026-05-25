# Installation — authorclaw-docker-fix

Quick-start to apply the LAN patch to a local AuthorClaw checkout.

## Prerequisites

- A clone of [AuthorClaw](https://github.com/Ckokoski/authorclaw) on disk. The script defaults to `/opt/docker-compose/authorclaw/src`; if yours is elsewhere, set `REPO` in the environment or edit the variable near the top of `apply-lan-patch.sh`.
- `bash` and `python3` on the host that runs the script. (The docker-compose stack's `authorclaw-patcher` init container installs `python3` automatically on the Alpine base image.)
- Optional: `sudo` and `docker compose` if you use `--rebuild`.

## Path A — manual (run the script directly)

From this repo's root:

```bash
# Apply the patch in place. Idempotent — safe to re-run after a git pull
# on the AuthorClaw checkout.
./authorclaw-docker-fix/apply-lan-patch.sh

# Or, with a non-default AuthorClaw source path:
REPO=/path/to/your/authorclaw/src ./authorclaw-docker-fix/apply-lan-patch.sh

# Check what's applied without modifying anything:
./authorclaw-docker-fix/apply-lan-patch.sh --check
```

When complete, restart AuthorClaw so the new bind takes effect. Either:

```bash
sudo docker compose -f /opt/docker-compose/docker-compose.yml restart authorclaw
```

or use the one-liner that does patch + rebuild + recreate:

```bash
./authorclaw-docker-fix/apply-lan-patch.sh --rebuild
```

## Path B — via the docker-compose stack in this repo

If you're using the `docker-compose.yml` at the parent directory, the patcher runs automatically as an init container before AuthorClaw starts. No manual step required — the compose file already bind-mounts this directory's script and runs it once per stack-up.

```bash
# From the repo root:
docker compose run --rm authorclaw-patcher   # one-shot apply
docker compose up -d                          # bring up the full stack
```

The patcher exits successfully on the second invocation too — the idempotency check means re-running is harmless.

## Verifying it worked

After patching and restarting AuthorClaw, you should be able to reach the gateway from a non-localhost address:

```bash
curl -fsS http://<authorclaw-host>:3847/api/health
# {"status":"ok","name":"AuthorClaw","version":"..."}
```

If you still get connection refused, run `apply-lan-patch.sh --check` to confirm all five transformations are present. Exit code 0 means the patch is fully applied; anything else points at what's missing.

## Re-applying after an AuthorClaw upgrade

The script is idempotent and detects when upstream has restructured `gateway/src/index.ts`. After each `git pull` in the AuthorClaw checkout:

```bash
./authorclaw-docker-fix/apply-lan-patch.sh
```

If the script exits with code 3 (anchor not found / file changed shape), the upstream source has moved past what this patch knows how to match. Open an issue or update the script.

## Uninstalling

The patch edits AuthorClaw's source in place. To revert:

```bash
cd /opt/docker-compose/authorclaw/src
git checkout -- gateway/src/index.ts
```

Then restart AuthorClaw. It will return to the original 127.0.0.1-only bind.

## Security reminder

This patch removes AuthorClaw's localhost-only network isolation. Read [`README.md`](./README.md#security-caveats) before applying it to any installation that's reachable from an untrusted network.
