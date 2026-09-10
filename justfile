## Set up environment ##

export DATA_DIR := justfile_directory() / "backend" / "Data"
# Load environment variables
set dotenv-filename := ".env"

api_host := env("API_HOST", "127.0.0.1")
api_port := env("API_PORT", "6767")
api_url := env("NEXT_PUBLIC_API_URL", "http://localhost:6767/api")
# Host-specific podman flags. Empty by default (Docker, macOS, rootful podman).
# On the VM with rootless podman, override:  just podman_flags="--userns=keep-id:uid=1000,gid=1000"
podman_flags := env("PODMAN_FLAGS", "")

################
# CLI Development  #
################

[doc("initiate non-containerized backend. note: no longer turns off containers, you should do this manually")]
[group("CLI Rapid Development")]
[working-directory("backend")]
local-api:
    ALLOW_DEV_CORS=1 uv run uvicorn api.main:app --reload \
        --host {{ api_host }} --port {{ api_port }}

[doc("initiate non-containerized frontend. note: no longer turns off containers")]
[group("CLI Rapid Development")]
[working-directory("frontend")]
local-frontend:
    NEXT_PUBLIC_API_URL={{ api_url }} npm run dev -- --port 3000

[doc("turns on non-container full apps, interleaved in terminal (from Procfile). Note: no longer turns off containers")]
[group("CLI Rapid Development")]
local-dev:
    uvx honcho start

########################################################
########################################################
################## CONTAINERS ###########################
########################################################
########################################################

###############################
# Pod for containers sharing local-host  #
# ##############################

[doc("build the pod for local-host co communication")]
[group("Pod")]
build-pod:
    podman pod exists app || podman pod create --name app --userns=keep-id {{ podman_flags }} -p 6767:6767 -p 3000:8080

[doc("reset the local host pod (delete and recreate it)")]
[group("Pod")]
reset-pod:
    podman pod create --replace --name app --userns=keep-id {{ podman_flags }} -p 6767:6767 -p 3000:8080

###########
# Containers #
###########

# Combined
#########

[doc("Run and build both containers.")]
[group("Main")]
dev: down dev-api dev-frontend
    @echo "frontend hosted @ http://localhost:3000"
    @echo "api hosted @ http://localhost:3000/api/docs"

[doc("just run containers (if already built).")]
[group("Main")]
dev-run: run-api run-frontend

## API Container
#############

[doc("build the api image")]
[group("API Container")]
[working-directory("backend")]
build-api:
    podman build -t localhost/my-api -f dockerfile .

[doc("run the api image (detached)")]
[group("API Container")]
[working-directory("backend")]
run-api:
    podman run --pod app --name api -d --rm -v "{{ DATA_DIR }}:/data:ro,z"  localhost/my-api

[doc("build the api image and then check it with more error printing (non detached)")]
[group("API Container")]
[working-directory("backend")]
run-check-api: build-api
    podman run --pod app -v "{{ DATA_DIR }}:/data:ro,z"  localhost/my-api

[doc("everything to get the api up and running")]
[group("API Container")]
dev-api: build-pod build-api run-api

## Frontend Container
################

[doc("build the frontend image")]
[group("Frontend Container")]
[working-directory("frontend")]
build-frontend:
    podman build -t localhost/frontend -f dockerfile .

[doc("run the frontend image (detached)")]
[group("Frontend Container")]
run-frontend:
    podman run --pod app --name frontend  -d --rm localhost/frontend

[doc("everything to get the frontend up and running")]
[group("Frontend Container")]
dev-frontend: build-pod build-frontend run-frontend

## Maintenance mode
################

[doc("build a frontend image that shows the 'Under Maintenance' page instead of the app")]
[group("Maintenance")]
[working-directory("frontend")]
build-frontend-maintenance:
    podman build -t localhost/frontend:maintenance --build-arg NEXT_PUBLIC_MAINTENANCE_MODE=true -f dockerfile .

[doc("swap the running frontend container for the maintenance-mode one (api + pod stay up)")]
[group("Maintenance")]
maintenance-on: build-frontend-maintenance
    podman stop frontend || true
    podman rm frontend || true
    podman run --pod app --name frontend -d --rm localhost/frontend:maintenance

[doc("swap back to the real frontend image")]
[group("Maintenance")]
maintenance-off: build-frontend
    podman stop frontend || true
    podman rm frontend || true
    just run-frontend

################
# Lint, Format, and Test
################

