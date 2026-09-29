# Documentation

New here? Start with the [Codebase Primer](Codebase_Primer.md). Setup and
day-to-day commands are in the [root README](../README.md).

## Layout

| Folder                         | What belongs there                                                    |
| ------------------------------ | --------------------------------------------------------------------- |
| [architecture/](architecture/) | How the system is built and why: pipeline, containers, filter design  |
| [datasets/](datasets/)         | One page per raw lake table (`lake.RAW.*`): source, columns, quirks   |
| [guides/](guides/)             | Task-oriented how-tos and runbooks (MCP setup, deployment)            |
| [reports/](reports/)           | Dated audits and findings; snapshots that are not kept up to date     |
| [archive/](archive/)           | Superseded designs, meeting notes, and old planning; kept for history |

## Conventions

- File names are lowercase `kebab-case.md` (the primer is the one exception).
  Dataset pages are named after the lake table: `docs/datasets/<table>.md`.
- Dated reports are prefixed `YYYY-MM-DD-`.
- Link with relative paths so links work on GitHub and in an editor.
- Format with Prettier (`frontend/node_modules/.bin/prettier --write docs/**/*.md`).
- Move a doc to `archive/` instead of deleting it when its design is replaced.

## Dataset pages

Pages with a full column reference are marked ✅; the rest are placeholders
waiting for someone to fill in the table. Copy [zoning](datasets/zoning.md) as the
template.

| Table                                                    | Status |
| -------------------------------------------------------- | ------ |
| [`zoning`](datasets/zoning.md)                           | ✅     |
| [`ambulance`](datasets/ambulance.md)                     | ⬜     |
| [`cdc_places_tract`](datasets/cdc_places_tract.md)       | ⬜     |
| [`flood`](datasets/flood.md)                             | ⬜     |
| [`historic_population`](datasets/historic_population.md) | ⬜     |
| [`housing`](datasets/housing.md)                         | ⬜     |
| [`qcew`](datasets/qcew.md)                               | ⬜     |
| [`vt_town_lines`](datasets/vt_town_lines.md)             | ⬜     |
| [`ww_service_areas`](datasets/ww_service_areas.md)       | ⬜     |
