import logging

from fastapi import APIRouter, HTTPException

from api.core_functions import spec_to_source
from api.models import APIResponse, FilterSpec, make_response
from query import compare_variables, composite_index, dataset_registry
from query.comparison import dataset_for_table, level_config

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/load/mapping/compare/datasets")
async def compare_datasets() -> dict:
    """Registry of every dataset available to the generalized variable
    explorer: display label, the filter_table its Section/Variable picker
    should query, and which geography levels it supports."""
    return dataset_registry()


@router.post("/load/mapping/compare/{level}")
async def compare(level: str, specs: list[FilterSpec]) -> APIResponse:
    """Bivariate comparison map: geojson in `data`, legend in `metadata`.

    `specs` carries two Cascade filter picks (Variable 1, Variable 2), each
    against its own filter_table -- the two variables can come from different
    datasets (e.g. Unemployment Rate from Economics vs. White from
    Demographics) as long as both support `level`.
    """
    if len(specs) != 2:
        raise HTTPException(
            status_code=400,
            detail=f"expected exactly 2 variable selections, got {len(specs)}",
        )

    sources = [spec_to_source(spec, "default") for spec in specs]
    picks: list[tuple[str, str]] = []
    for src in sources:
        try:
            dataset = dataset_for_table(src.filter_table)
            var_col = level_config(dataset, level)["var_col"]
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        values = src.filters.get(var_col, [])
        if len(values) != 1:
            raise HTTPException(
                status_code=400,
                detail=f"expected exactly 1 variable for {dataset}, got: {values}",
            )
        picks.append((dataset, values[0]))

    try:
        (dataset1, var1), (dataset2, var2) = picks
        geojson, legend = compare_variables(dataset1, level, var1, dataset2, var2)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return make_response(data=geojson, metadata={"legend": legend})


@router.post("/load/mapping/compare/{dataset}/{level}/composite_index")
async def compare_composite_index(dataset: str, level: str) -> APIResponse:
    """A single-component PCA summary across every variable in the dataset,
    standardized relative to this level's own Vermont-wide average (not a
    national baseline). Independent of which two variables are selected."""
    try:
        data = composite_index(dataset, level)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return make_response(data=data, metadata={})
