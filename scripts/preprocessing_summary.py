#!/usr/bin/env python3
"""
Sinh JSON summary nhỏ gọn từ hàm preProcessing để phục vụ UI EDA/tiền xử lý.
Chỉ in JSON ra stdout để Next.js API có thể parse, hạn chế log rác.
"""
import argparse
import contextlib
import io
import json
import logging
import math
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

import numpy as np
import pandas as pd

# Đưa repo root vào sys.path để import module scripts.*
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from scripts.data_preprocessing import preProcessing  # type: ignore

logging.basicConfig(level=logging.WARNING)
LOGGER = logging.getLogger(__name__)


def _safe_float(value):
    try:
        return float(value)
    except Exception:
        return None


def _top_counts(series: pd.Series, top_n: int = 7) -> List[Dict[str, Any]]:
    if series is None or series.empty:
        return []
    counts = series.fillna("Unknown").astype(str).replace("", "Unknown").value_counts().head(top_n)
    total = len(series)
    return [
        {"name": str(idx), "count": int(val), "ratio": float(val / total) if total else 0.0}
        for idx, val in counts.items()
    ]


def _missing_rates(df: pd.DataFrame, top_n: int = 8) -> List[Dict[str, Any]]:
    if df is None or df.empty:
        return []
    rates = df.isna().mean().sort_values(ascending=False).head(top_n)
    return [{"column": col, "rate": float(rate)} for col, rate in rates.items()]


def _box_by_label(df: pd.DataFrame, value_col: str, label_col: str) -> List[Dict[str, Any]]:
    """Tính thống kê boxplot (min, q1, median, q3, max, mean) theo nhãn."""
    if value_col not in df.columns or label_col not in df.columns:
        return []
    out = []
    for label, grp in df.groupby(label_col):
        series = pd.to_numeric(grp[value_col], errors="coerce").dropna()
        if series.empty:
            continue
        out.append({
            "label": str(label),
            "min": _safe_float(series.min()),
            "q1": _safe_float(series.quantile(0.25)),
            "median": _safe_float(series.quantile(0.5)),
            "q3": _safe_float(series.quantile(0.75)),
            "max": _safe_float(series.max()),
            "mean": _safe_float(series.mean())
        })
    return out


def _corr_pairs(df: pd.DataFrame, top_n: int = 12) -> List[Dict[str, Any]]:
    """Lấy top cặp tương quan cao nhất (theo |corr|) để vẽ heatmap nhỏ."""
    if df is None or df.empty:
        return []
    num_cols = df.select_dtypes(include=["number"]).columns
    if len(num_cols) < 2:
        return []
    corr = df[num_cols].corr().fillna(0)
    pairs = []
    cols = list(num_cols)
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            pairs.append({
                "f1": cols[i],
                "f2": cols[j],
                "corr": float(corr.iloc[i, j])
            })
    pairs.sort(key=lambda x: abs(x["corr"]), reverse=True)
    return pairs[:top_n]


