# Requirements

- Data on the backend builds from public data sources as much as possible; we locally load data we can't get from an api source.
- The ducklake (and all data) should be completely removed from the git repo.
  - The _logic_ remains in source via just running the ETL branch.
  - The _data itself_ is stored on the virtual machine in a duckdb database file.
- Separation of concerns:
  - /api is a container that runs the fastAPI. It takes /data as a read only volume.
  - /data is a volume that holds the data in a duckdb database
  - /ETL is a container that updates the data lake. It takes /data as a read/write volume.
  - /frontend is a container that runs the frontend. It talks to /api via local connections and serves to the internet.
- /frontend is built in stages, _build_ and _runtime_. The _runtime_ is a slim static export. (THIS MIGHT CHANGE TO STANDALONE...)
- rootless. We don't have root access on the UVM virtual machine (VM), so we use `podman`, which doesn't require root access.
- The containers themselves are not on github, only the dockerfiles that build them are. 

