# Vermont Livability Data Visualization App

A **React-based Website** for exploring, visualizing, and interpreting Vermont data. Users can upload one or more datasets and view tables, data summary reports, and custom plots through an interactive interface. The backend is based on https://github.com/iansargent/Data-Exploration-Tool-in-Python.

---

## Prerequisites

Install these before you start. Every one of them is used by the standard workflow.

| Tool                                          | Why it's needed                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [git-lfs](https://git-lfs.com/)               | The datasets in `Data/` are tracked with Git LFS.                                                    |
| [just](https://just.systems/man/en/)          | Task runner. Every dev command in this project is a `just` recipe (see [justfile](justfile)).        |
| [uv](https://docs.astral.sh/uv/)              | Python dependency management and script running for the backend.                                     |
| [Node + npm](https://nodejs.org/)             | Frontend dependencies and the Next.js dev server.                                                    |
| [podman](https://podman.io/docs/installation) | Builds and runs the containerized stack.  |

> **Note:** podman is required even for the non-containerized workflow, because the `local-*` recipes call `just down` first to make sure a running container isn't already holding the ports.

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
   - You only need this for the ETL pipeline. Running the website locally (either option below) works without a `.env`.

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

The backend container reads its datasets from `/data`, which the run recipe bind-mounts read-only from the repo's `Data/` directory.

To build or check a single side:

```sh
just build-api / just run-api / just dev-api
just build-frontend / just run-frontend / just dev-frontend
just run-check-api   # run the API in the foreground with full error output
just check-frontend  # typescript check (npx tsc --noEmit)
```

> **Note:** the container and local workflows both bind `:3000` and `:6767`, so only one can be up at a time. That's why the `local-*` and `dev` recipes call `just down` first.

---

## Environment variables

Configuration lives in a `.env` file in the project root. Create it by copying the committed template:

```sh
cp .env.example .env
```

The justfile loads this file automatically (`set dotenv-filename := ".env"`), so every recipe sees these values without you exporting anything by hand. `.env` is gitignored; `.env.example` is the committed template and should always list every variable with a blank value.

| Variable         | Required for                    | Notes                                                                                                                                                                                  |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CENSUS_API_KEY` | `just get-data`, `just run-etl` | Census Bureau API key for the ACS-5 scrapers. Free and instant from [the signup page](https://api.census.gov/data/key_signup.html).                                                     |
| `DATA_DIR`       | optional                        | Overrides where the DuckLake catalog and `warehouse.duckdb` live. The justfile and the ETL containers already set this; only override it if you're running the python scripts directly. |

Notes:

- **You don't need a `.env` to run the website.** Both `just local-dev` and `just dev` set their own variables (`NEXT_PUBLIC_API_URL`, `ALLOW_DEV_CORS`) and read pre-built data. The `.env` only matters for the ETL pipeline, which re-collects data from external APIs.
- **Without `CENSUS_API_KEY` set, the scrapers don't fail loudly** — the Census API just rate-limits you to roughly 500 requests/day, and a full multi-year run makes far more than that. The failures come back as `SKIP` lines and you end up with a mostly-empty lake. If a collection run looks suspiciously fast or sparse, check this first.
- **Adding a new variable?** Add it to `.env.example` with a blank value and a comment, and add a row to the table above. That's the only way the next person finds out it exists.

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

# VM Deployment



1. sudo su - appuser0


## Credits

- Developed by Ian Sargent and Fitzwilliam Keenan-Koch
- Created under the Open Research Community Accelerator (ORCA)
- Built using the React framework, with Mantine UI.
