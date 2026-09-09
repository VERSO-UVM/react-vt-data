# Requirements

- Data on the backend builds from sources as much as possible; we r-sync that which we can't get from an api source.
- The ducklake (and all data) should be completely removed from the git repo.
  - The _logic_ remains in source via just running the ETL branch.
  - The _data itself_ is stored on the virtual machine. For now, in a duckdb. Eventually, in a ducklake.
- Separation of concerns:
  - /api is a container that runs the fastAPI. It takes /data as a read only volume.
  - /data is a volume that holds the data. initially this will be a duckdb, but eventually a ducklake.
  - /ETL is a container that updates the data lake. It takes /data as a read/write volume.
  - /frontend is a container that runs the frontend. It talks to /api via local connections and serves to the internet.
- /frontend is built in stages, _build_ and _runtime_. The _runtime_ is a slim static export. (THIS MIGHT CHANGE TO STANDALONE...)
- rootless. We don't have root access on the VM, so instead of docker we use podman, which doesn't require root access.
- The containers themselves are not on github, only the dockerfiles to build them

## Deployment verification checklist

Run through this before switching the VM's checked-out branch to a new one (e.g. after merging `main` updates). Each item is a pass/fail check, not a guarantee — re-derive the exact commands from context rather than assuming they still match verbatim as the justfile evolves.

1. **Ports** — `lsof -iTCP:3000 -sTCP:LISTEN` / `:6767` should show exactly one listener (podman's proxy), and `just down` should fully free both.
2. **API reachable on both ports, from both loopback and the host's real address** — `:3000/api/...` (nginx-proxied, same-origin) and `:6767/api/...` (direct to the API container) should both return real data, on `localhost` and on the machine's actual IP/hostname (not just `127.0.0.1`).
3. **Data accuracy (golden test)** — spot-check at least one API response against an independently-known fact (e.g. Vermont's 2020 Census population, 643,077; the ~251 towns/cities/gores/grants). Sums must be filtered to a single `geo_type` — town + county + state rows sum together will look like ~3x the real number, which is a query mistake, not a data bug.
4. **Clean teardown** — `just down` removes the pod and all containers, frees the ports; a subsequent `just dev` rebuilds and comes back up without leftover-name conflicts (tests idempotent redeploy in the same pass).
5. **Maintenance mode** — `just maintenance-on` swaps only the frontend container to the maintenance build; the API and pod stay up and reachable throughout. `just maintenance-off` swaps back cleanly. (Note: this is not "whole stack down → backup page" — if the pod itself is down, nothing is running to serve any page. That would need something outside the pod entirely, e.g. a standalone static-file server independent of `just down`/`just dev` — not built as of this checklist.)
6. **VM env-var overrides actually take effect** — `API_HOST`/`API_PORT` (consumed by `local-api`, wired into `local-frontend` via `api_url`), `PODMAN_FLAGS` (consumed by `build-pod`/`reset-pod` and the ETL containers; deliberately *not* repeated on `run-api`/`run-frontend`, since containers joining a pod with `--pod app` inherit the pod's user-namespace settings automatically), and `DATA_DIR` (resolves to an absolute path via `justfile_directory()`, so it's correct regardless of the caller's cwd).
7. **CORS locked down in the containerized path** — `ALLOW_DEV_CORS` must not be set in the API container's environment; a request with an arbitrary `Origin` header should get no `Access-Control-Allow-Origin` back.
