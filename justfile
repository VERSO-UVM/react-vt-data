## Set up environment ##

export DATA_DIR := justfile_directory() / "backend" / "Data"
# Load environment variables
set dotenv-filename := ".env"

################
# CLI Development  #
################

# turns on non-containerized backend. note: turns off containers
[working-directory("backend")]
local-api: down
    ALLOW_DEV_CORS=1 uv run uvicorn api.main:app --reload --port 6767

# turns on non-container frontend. note: turns off containers
[working-directory("frontend")]
local-frontend: down
    NEXT_PUBLIC_API_URL=http://localhost:6767/api npm run dev -- --port 3000

# turns on non-container full apps, interleaved in terminal (from Procfile). Note: turns off containers
local-dev: down
    uvx honcho start

########################################################
########################################################
################## CONTAINERS ###########################
########################################################
########################################################

###############################
# Pod for containers sharing local-host  #
# ##############################

# build the pod for local-host co communication
build-pod:
    podman pod exists app || podman pod create --name app --userns=keep-id -p 6767:6767 -p 3000:8080

# reset the local host pod (delete and recreate it).
reset-pod:
    podman pod create --replace --name app --userns=keep-id -p 6767:6767 -p 3000:8080

###########
# Containers #
###########

# Combined
#########

# Run and build both containers as dev
dev: down dev-api dev-frontend
    @echo "frontend hosted @ http://localhost:3000"
    @echo "api hosted @ http://localhost:3000/api/docs"

# just run containers (if already built) as dev
dev-run: run-api run-frontend

## API Container
#############

# build the api image
[working-directory("backend")]
build-api:
    podman build -t localhost/my-api -f dockerfile . 

# run the api image (detached)
[working-directory("backend")]
run-api:
    podman run --pod app --name api -d --rm -v ../Data:/data:ro,z  localhost/my-api    

# build the api image and then check it with more error printing (non detached)
[working-directory("backend")]
run-check-api: build-api
    podman run --pod app -v ../Data:/data:ro,z  localhost/my-api    

# everything to get the api up and running
dev-api: build-pod build-api run-api

## Frontend Container
################

# build the frontend image
[working-directory("frontend")]
build-frontend:
    podman build -t localhost/frontend -f dockerfile .

# run the frontend image (detached)
run-frontend:
    podman run --pod app --name frontend  -d --rm localhost/frontend

# everything to get the frontend up and running
dev-frontend: build-pod build-frontend run-frontend

# check typescript (not in the next.config, until fixed)
[working-directory("frontend")]
check-frontend:
    npx tsc --noEmit    


## ETL (Pipeline) Container
################

# --------- Pre-step: Lake Builder ---------------------
[working-directory("backend")]
build-lake:
    podman build -t localhost/vdc-lake -f ETL/dockerfile.lake .
    podman run --rm -v "$(pwd)/Data:/data:z" -e DATA_DIR=/data localhost/vdc-lake


# --------- 1. Data Collection (E) ---------------------
# build the backend COLLECTION image
[working-directory("backend")]
build-collection:
    podman build -t localhost/vdc-collection -f ETL/dockerfile.collect .

# Collect the data for a specified year and add to lake.RAW tables
[working-directory("backend")]
get-data start_year end_year: build-collection
    echo "Using API key: $CENSUS_API_KEY"
    podman run --rm \
        -v "$(pwd)/Data:/data:z" \
        -e DATA_DIR=/data \
        -e CENSUS_API_KEY="$CENSUS_API_KEY" \
        localhost/vdc-collection {{start_year}} {{end_year}}


# --------- 2. Data Cleaning (T) ---------------------
# Run each RAW table through it's data cleaning script
[working-directory("backend")]
transform-data:
    podman build -t localhost/vdc-cleaning -f ETL/dockerfile.clean .
    podman run --rm -v "$(pwd)/Data:/data:z" localhost/vdc-cleaning


# --------- 3. Data Loading (L) ---------------------
# Load the lake.CLEANED tables into a DuckDB database
[working-directory("backend")]
load-data:
    podman build -t localhost/vdc-loading -f ETL/dockerfile.load .
    podman run --rm -v "$(pwd)/Data:/data:z" localhost/vdc-loading


# Collect (E), clean (T), and load (L) the data (Full pipeline run)
[working-directory("backend")]
run-etl start_year end_year:
    # Collect the data for a certain year
    just get-data {{start_year}} {{end_year}}
    # Clean the RAW populated lake tables into CLEANED
    just transform-data
    # Load CLEANED tables into DuckDB instance
    just load-data 


#####################
# Abstracted podman util #
#####################

logs:
    podman pod logs -f app

# kill the localhost app and everything in it
down:
    podman pod rm -f app

# see what containers are running
see-running:
    podman ps

