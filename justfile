###############################
# Pod for containers sharing local-host  #
# ##############################
build-pod:
    podman pod exists app || podman pod create --name app --userns=keep-id -p 6767:6767 -p 3000:8080

reset-pod:
    podman pod create --replace --name app --userns=keep-id -p 6767:6767 -p 3000:8080

###########
# Containers #
###########

# Run and build both containers as dev
dev: dev-api dev-frontend

# just run containers (if already built) as dev
dev-run: run-api run-frontend

## API Container

[working-directory("backend")]
build-api:
    podman build -t localhost/my-api -f dockerfile . 

[working-directory("backend")]
run-api:
    podman run --pod app -d --rm -v ../Data:/data:ro,z  localhost/my-api    

dev-api: build-pod build-api run-api

## Frontend Container

[working-directory("frontend")]
build-frontend:
    podman build -t localhost/frontend -f dockerfile .

run-frontend:
    podman run --pod app -d --rm localhost/frontend

dev-frontend: build-pod build-frontend run-frontend

# this has the check
[working-directory("frontend")]
check-frontend:
    npx tsc --noEmit    

logs:
    podman pod logs -f app

down:
    podman pod stop app
