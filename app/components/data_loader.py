"""
Cached CSV loaders. All Streamlit pages read through this module so the
clean CSVs are loaded at most once per process and re-loaded automatically
when the underlying file changes (TTL = 60s).
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
import streamlit as st

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"

NHL_CONTEXT_ORDER = [
    "regular_season", "first_round", "second_round",
    "conf_finals", "stanley_cup_finals",
]


@st.cache_data(ttl=60)
def load_mcdavid() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "mcdavid_game_log_clean.csv")
    df["date"] = pd.to_datetime(df["date"])
    df["result"] = df["result"].astype(str).str.strip()
    return df


@st.cache_data(ttl=60)
def load_mackinnon() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "mackinnon_game_log_clean.csv")
    df["date"] = pd.to_datetime(df["date"])
    df["result"] = df["result"].astype(str).str.strip()
    return df


@st.cache_data(ttl=60)
def load_team_stats() -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / "opponent_team_stats.csv")


def csv_mtime(name: str) -> pd.Timestamp:
    """Last-modified timestamp for one of the CSVs (used by status page)."""
    return pd.Timestamp((DATA_DIR / name).stat().st_mtime, unit="s", tz="UTC").tz_convert("US/Pacific")


def context_label(ctx: str) -> str:
    """Pretty-print game_context values for charts."""
    return ctx.replace("_", " ").title()
