import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_curve, roc_auc_score, auc, confusion_matrix

def split_oot(df: pd.DataFrame, time_col: str = "create_dt", test_ratio: float = 0.2):
    """Out-of-time split giữ thứ tự thời gian."""
    df = df.copy()
    df[time_col] = pd.to_datetime(df[time_col], errors="coerce")
    df_nonat = df[~df[time_col].isna()].sort_values([time_col, "transaction_seq"]).copy()
    split_idx = int(len(df_nonat) * (1 - test_ratio))
    cutoff = df_nonat.iloc[split_idx][time_col]
    train = df_nonat[df_nonat[time_col] < cutoff].copy()
    test  = df_nonat[df_nonat[time_col] >= cutoff].copy()
    return train, test, cutoff

def fraud_prob_from_model(model, X: pd.DataFrame) -> np.ndarray:
    """YDF RandomForest predict -> P(NO_FRAUD) ; trả P(FRAUD)."""
    p_no = model.predict(X).astype(float)
    return 1.0 - p_no

def compute_thresholds(y_true_bin: np.ndarray, scores: np.ndarray, fpr_cap: float = 0.01, recall_tgt: float = 0.80):
    """Trả về th_f1, th_fpr_cap (BLOCK), th_recall (REVIEW)."""
    prec, rec, th = precision_recall_curve(y_true_bin, scores)

    # F1-opt
    f1 = 2 * prec[:-1] * rec[:-1] / (prec[:-1] + rec[:-1] + 1e-12)
    th_f1 = float(th[int(np.nanargmax(f1))])

    # FPR <= cap: chọn ngưỡng nhỏ nhất thỏa điều kiện
    th_cap = None
    for t in sorted(np.unique(scores)):
        yp = (scores >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true_bin, yp).ravel()
        fpr = fp / (fp + tn + 1e-12)
        if fpr <= fpr_cap:
            th_cap = float(t)
            break

    # Recall ≥ target: trong các điểm đạt recall, lấy precision cao nhất
    idx = np.where(rec[:-1] >= recall_tgt)[0]
    if idx.size:
        j = idx[np.argmax(prec[:-1][idx])]
        th_rec = float(th[j])
    else:
        th_rec = th_f1  # fallback nếu không chạm được recall mục tiêu

    return {"th_f1": th_f1, "th_fpr_cap": th_cap, "th_recall": th_rec}
