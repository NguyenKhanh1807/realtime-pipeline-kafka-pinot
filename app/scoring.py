import numpy as np, pandas as pd
from typing import Optional, Sequence, Tuple

# Hàm tính điểm gian lận từ model YDF đã train
def fraud_scores_from_model(model, X: pd.DataFrame) -> np.ndarray:
    """
    YDF RF predict trả P(NO_FRAUD) -> đổi sang P(FRAUD)
    """
    p_no = model.predict(X).astype(float)
    return 1.0 - p_no

# Hàm quyết định hành động dựa trên điểm và ngưỡng
def decide(scores: np.ndarray, th_low: float, th_high: float) -> np.ndarray:
    out = np.full(scores.shape, "ALLOW", dtype=object)
    out[(scores >= th_low) & (scores < th_high)] = "REVIEW"
    out[scores >= th_high] = "BLOCK"
    return out
# Hàm tính điểm và quyết định hành động
def score_and_decide(model, X: pd.DataFrame, th_low: float, th_high: float):
    s = fraud_scores_from_model(model, X)
    d = decide(s, th_low, th_high)
    return s, d
# Hàm tính điểm, quyết định hành động và giải thích
def score_decide_with_explanations(
    model,
    X: pd.DataFrame,
    th_low: float,
    th_high: float,
    feat_cols: Sequence[str], 
    medians: dict, 
    *, 
    key_values: Optional[Sequence[int]] = None, 
    key_col: str = "transaction_seq", 
    top_k: int = 6, 
    include_allow: bool = False, 
) -> Tuple[np.ndarray, np.ndarray, pd.DataFrame]:
    scores, decisions = score_and_decide(model, X, th_low, th_high) 

    if key_values is not None: 
        key_series = pd.Series(list(key_values), index=X.index, name=key_col)
    else: 
        key_series = pd.Series(np.arange(len(X), dtype=int), index=X.index, name=key_col)

    result = pd.DataFrame({
        key_col: key_series.to_numpy(),
        "score": scores.astype(float),
        "decision": decisions
    })
    result["reasons_json"] = None

    explain_idx = (
        np.arange(len(decisions))
        if include_allow
        else np.where(decisions != "ALLOW")[0]
    )

    if explain_idx.size:
        explain_df = X.iloc[explain_idx].copy()
        explain_df[key_col] = key_series.iloc[explain_idx].to_numpy()
        explain_df["is_fraud"] = "NO_FRAUD"  

        from app.explain import batch_explanations 

        explanations = batch_explanations(
            model,
            explain_df,
            key_col=key_col,
            top_k=top_k,
            feat_cols=list(feat_cols),
            medians=dict(medians),
        )
        reasons_map = dict(zip(explanations["id"], explanations["reasons_json"]))

        target_idx = explain_idx if include_allow else np.where(decisions != "ALLOW")[0]
        if target_idx.size:
            mapped = result.loc[target_idx, key_col].map(reasons_map)
            result.loc[target_idx, "reasons_json"] = mapped.where(pd.notna(mapped), None)

    return scores, decisions, result

