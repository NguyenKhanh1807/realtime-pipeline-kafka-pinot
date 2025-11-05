import json, numpy as np, pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.metrics import precision_recall_curve, roc_auc_score, auc, confusion_matrix
from app.scoring import fraud_scores_from_model
from app.preprocess import sanitize_for_model

# Hàm tính baseline và thống kê số học cho các đặc trưng số
def compute_baselines(train_like_cols: List[str], medians: Dict[str,float]) -> Dict[str, Any]:
    return {c: ("num", float(medians.get(c, 0.0))) for c in train_like_cols}

# Hàm tính thống kê số học (trung bình, độ lệch chuẩn) cho các đặc trưng số
def fit_numeric_stats(feat_cols: List[str], medians: Dict[str,float], X_sample: pd.DataFrame=None):
    stats = {} 
    if X_sample is None or X_sample.empty: 
        for c in feat_cols: stats[c] = (float(medians.get(c, 0.0)), 1.0)
        return stats
    for c in feat_cols: 
        s = pd.to_numeric(X_sample.get(c, pd.Series(dtype=float)), errors="coerce") 
        s = s.dropna()
        if s.empty:
            stats[c] = (float(medians.get(c, 0.0)), 1.0)
            continue
        stats[c] = (float(np.mean(s)), float(np.std(s) + 1e-9)) 
    return stats

# Hàm giải thích một giao dịch
def explain_one_transaction(model, row: pd.Series, baselines, num_stats, top_k: int, feat_cols: List[str], medians: Dict[str,float]): 
    row = row.drop(labels=[c for c in ["is_fraud"] if c in row.index])
    row_df = sanitize_for_model(row.to_frame().T, feat_cols, medians)

    base_score = float(fraud_scores_from_model(model, row_df)[0])
    reasons = []
    for c in row_df.columns:
        kind, base_val = baselines.get(c, ("num", medians.get(c, 0.0))) 
        try:
            base_val = float(base_val) 
        except:
            base_val = float(medians.get(c, 0.0)) 
        row_alt = row_df.copy()
        row_alt[c] = base_val
        new_score = float(fraud_scores_from_model(model, row_alt)[0])
        delta = base_score - new_score
        mu, sd = num_stats.get(c, (0.0, 1.0))
        z = float(((float(row_df[c].iloc[0]) - mu) / (sd if sd > 0 else 1.0)))
        reasons.append({"feature": c, "delta_score": delta, "direction": "↑FRAUD" if delta>0 else "↓FRAUD", "zscore": z})
    top = [r for r in sorted(reasons, key=lambda r: r["delta_score"], reverse=True) if r["delta_score"]>0][:top_k]
    return {"base_score": base_score, "top_reasons": top}

# Hàm giải thích hàng loạt giao dịch
def batch_explanations(model, test_ds: pd.DataFrame, key_col: str, top_k: int, feat_cols: List[str], medians: Dict[str,float]) -> pd.DataFrame:
    baselines = compute_baselines(feat_cols, medians)
    num_stats = fit_numeric_stats(feat_cols, medians, X_sample=test_ds.drop(columns=[c for c in ["is_fraud"] if c in test_ds.columns], errors="ignore"))

    X = sanitize_for_model(test_ds.drop(columns=["is_fraud"], errors="ignore"), feat_cols, medians)
    scores = fraud_scores_from_model(model, X)

    rows = []
    for i in range(len(test_ds)):
        row = test_ds.iloc[i]
        rid = int(test_ds.iloc[i][key_col]) if (key_col and key_col in test_ds.columns) else int(test_ds.index[i])
        expl = explain_one_transaction(model, row, baselines, num_stats, top_k, feat_cols, medians)
        rows.append({"id": rid, "score": float(expl["base_score"]), "reasons": expl["top_reasons"]})
    out = pd.DataFrame(rows)
    out["reasons_json"] = out["reasons"].apply(lambda r: json.dumps(r, ensure_ascii=False))
    return out[["id","score","reasons_json"]].sort_values("score", ascending=False)

