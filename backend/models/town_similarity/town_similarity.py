"""
**Author**:
    Ian Sargent
**Created**:
    2026-11-11
**Description**:
    Script assessing the most "similar" VT towns to a given town input using
    Cosine similarity between all Census DP variables.
**Run alone with**:
    python -m backend.models.town_similarity.town_similarity
**Test GEOIDs**:
    Stowe:           5001570525
    Burlington City: 5000710675
    Guildhall:       5000930775
    Middlebury:      5000144350
    Berlin:          5002305650
"""

import duckdb
import numpy as np
import pandas as pd
from backend.models.town_similarity.constants import (
    SIMILARITY_CATEGORIES,
    SIMILARITY_INDICATORS,
)
from backend.query.production_db import get_db
from sklearn.impute import SimpleImputer
from sklearn.metrics import pairwise_distances
from sklearn.preprocessing import MinMaxScaler, StandardScaler


def get_similarity_data(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    """
    Retrieve selected 2024 ACS5 indicators for Vermont municipalities.
    """
    df = con.execute("""
        SELECT *
        FROM acs5_dp_combined_tidy
        WHERE year = 2024
          AND geo_type = 'town'
    """).df()

    # Select only the chosen Census indicators
    df = df[df["variable_code"].isin(SIMILARITY_INDICATORS)]

    # Pivot to one row per municipality, one column per indicator
    wide_df = df.pivot_table(
        index=["geoid", "name"],
        columns="variable_code",
        values="value",
        aggfunc="first",
    ).reset_index()

    wide_df.columns.name = None

    # Check for indicators missing from the database
    missing = set(SIMILARITY_INDICATORS) - set(wide_df.columns)

    if missing:
        print(f"Warning: {len(missing)} indicators missing:")
        print(sorted(missing))

    return wide_df


def calculate_category_scores(
    wide_df: pd.DataFrame,
    selected_town: str,
    indicators: list[str],
) -> pd.Series:

    # Validate selected indicators
    missing = sorted(set(indicators) - set(wide_df.columns))
    if missing:
        raise ValueError(f"Missing indicators: {missing}")

    # Select and clean features
    X = wide_df[indicators].apply(pd.to_numeric, errors="coerce")
    X = X.replace([np.inf, -np.inf], np.nan)

    # Remove entirely missing and zero-variance columns
    X = X.dropna(axis=1, how="all")
    X = X.loc[:, X.nunique(dropna=True) > 1]

    if X.empty:
        raise ValueError("No usable indicators remain.")

    # Impute missing values and standardize
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    # Calculate cosine distances
    distances = pairwise_distances(X_scaled, metric="cosine")

    distance_df = pd.DataFrame(
        distances,
        index=wide_df["geoid"].astype(str),
        columns=wide_df["geoid"].astype(str),
    )

    # Get distances from selected municipality
    town_distances = distance_df.loc[selected_town].drop(selected_town)

    # Convert distances into similarity scores (4–99)
    scaler = MinMaxScaler(feature_range=(0, 95))

    scaled_distances = scaler.fit_transform(
        town_distances.to_numpy().reshape(-1, 1)
    ).flatten()

    similarity_scores = 99 - scaled_distances

    return pd.Series(
        similarity_scores,
        index=town_distances.index,
    ).round(1)


def get_similarity_breakdown(
    wide_df: pd.DataFrame,
    selected_town: str,
    k: int = 10,
) -> pd.DataFrame:

    wide_df = wide_df.copy()
    wide_df["geoid"] = wide_df["geoid"].astype(str)
    selected_town = str(selected_town)

    if selected_town not in wide_df["geoid"].values:
        raise ValueError(f"GEOID {selected_town} not found.")

    # Municipality names and GEOIDs
    results = wide_df[["geoid", "name"]].set_index("geoid").drop(index=selected_town)

    # Calculate overall and category-specific scores
    for category, indicators in SIMILARITY_CATEGORIES.items():
        scores = calculate_category_scores(
            wide_df,
            selected_town,
            indicators,
        )

        column_name = f"{category}_similarity"
        results[column_name] = scores.reindex(results.index)

    # Rank municipalities by overall similarity
    results = results.sort_values("overall_similarity", ascending=False).head(k)

    results.insert(
        0,
        "rank",
        range(1, len(results) + 1),
    )

    return results.reset_index()


def prepare_similarity_data(wide_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Clean, impute, and standardize municipality-level features.
    """
    # Separate identifiers from numeric features
    X = wide_df.drop(columns=["geoid", "name"])
    X = X.apply(pd.to_numeric, errors="coerce")
    # Replace infinite values with missing values
    X = X.replace([np.inf, -np.inf], np.nan)
    # Remove entirely missing columns
    X = X.dropna(axis=1, how="all")
    # Remove zero-variance columns
    X = X.loc[:, X.nunique(dropna=True) > 1]

    if X.empty:
        raise ValueError("No usable numeric features found.")

    # Median imputation
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)

    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)

    X_scaled = pd.DataFrame(
        X_scaled, index=wide_df["geoid"].astype(str), columns=X.columns
    )

    # Municipality lookup
    municipality_names = wide_df[["geoid", "name"]].copy()
    municipality_names["geoid"] = municipality_names["geoid"].astype(str)

    return X_scaled, municipality_names


def calculate_distance_matrix(
    X_scaled: pd.DataFrame, metric: str = "cosine"
) -> pd.DataFrame:
    """
    Calculate pairwise municipality distances.
    """
    distances = pairwise_distances(X_scaled, metric=metric)
    return pd.DataFrame(distances, index=X_scaled.index, columns=X_scaled.index)


def get_peer_scores(
    distance_matrix: pd.DataFrame,
    selected_town: str,
    municipality_names: pd.DataFrame,
    k: int | None = 10,
) -> pd.DataFrame:
    """
    Convert distances into relative similarity scores (0-95).
    * 95 = closest municipality
    * 0 = farthest municipality
    """
    selected_town = str(selected_town)
    if selected_town not in distance_matrix.index:
        raise ValueError(f"GEOID {selected_town} not found in distance matrix.")

    name_lookup = municipality_names.set_index("geoid")["name"]
    # Exclude the selected municipality
    distances = distance_matrix.loc[selected_town].drop(selected_town)

    # Handle identical distances
    if distances.max() == distances.min():
        similarity_scores = pd.Series(95.0, index=distances.index)
    else:
        # Scale distances to 0-99
        scaler = MinMaxScaler(feature_range=(0, 95))

        scaled_distances = scaler.fit_transform(
            distances.values.reshape(-1, 1)
        ).flatten()

        # Invert: smaller distance = higher similarity
        similarity_scores = pd.Series(99 - scaled_distances, index=distances.index)

    # Rank from most similar to least similar
    ranked_peers = similarity_scores.sort_values(ascending=False).round(1)

    if k is not None:
        ranked_peers = ranked_peers.head(k)

    results = pd.DataFrame(
        {
            "geoid": ranked_peers.index,
            "name": name_lookup.reindex(ranked_peers.index).values,
            "similarity_score": ranked_peers.values,
            "distance": distances.reindex(ranked_peers.index).values,
        }
    )

    results = results.reset_index(drop=True)
    results.index = results.index + 1
    results.index.name = "rank"

    return results


def similar_town_finder(
    town_geoid: str,
    distance_matrix: pd.DataFrame,
    municipality_names: pd.DataFrame,
    k: int = 10,
) -> pd.DataFrame:
    """
    Return the top k municipalities most similar to a selected town.
    """
    return get_peer_scores(
        distance_matrix=distance_matrix,
        selected_town=str(town_geoid),
        municipality_names=municipality_names,
        k=k,
    )


def find_similar_towns(
    con: duckdb.DuckDBPyConnection, town_geoid: str, k: int = 10, metric: str = "cosine"
) -> pd.DataFrame:
    # Retrieve data
    wide_df = get_similarity_data(con)
    # Prepare features
    scaled_features, municipality_labels = prepare_similarity_data(wide_df)
    # Calculate pairwise distances
    distance_matrix = calculate_distance_matrix(scaled_features, metric=metric)
    # Find similar municipalities
    results = similar_town_finder(
        town_geoid=town_geoid,
        distance_matrix=distance_matrix,
        municipality_names=municipality_labels,
        k=k,
    )
    return results


def main():
    print("\n" + "=" * 65)
    print("VERMONT MUNICIPALITY SIMILARITY MODEL")
    print("=" * 65)

    print("\nLoading municipality data...")

    con = get_db()
    wide_df = get_similarity_data(con)
    wide_df["geoid"] = wide_df["geoid"].astype(str)

    # Interactive municipality selection
    while True:
        print("\n" + "-" * 65)
        selected_town = input(
            "\nEnter the Vermont town GEOID (or 'q' to quit): "
        ).strip()

        if selected_town.lower() == "q":
            print("\nExiting similarity model.")
            break

        if selected_town not in wide_df["geoid"].values:
            print(f"\nGEOID {selected_town} not found. Try again.")
            continue

        town_name = wide_df.loc[wide_df["geoid"] == selected_town, "name"].iloc[0]

        print("\n" + "=" * 65)
        print("TOWN SIMILARITY RESULTS")
        print("=" * 65)
        print(f"Selected Town: {town_name}")
        print(f"GEOID:         {selected_town}")
        print("=" * 65)

        try:
            results = get_similarity_breakdown(
                wide_df=wide_df,
                selected_town=selected_town,
                k=10,
            )

            results = results.rename(
                columns={
                    "name": "municipality",
                    "overall_similarity": "overall",
                    "housing_similarity": "housing",
                    "demographics_similarity": "demographics",
                    "social_similarity": "social",
                    "economic_similarity": "economic",
                }
            )

            score_columns = [
                "overall",
                "housing",
                "demographics",
                "social",
                "economic",
            ]

            results[score_columns] = results[score_columns].round(1)

            print("\nMost Similar Municipalities:")
            print(
                results.to_string(
                    index=False,
                    formatters={col: "{:.1f}".format for col in score_columns},
                )
            )

        except ValueError as e:
            print(f"\nUnable to calculate similarity: {e}")

    print("\n" + "=" * 65)


if __name__ == "__main__":
    main()