def _daily_trend(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Đếm giao dịch theo ngày (create_dt)."""
    if "create_dt" not in df.columns or df.empty:
        return []
    dates = pd.to_datetime(df["create_dt"], errors="coerce").dt.date.dropna()
    counts = dates.value_counts().sort_index()
    return [{"date": str(idx), "count": int(val)} for idx, val in counts.items()]


def _calendar_distributions(df: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
    """Phân phối theo tháng, ngày trong tuần, ngày trong tháng."""
    if "create_dt" not in df.columns or df.empty:
        return {"month": [], "dayOfWeek": [], "dayOfMonth": []}
    dt_series = pd.to_datetime(df["create_dt"], errors="coerce")
    month = dt_series.dt.month.dropna().astype(int)
    dow = dt_series.dt.dayofweek.dropna().astype(int)  # 0=Mon
    dom = dt_series.dt.day.dropna().astype(int)
    return {
        "month": [{"bucket": int(idx), "count": int(val)} for idx, val in month.value_counts().sort_index().items()],
        "dayOfWeek": [{"bucket": int(idx), "count": int(val)} for idx, val in dow.value_counts().sort_index().items()],
        "dayOfMonth": [{"bucket": int(idx), "count": int(val)} for idx, val in dom.value_counts().sort_index().items()],
    }


def _calendar_by_label(df: pd.DataFrame, label_col: str) -> Dict[str, List[Dict[str, Any]]]:
    """Phân phối lịch theo nhãn (tháng, thứ, ngày trong tháng, giờ)."""
    if label_col not in df.columns or df.empty or "create_dt" not in df.columns:
        return {"month": [], "dayOfWeek": [], "dayOfMonth": [], "hour": []}
    dt_series = pd.to_datetime(df["create_dt"], errors="coerce")
    month = dt_series.dt.month
    dow = dt_series.dt.dayofweek  # 0=Mon
    dom = dt_series.dt.day
    hour = dt_series.dt.hour
    def agg(series):
        res = []
        for (bucket, lbl), val in pd.DataFrame({"bucket": series, "label": df[label_col]}).dropna().value_counts().items():
            res.append({"bucket": int(bucket), "label": str(lbl), "count": int(val)})
        return res
    return {
        "month": agg(month),
        "dayOfWeek": agg(dow),
        "dayOfMonth": agg(dom),
        "hour": agg(hour),
    }


def _flag_counts(df: pd.DataFrame, flags: List[str]) -> List[Dict[str, Any]]:
    """Đếm số lượng các cờ rủi ro."""
    result = []
    total = len(df)
    for flag in flags:
        if flag in df.columns:
            vals = pd.to_numeric(df[flag], errors="coerce").fillna(0)
            cnt = int((vals != 0).sum())
            result.append({"flag": flag, "count": cnt, "ratio": float(cnt / total) if total else 0.0})
    return result


def _span_stats(df: pd.DataFrame, cols: List[str]) -> List[Dict[str, Any]]:
    """Thống kê nhanh các khoảng thời gian (ngày)."""
    stats = []
    for col in cols:
        if col not in df.columns:
            continue
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        if series.empty:
            continue
        stats.append({
            "name": col,
            "mean": _safe_float(series.mean()),
            "p50": _safe_float(series.median()),
            "p90": _safe_float(series.quantile(0.9)),
            "max": _safe_float(series.max())
        })
    return stats


def _box_multi_by_label(df: pd.DataFrame, cols: List[str], label_col: str) -> List[Dict[str, Any]]:
    """Box-like thống kê cho nhiều cột theo nhãn."""
    if label_col not in df.columns:
        return []
    rows = []
    for col in cols:
        if col not in df.columns:
            continue
        series = pd.to_numeric(df[col], errors="coerce")
        for label, grp in df[[label_col]].join(series).groupby(label_col):
            vals = pd.to_numeric(grp[col], errors="coerce").dropna()
            if vals.empty:
                continue
            rows.append({
                "feature": col,
                "label": str(label),
                "min": _safe_float(vals.min()),
                "q1": _safe_float(vals.quantile(0.25)),
                "median": _safe_float(vals.quantile(0.5)),
                "q3": _safe_float(vals.quantile(0.75)),
                "max": _safe_float(vals.max()),
                "mean": _safe_float(vals.mean())
            })
    return rows


def _value_counts(series: pd.Series, top_n: int = 10) -> List[Dict[str, Any]]:
    """Đếm tần suất cho một series (có thể là số hoặc category)."""
    if series is None or series.empty:
        return []
    counts = series.fillna("Unknown").value_counts().head(top_n)
    total = len(series)
    return [
        {"value": str(idx), "count": int(val), "ratio": float(val / total) if total else 0.0}
        for idx, val in counts.items()
    ]


def _hist_by_label(df: pd.DataFrame, col: str, label_col: str, bins: int = 6) -> List[Dict[str, Any]]:
    """Histogram theo nhãn cho 1 cột số."""
    if label_col not in df.columns or col not in df.columns:
        return []
    data = pd.to_numeric(df[col], errors="coerce")
    if data.dropna().empty:
        return []
    labels = df[label_col]
    hist_data = []
    # dùng cùng bin cho tất cả label để so sánh
    counts, bin_edges = np.histogram(data.dropna(), bins=bins)
    for lbl in labels.unique():
        vals = pd.to_numeric(df.loc[labels == lbl, col], errors="coerce").dropna()
        if vals.empty:
            continue
        cts, _ = np.histogram(vals, bins=bin_edges)
        for idx, cnt in enumerate(cts):
            hist_data.append({
                "bin": f"{bin_edges[idx]:.0f}-{bin_edges[idx+1]:.0f}",
                "label": str(lbl),
                "count": int(cnt)
            })
    return hist_data


def _group_by_label(series: pd.Series, labels: pd.Series, top_n: int = 15) -> List[Dict[str, Any]]:
    """Đếm tần suất theo giá trị và nhãn."""
    if series is None or labels is None or series.empty or labels.empty:
        return []
    df_tmp = pd.DataFrame({"bucket": series.fillna("Unknown"), "label": labels})
    counts = df_tmp.value_counts().reset_index(name="count")
    # Giới hạn top_n theo tổng count lớn nhất
    counts["total"] = counts.groupby("bucket")["count"].transform("sum")
    counts = counts.sort_values("total", ascending=False).head(top_n)
    return [
        {"bucket": str(row.bucket), "label": str(row.label), "count": int(row["count"])}
        for _, row in counts.iterrows()
    ]


def _dual_hist(before: pd.Series, after: pd.Series, bins: int = 8) -> List[Dict[str, Any]]:
    base = pd.to_numeric(before, errors="coerce").dropna()
    if base.empty:
        return []
    counts_before, edges = np.histogram(base, bins=bins)
    counts_after, _ = np.histogram(pd.to_numeric(after, errors="coerce").dropna(), bins=edges)
    hist = []
    for idx, count in enumerate(counts_before):
        bucket = f"{edges[idx]:.0f} - {edges[idx + 1]:.0f}"
        hist.append({
            "bucket": bucket,
            "before": int(count),
            "after": int(counts_after[idx]) if len(counts_after) > idx else 0
        })
    return hist


def _hourly_distribution(df: pd.DataFrame) -> List[Dict[str, Any]]:
    if df is None or df.empty or "create_dt" not in df.columns:
        return []
    dt_series = pd.to_datetime(df["create_dt"], errors="coerce")
    hours = dt_series.dt.hour.dropna().astype(int)
    counts = hours.value_counts().sort_index()
    return [{"hour": int(h), "count": int(c)} for h, c in counts.items()]


def build_summary(data_path: str = None) -> Dict[str, Any]:
    # Chạy pipeline; dùng redirect_stdout để tránh log rác trộn vào JSON
    silent_buffer = io.StringIO()
    with contextlib.redirect_stdout(silent_buffer):
        data = preProcessing(data_path=data_path)
    df_raw = data.get("raw", pd.DataFrame())
    df_with_label = data.get("raw_with_label", df_raw.copy())
    clipping_before = data.get("clipping", {}).get("before", pd.DataFrame())
    clipping_after = data.get("clipping", {}).get("after", pd.DataFrame())
    aligned_before = data.get("aligned", {}).get("before", pd.DataFrame())
    aligned_after = data.get("aligned", {}).get("after", pd.DataFrame())
    scaled_before = data.get("scaled", {}).get("before", pd.DataFrame())
    scaled_after = data.get("scaled", {}).get("after", pd.DataFrame())
    encoded_before = data.get("encoded", {}).get("before", pd.DataFrame())
    encoded_after = data.get("encoded", {}).get("after", pd.DataFrame())
    encoder_meta = data.get("encoders", {}).get("cols", [])
    label_col = next((c for c in ("label", "lable") if c in df_with_label.columns), None)

    deposit_col = "deposit_amount"
    label_series = df_with_label[label_col] if label_col else pd.Series(dtype=float)

    # Tính stats clipping cho cột deposit_amount
    clip_before_series = clipping_before.get(deposit_col, df_raw.get(deposit_col, pd.Series()))
    clip_after_series = clipping_after.get(deposit_col, clip_before_series)
    clipping_stats = {
        "before": {
            "min": _safe_float(pd.to_numeric(clip_before_series, errors="coerce").min()),
            "max": _safe_float(pd.to_numeric(clip_before_series, errors="coerce").max()),
            "median": _safe_float(pd.to_numeric(clip_before_series, errors="coerce").median()),
            "mean": _safe_float(pd.to_numeric(clip_before_series, errors="coerce").mean()),
        },
        "after": {
            "min": _safe_float(pd.to_numeric(clip_after_series, errors="coerce").min()),
            "max": _safe_float(pd.to_numeric(clip_after_series, errors="coerce").max()),
            "median": _safe_float(pd.to_numeric(clip_after_series, errors="coerce").median()),
            "mean": _safe_float(pd.to_numeric(clip_after_series, errors="coerce").mean()),
        }
    }

    hist = _dual_hist(clip_before_series, clip_after_series)

    # Cột mới sau bước align
    new_cols = sorted(list(set(aligned_after.columns) - set(aligned_before.columns)))

    # Chuẩn hóa tên cột scale
    scale_cols = [c for c in scaled_after.columns if c in scaled_before.columns][:8]
    scaling_preview = []
    for col in scale_cols:
        before_col = pd.to_numeric(scaled_before[col], errors="coerce")
        after_col = pd.to_numeric(scaled_after[col], errors="coerce")
        scaling_preview.append({
            "column": col,
            "meanBefore": _safe_float(before_col.mean()),
            "stdBefore": _safe_float(before_col.std()),
            "meanAfter": _safe_float(after_col.mean()),
            "stdAfter": _safe_float(after_col.std()),
        })

    pipeline_shape = [
        {"step": "Raw data", "rows": int(df_raw.shape[0]), "cols": int(df_raw.shape[1])},
        {"step": "Align/Feature", "rows": int(aligned_after.shape[0]), "cols": int(aligned_after.shape[1])},
        {"step": "Scaled", "rows": int(scaled_after.shape[0]), "cols": int(scaled_after.shape[1])},
    ]

    # Calendar distributions
    calendar = _calendar_distributions(df_with_label)
    calendar_by_label = _calendar_by_label(df_with_label, label_col) if label_col else {"month": [], "dayOfWeek": [], "dayOfMonth": [], "hour": []}
    country_by_label = _group_by_label(df_with_label.get("receiving_country"), label_series) if label_col else []

    # Trap flags
    trap_flags = _flag_counts(aligned_after, ["is_new_high_risk", "is_fast_actor", "is_near_limit", "is_visa_expired", "is_zombie_waking_up"])

    # Time spans
    span_stats = _span_stats(aligned_after, ["account_age", "user_seniority", "time_to_activate"])
    time_box_by_label = _box_multi_by_label(aligned_after.join(label_series), ["account_age", "user_seniority", "time_to_activate", "amount_type"], label_col) if label_col else []
    time_hists_by_label = {}
    if label_col:
        for col in ["account_age", "user_seniority", "time_to_activate"]:
            time_hists_by_label[col] = _hist_by_label(aligned_after.join(label_series), col, label_col, bins=6)

    engineered_dist = []
    engineered_targets = [
        "amount_type",
        "create_dt_hour",
        "create_dt_is_night",
        "country_mismatch",
        "name_mismatch",
        "is_new_high_risk",
        "is_fast_actor",
        "is_near_limit",
        "is_visa_expired",
        "is_zombie_waking_up",
    ]
    for col in engineered_targets:
        if col in aligned_after.columns:
            engineered_dist.append({
                "name": col,
                "buckets": _value_counts(aligned_after[col])
            })

    # Stage column summary
    def _stage_info(df_stage: pd.DataFrame, name: str):
        nums = len(df_stage.select_dtypes(include=["number"]).columns)
        cats = len(df_stage.select_dtypes(exclude=["number"]).columns)
        return {"stage": name, "cols": int(df_stage.shape[1]), "numericCols": nums, "categoricalCols": cats}

    stage_info = [
        _stage_info(df_raw, "raw"),
        _stage_info(aligned_after, "aligned"),
        _stage_info(encoded_after, "encoded"),
        _stage_info(scaled_after, "scaled"),
    ]

    # Encoded categorical columns list
    encoded_cats = list(encoder_meta) if encoder_meta else []

    summary = {
        "runAt": datetime.utcnow().isoformat() + "Z",
        "dataset": {
            "rows": int(df_raw.shape[0]),
            "cols": int(df_raw.shape[1]),
            "sampleColumns": df_raw.columns[:6].tolist()
        },
        "eda": {
            "labelDistribution": _top_counts(label_series, top_n=3),
            "paymentMethods": _top_counts(df_raw.get("payment_method", pd.Series(dtype=object))),
            "countryDistribution": _top_counts(df_raw.get("receiving_country", pd.Series(dtype=object))),
            "hourlyDistribution": _hourly_distribution(df_raw),
            "amountHistogram": hist,
            "missingRates": _missing_rates(df_raw),
            "boxByLabel": _box_by_label(df_with_label, deposit_col, label_col) if label_col else [],
            "corrPairs": _corr_pairs(aligned_after),
            "dailyTrend": _daily_trend(df_raw),
            "calendar": calendar,
            "calendarByLabel": calendar_by_label,
            "countryByLabel": country_by_label,
            "trapFlags": trap_flags,
            "timeSpans": span_stats,
            "timeBoxByLabel": time_box_by_label,
            "timeHistsByLabel": time_hists_by_label,
        },
        "preprocessing": {
            "clippingStats": clipping_stats,
            "histogram": hist,
            "engineered": {
                "newColumns": new_cols[:15],
                "totalNew": len(new_cols),
                "totalColumnsAfter": int(aligned_after.shape[1])
            },
            "engineeredDistributions": engineered_dist,
            "scalingPreview": scaling_preview,
            "pipelineShape": pipeline_shape,
            "stageInfo": stage_info,
            "encodedCategoricals": encoded_cats,
        }
    }
    return summary


def main():
    def _replace_nan(obj):
        """Thay thế NaN/inf thành None để JSON hợp lệ."""
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return None
        if isinstance(obj, dict):
            return {k: _replace_nan(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_replace_nan(v) for v in obj]
        return obj

    parser = argparse.ArgumentParser(description="Export preprocessing summary as JSON")
    parser.add_argument("--data-path", dest="data_path", default=None, help="Optional CSV path to feed into preProcessing")
    args = parser.parse_args()

    try:
        summary = build_summary(args.data_path)
        safe_summary = _replace_nan(summary)
        print(json.dumps(safe_summary, allow_nan=False))
    except Exception as exc:
        LOGGER.exception("Failed to build preprocessing summary")
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
