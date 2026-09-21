# Vermont Livability Data Visualization App

A **React-based Website** for exploring, visualizing, and interpreting Vermont data. Users can upload one or more datasets and view tables, data summary reports, and custom plots through an interactive interface. The backend is based on https://github.com/iansargent/Data-Exploration-Tool-in-Python.

---

## Prerequisites

Install these before you start. Every one of them is used by the standard workflow.

| Tool                                          | Why it's needed                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [git-lfs](https://git-lfs.com/)               | The datasets in `Data/` are tracked with Git LFS.                                             |
| [just](https://just.systems/man/en/)          | Task runner. Every dev command in this project is a `just` recipe (see [justfile](justfile)). |
| [uv](https://docs.astral.sh/uv/)              | Python dependency management and script running for the backend.                              |
| [Node + npm](https://nodejs.org/)             | Frontend dependencies and the Next.js dev server.                                             |
| [podman](https://podman.io/docs/installation) | Builds and runs the containerized stack.                                                      |

> **Note:** the non-containerized recipes do not stop existing containers. Stop a container yourself if it is already using the required port.

---

## Installation & Setup

1. **Clone** this repository:

   ```sh
   git lfs install
   git clone https://github.com/FWJK1/react-vt-data
   cd react-vt-data
   ```

2. **Install** python dependencies:

   ```sh
   cd backend
   uv sync
   ```

   - Remember to prefix `uv run` to any python code you want to run.
   - If you need to add packages later, use `uv add` from the `backend` directory.

3. **Install** frontend dependencies:

   ```sh
   cd frontend
   npm install
   ```

4. **Set up** your environment file (from the project root):

   ```sh
   cp .env.example .env
   ```

   Then open `.env` and fill in the values. See [Environment variables](#environment-variables) below for what each one is and where to get it.

   - `.env` is gitignored — it holds secrets and should never be committed. `.env.example` is the committed template; if you add a new variable, add a blank entry there too so the next person knows it exists.
   - The website and unauthenticated local MCP work without a `.env`; ETL credentials and deployed MCP settings belong here.

5. **Install** the git pre-commit hooks (from the project root):

   ```sh
   uv tool install pre-commit
   pre-commit install
   ```

   - This makes `ruff format` (python) and `prettier` (typescript) run automatically on the files you commit. The same checks run in CI on every pull request, so installing the hooks saves you a failed build later.

---

## Running the website locally

There are two ways to run the app. Both are driven by `just` from the project root — run `just --list` to see every recipe.

### Option A: non-containerized (fastest iteration)

Runs uvicorn and `next dev` directly on your machine, with hot reload on both sides.

```sh
just local-dev
```

This starts both processes in one terminal (interleaved output, via [Procfile](Procfile) and honcho). Open [http://localhost:3000](http://localhost:3000).

To run just one side, in separate terminals:

```sh
just local-api        # uvicorn on :6767, docs at http://localhost:6767/api/docs
just local-frontend   # next dev on :3000
```

These recipes set the environment for you — `NEXT_PUBLIC_API_URL` so the frontend finds the API, and `ALLOW_DEV_CORS=1` so the backend accepts cross-origin requests from the dev server. You do not need to configure `frontend/.env.local` yourself.

### Option B: containerized (matches production)

Builds both images and runs them in a shared podman pod, with nginx serving the static Next.js export and proxying `/api/` to the backend. Everything is same-origin, so no CORS is involved.

```sh
just dev        # build both images and run them
```

Open [http://localhost:3000](http://localhost:3000); API docs are at [http://localhost:3000/api/docs](http://localhost:3000/api/docs).

Useful follow-ups:

```sh
just dev-run    # re-run existing images without rebuilding
just logs       # follow logs from the whole pod
just see-running  # list running containers
just down       # stop the pod
just reset-pod  # delete and recreate the pod (if it gets into a bad state)
```

The backend container reads `warehouse.duckdb` from `/data`, which the run recipe bind-mounts read-only from `backend/Data/` (or an absolute `DATA_DIR` override). The warehouse must already exist; it is not included in the image.

To build or check a single side:

```sh
just build-api / just run-api / just dev-api
just build-frontend / just run-frontend / just dev-frontend
just run-check-api   # run the API in the foreground with full error output
just check-frontend  # typescript check (npx tsc --noEmit)
```

> **Note:** the container and local website workflows both bind `:3000` and `:6767`, so only one can be up at a time. `just dev` recreates the pod; the `local-*` recipes do not stop it automatically.

## MCP for agents

The backend exposes nine shared data tools through a Streamable HTTP MCP server.
Start a separate local server without authentication:

```sh
just mcp
```

It listens at `http://127.0.0.1:6768/api/mcp` and reads the existing warehouse.
`just mcp-dev-auth` enables the documented development bearer token;
`just test-mcp` runs fixture-based tests without production data.

See [the MCP guide](docs/mcp.md) for Claude Code setup, all tools, multiple bearer
tokens, internal-agent reuse, configuration, deployment, and acceptance checks.

---

## Environment variables

Configuration lives in a `.env` file in the project root. Create it by copying the committed template:

```sh
cp .env.example .env
```

The justfile loads this file automatically (`set dotenv-filename := ".env"`), so every recipe sees these values without you exporting anything by hand. `.env` is gitignored; `.env.example` is the committed template and documents optional values as commented examples.

| Variable                                                                                                               | Required for                    | Notes                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `CENSUS_API_KEY`                                                                                                       | `just get-data`, `just run-etl` | Census Bureau API key for the ACS-5 scrapers. Free and instant from [the signup page](https://api.census.gov/data/key_signup.html). |
| `DATA_DIR`                                                                                                             | optional                        | Absolute host data directory; defaults to `backend/Data`. API and ETL containers mount this at `/data`.                             |
| `MCP_ENABLED`                                                                                                          | deployed MCP                    | Set `true` to mount `/api/mcp` in the API. Disabled by default; standalone `just mcp` does not need it.                             |
| `MCP_AUTH_MODE`                                                                                                        | MCP authentication              | `none`, `development`, or `bearer`. The existing API mount requires bearer mode.                                                    |
| `MCP_BEARER_TOKENS`                                                                                                    | bearer mode                     | Comma-separated tokens, one per consumer. Generate each with `just mcp-token`.                                                      |
| `MCP_ALLOWED_HOSTS`, `MCP_ALLOWED_ORIGINS`                                                                             | deployed MCP                    | Explicit hostname and origin allowlists for the deployed endpoint.                                                                  |
| `MCP_HOST`, `MCP_PORT`                                                                                                 | optional standalone MCP         | Default `127.0.0.1:6768`; local no-auth/development modes require loopback.                                                         |
| `MCP_MAX_ROWS`, `MCP_MAX_BYTES`, `MCP_QUERY_TIMEOUT`, `MCP_MAX_CONCURRENCY`, `MCP_RATE_LIMIT`, `MCP_MAX_REQUEST_BYTES` | optional MCP limits             | Response, query, concurrency, and HTTP limits; see [MCP configuration](docs/mcp.md#configuration).                                  |

Notes:

- **You don't need a `.env` to run the website or the standalone no-auth MCP.** The website reads pre-built data. Use `.env` for ETL credentials and for enabling authenticated MCP in the API container.
- **Without `CENSUS_API_KEY` set, the scrapers don't fail loudly** — the Census API just rate-limits you to roughly 500 requests/day, and a full multi-year run makes far more than that. The failures come back as `SKIP` lines and you end up with a mostly-empty lake. If a collection run looks suspiciously fast or sparse, check this first.
- **Adding a new variable?** Document it in `.env.example` and the relevant configuration guide without committing secrets.

---

## Development

All development must:

- Use the `prettier` formatter and `eslint` linter for reliable diffs in typescript, and `ruff format` in python. Formatting is applied automatically at commit time if you've run `pre-commit install` (see Installation & Setup), and enforced in CI by the Format Check workflow.

All development should:

- Use [Mantine](https://mantine.dev/) UI where applicable.
- Use [Axios](https://axios-http.com/docs/intro) for internal API queries (frontend requesting backend API).
- Use [Duckdb](https://duckdb.org/) for any new data queries.
- Add new commands as `just` recipes rather than documenting bare shell invocations, so there is one place to look them up. Include comments.

## License

This project is open-source under the **MIT License**.

---

## VM Deployment

The API and MCP run in the existing rootless Podman stack on the VM, using a
read-only warehouse volume. The application account has historically been
`appuser0`. The GitHub Pages workflow only publishes the static frontend; it does
not deploy the backend or MCP.

Use the [MCP deployment runbook](docs/mcp.md#deployment-in-this-repository) for the
environment configuration, image build and rollout procedure, HTTPS proxy
requirements, smoke checks, and rollback. The
[containerization checklist](design/current/containerization.md) covers the
existing website stack as well.

## Credits

- Developed by Ian Sargent and Fitzwilliam Keenan-Koch
- Created under the Open Research Community Accelerator (ORCA)
- Built using the React framework, with Mantine UI.
