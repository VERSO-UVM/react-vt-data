## Set up environment ##

export DATA_DIR := justfile_directory() / "Data"

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

# build the backend collection image
[working-directory("backend")]
build-collection:
    podman build -t localhost/vdc-collection -f ETL/Dockerfile .

# run the backend collection container
[working-directory("backend")]
collect: build-collection
    podman run --rm \
        -v ../Data:/data:z \
        localhost/vdc-collection


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
