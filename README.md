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

4. **Install** the git pre-commit hooks (from the project root):

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

## Credits

- Developed by Ian Sargent and Fitzwilliam Keenan-Koch
- Created under the Open Research Community Accelerator (ORCA)
- Built using the React framework, with Mantine UI.
