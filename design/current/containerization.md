# Requirements

- Data on the backend builds from sources as much as possible; we r-sync that which we can't get from an api source.
- The ducklake (and all data) should be completely removed from the git repo.
    - The *logic* remains in source via just running the ETL branch.
    - The *data itself* is stored on the virtual machine. For now, in a duckdb. Eventually, in a ducklake.
- Separation of concerns:
    - /api is a container that runs the fastAPI. It takes /data as a read only volume.
    - /data is a volume that holds the data. initially this will be a duckdb, but eventually a ducklake.
    - /ETL is a container that updates the data lake. It takes /data as a read/write volume.
    - /frontend is a container that runs the frontend. It talks to /api via local connections and serves to the internet.
- /frontend is built in stages, *build* and *runtime*. The *runtime* is a slim static export. (THIS MIGHT CHANGE TO STANDALONE...)
- rootless. We don't have root access on the VM, so instead of docker we use podman, which doesn't require root access.
- The containers themselves are not on github, only the dockerfiles to build them   