[doc("run every lint check (frontend + backend + SQL)")]
[group("Lint & Format")]
lint: check-frontend lint-frontend lint-backend lint-sql

[doc("run every formatter (frontend + SQL)")]
[group("Lint & Format")]
format: format-frontend fix-sql

[doc("check typescript (not in the next.config, until fixed)")]
[group("Lint & Format")]
[working-directory("frontend")]
check-frontend:
    npx tsc --noEmit

[doc("lint the frontend with ESLint")]
[group("Lint & Format")]
[working-directory("frontend")]
lint-frontend:
    npm run lint

[doc("format the frontend with Prettier (fixes in place)")]
[group("Lint & Format")]
[working-directory("frontend")]
format-frontend:
    npm run format

[doc("check frontend formatting without modifying files")]
[group("Lint & Format")]
[working-directory("frontend")]
format-check-frontend:
    npm run format:check

[doc("lint the backend with ruff (fixes in place)")]
[group("Lint & Format")]
[working-directory("backend")]
lint-backend:
    uv run ruff check --fix .

[doc("lint the Jinja SQL templates with sqlfluff")]
[group("Lint & Format")]
[working-directory("backend")]
lint-sql:
    uv run sqlfluff lint query/sql build/sql

[doc("auto-fix the Jinja SQL templates with sqlfluff")]
[group("Lint & Format")]
[working-directory("backend")]
fix-sql:
    uv run sqlfluff fix query/sql build/sql

[doc("run the backend test suite")]
[group("Test")]
[working-directory("backend")]
test:
    uv run pytest

################
# ETL (Pipeline) Container
################

# --------- Pre-step: Lake Builder ---------------------
[doc("build and run the lake builder container")]
[group("ETL Pipeline")]
[working-directory("backend")]
build-lake:
    podman build -t localhost/vdc-lake -f ETL/dockerfile.lake .
    podman run --rm {{ podman_flags }} -v "$(pwd)/Data:/data:z" -e DATA_DIR=/data localhost/vdc-lake

# --------- 1. Data Collection (E) ---------------------
[doc("build the backend COLLECTION image")]
[group("ETL Pipeline")]
[working-directory("backend")]
build-collection:
    podman build -t localhost/vdc-collection -f ETL/dockerfile.collect .

[doc("Collect the data for a specified year and add to lake.RAW tables")]
[group("ETL Pipeline")]
[working-directory("backend")]
get-data start_year end_year: build-collection
    podman run --rm {{ podman_flags }} \
        -v "$(pwd)/Data:/data:z" \
        -e DATA_DIR=/data \
        -e CENSUS_API_KEY="$CENSUS_API_KEY" \
        localhost/vdc-collection {{ start_year }} {{ end_year }}

# --------- 2. Data Cleaning (T) ---------------------
[doc("Run each RAW table through it's data cleaning script")]
[group("ETL Pipeline")]
[working-directory("backend")]
transform-data:
    podman build -t localhost/vdc-cleaning -f ETL/dockerfile.clean .
    podman run --rm {{ podman_flags }} \
     -v "$(pwd)/Data:/data:z" localhost/vdc-cleaning

# --------- 3. Data Loading (L) ---------------------
[doc("Load the lake.CLEANED tables into a DuckDB database")]
[group("ETL Pipeline")]
[working-directory("backend")]
load-data:
    podman build -t localhost/vdc-loading -f ETL/dockerfile.load .
    podman run {{ podman_flags }} --rm -v "$(pwd)/Data:/data:z" localhost/vdc-loading

[doc("Collect (E), clean (T), and load (L) the data (Full pipeline run)")]
[group("ETL Pipeline")]
[working-directory("backend")]
run-etl start_year end_year:
    # Collect the data for a certain year
    just get-data {{ start_year }} {{ end_year }}
    # Clean the RAW populated lake tables into CLEANED
    just transform-data
    # Load CLEANED tables into DuckDB instance
    just load-data

#####################
# Abstracted podman util #
#####################

[doc("stream logs for the whole app pod")]
[group("Utilities")]
logs:
    podman pod logs -f app

[doc("kill the localhost app and everything in it")]
[group("Utilities")]
down:
    podman pod rm -f app

[doc("see what containers are running")]
[group("Utilities")]
see-running:
    podman ps

[doc("see what's listening on the app ports (3000, 6767)")]
[group("Utilities")]
see-ports:
    ss -tulpn | grep -E ':(3000|6767)\b' || echo "nothing listening on 3000 or 6767"
