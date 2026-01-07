- src/components/configs/ChartDefs are the static list of general chart specs we want to build.
- specific chart specs are built from these to match the current profile in src/app/data-viewer
- these charts are then rendered by the functionality in src/components/Chart

# Plan

- The plan is to eventually include metadata in the API calls as well, so that the chart item hydrates with metadata as well as actual data. Then we can display it alongside.
