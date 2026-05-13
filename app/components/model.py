"""
Re-trains the Phase 3 Ridge model on McDavid's NHL games and exposes a
helper to compute per-game standardized contributions. Cached at app
startup -- ~360 rows, fits in a fraction of a second.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import streamlit as st
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

NHL_CONTEXTS = ["regular_season", "first_round", "second_round",
                "conf_finals", "stanley_cup_finals"]

NUMERIC_FEATURES = [
    "game_number", "is_elimination_game", "is_back_to_back",
    "rest_days", "rolling_pts_5", "opp_ga_per_game",
]
CATEGORICAL_FEATURES = ["game_context"]


def _prepare(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.DataFrame]:
    """Filter to NHL games with full features, build X / y, return df slice too."""
    df = df[df["game_context"].isin(NHL_CONTEXTS)].copy()
    required = ["points", "opp_ga_per_game", "rest_days", "rolling_pts_5"]
    df = df.dropna(subset=required).reset_index(drop=True)
    df["game_number"] = df["game_number"].fillna(0).astype(int)
    df["is_elimination_game"] = df["is_elimination_game"].astype(int)
    df["is_back_to_back"] = df["is_back_to_back"].astype(int)

    X = pd.concat([
        df[NUMERIC_FEATURES].astype(float),
        pd.get_dummies(df[CATEGORICAL_FEATURES], drop_first=True).astype(float),
    ], axis=1)
    y = df["points"].astype(float)
    return X, y, df


@st.cache_resource(show_spinner=False)
def train_model(_mcdavid_csv_mtime: float) -> dict:
    """Train Ridge on full McDavid NHL slice. Returns model + metadata.

    The mtime arg is a cache-buster: when the CSV is updated, the cached
    model is rebuilt.
    """
    from .data_loader import load_mcdavid  # local import to avoid circular
    df = load_mcdavid()
    X, y, df_used = _prepare(df)

    pipe = Pipeline([
        ("scale", StandardScaler()),
        ("ridge", Ridge(alpha=1.0, random_state=42)),
    ])
    pipe.fit(X, y)

    coef_df = pd.DataFrame({
        "feature": X.columns,
        "coefficient": pipe.named_steps["ridge"].coef_,
    }).sort_values("coefficient", key=abs, ascending=False).reset_index(drop=True)

    return {
        "pipeline": pipe,
        "X": X,
        "y": y,
        "df": df_used,
        "coef_df": coef_df,
        "feature_names": list(X.columns),
        "n_train": len(X),
    }


def per_game_contributions(model_bundle: dict, row_idx: int) -> dict:
    """Decompose a single game's prediction into per-feature contributions.

    For Ridge with StandardScaler:
      pred = intercept + sum_i coef_i * (x_i - mean_i) / std_i
    Each term in the sum is the contribution of feature i.
    """
    pipe: Pipeline = model_bundle["pipeline"]
    X: pd.DataFrame = model_bundle["X"]
    df: pd.DataFrame = model_bundle["df"]

    scaler: StandardScaler = pipe.named_steps["scale"]
    ridge: Ridge = pipe.named_steps["ridge"]

    raw = X.iloc[row_idx].values.astype(float)
    standardized = (raw - scaler.mean_) / scaler.scale_
    contribs = pd.Series(standardized * ridge.coef_, index=X.columns)
    pred = float(ridge.intercept_ + contribs.sum())
    actual = float(df.iloc[row_idx]["points"])

    return {
        "contributions": contribs,
        "intercept": float(ridge.intercept_),
        "predicted": pred,
        "actual": actual,
        "row": df.iloc[row_idx],
    }
