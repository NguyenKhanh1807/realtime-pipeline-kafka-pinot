# -*- coding: utf-8 -*-
"""
Retrain tự động với rolling window 6 tháng (mặc định).
Các bước:
- Lấy dữ liệu từ DB trong khoảng [end_date - window_months, end_date)
- FE + encode (fit trên train), train YDF RandomForest
- Tính thresholds (th_high: FPR<=cap, th_low: đạt recall target), xuất artifacts
- (Tuỳ chọn) so sánh với model hiện hành bằng holdout của chính job và promote nếu tốt hơn
- Cập nhật symlink models/current, artifacts/current
"""

import logging
import os, json, argparse, shutil
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import ydf
from sqlalchemy import create_engine, text
from sklearn.metrics import precision_recall_curve, roc_auc_score, auc, confusion_matrix

# FE/runtime helpers
from app.preprocess import df_align, encode_categoricals
from utils.encoders import export_encoders
from utils.medians import export_medians_and_schema
from utils.thresholds import write_thresholds_yaml
from utils.logging_utils import configure_logging

LOGGER = logging.getLogger(__name__)

# ===================== SQL templates (tham số hoá) =====================

SQL_SKELETON = r"""
SELECT 
  t.seq AS transaction_seq,
  u.seq AS user_seq,
  t.create_dt,
  t.deposit_amount,
  t.receiving_country,
  p.country_code,
  p.id_type,
  p.stay_qualify,
  p.visa_expire_date,
  u.name AS user_name,
  COALESCE(
    (SELECT deposit_name FROM kibnet_account_issued k WHERE ukey = t.seq::text),
    (SELECT account_holder_name FROM op_withdraw o2 WHERE transaction_seq = t.seq),
    (SELECT account_holder FROM account_transfer_issued 
     WHERE remittance_type = 'OVERSEA_TRANSACTION' AND related_seq = t.seq)
  ) AS sender_name,
  t.recipient_name,
  pi.method AS payment_method,
  (SELECT DISTINCT ON (user_seq_no) account_number
     FROM op_log_user_register
    WHERE rsp_code='A0000' AND user_seq_no=o.user_seq_no
    ORDER BY user_seq_no, seq DESC) AS autodebit_account,
  (SELECT DISTINCT ON (user_seq) update_dt::date
     FROM id_approval
    WHERE user_seq=u.seq
    ORDER BY user_seq, seq) AS register_date,
  (SELECT t2.create_dt::date
     FROM transaction_info t2
    WHERE t2.user_seq=u.seq AND t2.category=3
    ORDER BY t2.seq LIMIT 1) AS first_transaction_date,
  u.birth_date,
  (SELECT approve_dt::date
     FROM idcard_recheck
    WHERE uid=p.uid AND status='APPROVED'
    ORDER BY uid, seq DESC LIMIT 1) AS recheck_date,
  u.invite_code,
  (SELECT DISTINCT ON (user_seq) update_dt::date
     FROM face_pin
    WHERE user_seq=u.seq AND active
    ORDER BY user_seq, seq DESC) AS face_pin_date,
  (SELECT COUNT(*) FROM transaction_info
    WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '24 hour') AS transaction_count_24hour,
  (SELECT COALESCE(SUM(deposit_amount),0) FROM transaction_info
    WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '24 hour') AS transaction_amount_24hour,
  (SELECT COUNT(*) FROM transaction_info
    WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '1 week') AS transaction_count_1week,
  (SELECT COALESCE(SUM(deposit_amount),0) FROM transaction_info
    WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '1 week') AS transaction_amount_1week,
  (SELECT COUNT(*) FROM transaction_info
    WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '1 month') AS transaction_count_1month,
  (SELECT COALESCE(SUM(deposit_amount),0) FROM transaction_info
    WHERE user_seq=u.seq AND seq<t.seq AND create_dt>t.create_dt - INTERVAL '1 month') AS transaction_amount_1month
FROM transaction_info t
JOIN user_info u ON u.seq=t.user_seq
JOIN personal_identification p ON p.uid=u.uid
LEFT JOIN payment_info pi ON pi.transaction_seq=t.seq
LEFT JOIN op_token o ON o.user_seq=u.seq
WHERE t.create_dt >= :start_dt AND t.create_dt < :end_dt
"""

# Non-fraud: sample ngẫu nhiên LIMIT n trong cửa sổ thời gian
SQL_NONFRAUD = f"""
WITH nf AS (
  SELECT t.seq
  FROM transaction_info t
  WHERE t.create_dt >= :start_dt AND t.create_dt < :end_dt
  ORDER BY random()
  LIMIT :limit_nf
)
{SQL_SKELETON}
AND t.seq IN (SELECT seq FROM nf)
"""

# Fraud: giả định có bảng nhãn `fraud_labels(transaction_seq, status, confirmed_at)`
# Nếu bạn chưa có bảng này, xem chú thích ở dưới để thay thế bằng danh sách seq hoặc view sẵn có.
# WITH f AS (
#   SELECT fl.transaction_seq AS seq
#   FROM fraud_labels fl
#   JOIN transaction_info t ON t.seq = fl.transaction_seq
#   WHERE fl.status IN ('CONFIRMED','CHARGEBACK')
#     AND t.create_dt >= :start_dt AND t.create_dt < :end_dt
# )
SQL_FRAUD = f"""
WITH f AS (
    SELECT seq
   	from (values (4424337),(4615204),(4962397),(5198002),(5198002),(5198002),(5198004),(5198004),(5198004),(5260032),(5295507),(5295507),(5296446),(5395309),(5395309),(5397116),(5397116),(5397347),(5397347),(5397698),(5397698),(5398958),(5411136),(5411136),(5424539),(5424539),(5426357),(5426357),(5426357),(5426357),(5426493),(5426493),(5430265),(5430265),(5450971),(5450971),(5451077),(5451077),(5451077),(5461832),(5466819),(5466819),(5489837),(5489839),(5495107),(5495129),(5495129),(5503492),(5598814),(5598989),(5598989),(5601383),(5601383),(5601384),(5601384),(5602707),(5602707),(5602708),(5602708),(5607826),(5607826),(5607828),(5607828),(5612434),(5613157),(5613157),(5613539),(5615961),(5626048),(5627566),(5627813),(5640672),(5640699),(5643246),(5643319),(5643379),(5643484),(5644317),(5645411),(5645561),(5647175),(5647307),(5647375),(5652130),(5652154),(5653867),(5653888),(5655210),(5655663),(5656976),(5656995),(5659162),(5659194),(5659222),(5659254),(5667610),(5667657),(5670045),(5670594),(5671391),(5674354),(5674356),(5674358),(5674362),(5674621),(5679302),(5679318),(5682015),(5682034),(5682213),(5682360),(5682362),(5682376),(5682522),(5684212),(5687857),(5687861),(5687864),(5700921),(5710185),(5710204),(5710204),(5710235),(5710235),(5710630),(5710723),(5712264),(5712318),(5712380),(5712463),(5712489),(5712644),(5712661),(5712710),(5716146),(5717891),(5718316),(5724502),(5724978),(5735464),(5747087),(5747144),(5747208),(5747282))
		as aa(seq)
)
{SQL_SKELETON}

AND t.seq IN (SELECT seq FROM f)
"""

# ===================== utils: split/metric/threshold =====================

def split_oot(df: pd.DataFrame, time_col="create_dt", test_ratio=0.2):
    df = df.copy()
    df[time_col] = pd.to_datetime(df[time_col], errors="coerce")
    df = df[~df[time_col].isna()].sort_values([time_col, "transaction_seq"])
    split_idx = int(len(df) * (1 - test_ratio))
    cutoff = df.iloc[split_idx][time_col]
    return df[df[time_col] < cutoff].copy(), df[df[time_col] >= cutoff].copy(), cutoff

def fraud_prob_from_model(model, X: pd.DataFrame) -> np.ndarray:
    p_no = model.predict(X).astype(float)   # YDF RF trả P(NO_FRAUD)
    return 1.0 - p_no                       # → P(FRAUD)

def compute_thresholds(y_true_bin: np.ndarray,
                       scores: np.ndarray,
                       fpr_cap: float = 0.01,
                       recall_tgt: float = 0.80):
    prec, rec, th = precision_recall_curve(y_true_bin, scores)
    f1 = 2 * prec[:-1] * rec[:-1] / (prec[:-1] + rec[:-1] + 1e-12)
    th_f1 = float(th[int(np.nanargmax(f1))])

    th_cap = None
    for t in sorted(np.unique(scores)):
        yp = (scores >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true_bin, yp).ravel()
        fpr = fp / (fp + tn + 1e-12)
        if fpr <= fpr_cap:
            th_cap = float(t)
            break

    idx = np.where(rec[:-1] >= recall_tgt)[0]
    if idx.size:
        j = idx[np.argmax(prec[:-1][idx])]
        th_rec = float(th[j])
    else:
        th_rec = th_f1
    return {"th_f1": th_f1, "th_fpr_cap": th_cap, "th_recall": th_rec}

# ===================== data fetch =====================

def get_training_data(engine,
                      start_dt: datetime,
                      end_dt: datetime,
                      limit_nonfraud: int = 30000,
                      use_fraud_table: bool = True,
                      fraud_seqs_csv: str = None) -> pd.DataFrame:
    """
    Trả về dataframe gộp non-fraud (sample) + fraud (đủ) trong [start_dt, end_dt).
    - Mặc định dùng bảng fraud_labels; nếu không có, truyền fraud_seqs_csv (1 cột 'seq').
    """
    with engine.begin() as conn:
        nf = pd.read_sql(
            text(SQL_NONFRAUD),
            conn,
            params={"start_dt": start_dt, "end_dt": end_dt, "limit_nf": limit_nonfraud},
        )
        if use_fraud_table:
            fr = pd.read_sql(
                text(SQL_FRAUD),
                conn,
                params={"start_dt": start_dt, "end_dt": end_dt},
            )
        else:
            if not fraud_seqs_csv or not os.path.exists(fraud_seqs_csv):
                raise FileNotFoundError("Missing fraud_seqs_csv while use_fraud_table=False")
            seqs = pd.read_csv(fraud_seqs_csv)["seq"].dropna().astype(int).unique().tolist()
            if not seqs:
                fr = pd.DataFrame(columns=nf.columns)
            else:
                # Xây một VALUES list an toàn cho Postgres
                vals = ",".join(f"({int(s)})" for s in seqs)
                sql = f"WITH f(seq) AS (VALUES {vals})\n{SQL_SKELETON}\nAND t.seq IN (SELECT seq FROM f)"
                fr = pd.read_sql(text(sql), conn, params={"start_dt": start_dt, "end_dt": end_dt})

    nf["is_fraud"] = False
    fr["is_fraud"] = True
    df = pd.concat([nf, fr], ignore_index=True)
    return df

# ===================== main pipeline =====================

def main():
    configure_logging()
    ap = argparse.ArgumentParser(description="Rolling retrain (6 months window) + export artifacts")
    ap.add_argument("--db-url", default=os.getenv("DB_URL", "postgresql+psycopg2://finshot_readonly:eP1ksm5aRQbXdf8GhNlp@175.193.239.90:35432/coinshot"))
    ap.add_argument("--window-months", type=int, default=6)
    ap.add_argument("--end-date", default=None, help="YYYY-MM-DD (default: today)")
    ap.add_argument("--limit-nonfraud", type=int, default=30000)
    ap.add_argument("--use-fraud-table", action="store_true", default=True)
    ap.add_argument("--fraud-seqs-csv", default=None, help="Fallback nếu không dùng bảng nhãn")
    ap.add_argument("--model-root", default="models")
    ap.add_argument("--artifacts-root", default="artifacts")
    ap.add_argument("--model-name", default="ydf_rf_fraud")   # sẽ kèm timestamp ở cuối
    ap.add_argument("--test-ratio", type=float, default=0.2)
    ap.add_argument("--fpr-cap", type=float, default=0.01)
    ap.add_argument("--recall-tgt", type=float, default=0.80)
    ap.add_argument("--auto-promote", action="store_true", help="Nếu tốt hơn holdout hiện hành thì promote")
    args = ap.parse_args()

    # ---- 1) Tính mốc thời gian cửa sổ
    tz = timezone.utc
    end_dt = (datetime.strptime(args.end_date, "%Y-%m-%d").replace(tzinfo=tz)
              if args.end_date else datetime.now(tz))
    # start_dt ~ 6 tháng trước (xấp xỉ 182 ngày); dùng relativedelta nếu thích
    start_dt = end_dt - timedelta(days=30*args.window_months)

    # ---- 2) Lấy dữ liệu
    eng = create_engine(args.db_url)
    df = get_training_data(
        eng,
        start_dt=start_dt,
        end_dt=end_dt,
        limit_nonfraud=args.limit_nonfraud,
        use_fraud_table=args.use_fraud_table,
        fraud_seqs_csv=args.fraud_seqs_csv,
    )
    if df.empty:
        raise SystemExit("No data returned for the window")

    # ---- 3) OOT split trong cửa sổ (giữ thứ tự thời gian)
    train_raw, test_raw, cutoff = split_oot(df, time_col="create_dt", test_ratio=args.test_ratio)

    # ---- 4) FE/Align + Encode
    drop_cols = ["is_fraud", "transaction_seq"]
    Xtr = df_align(train_raw.drop(columns=[c for c in drop_cols if c in train_raw.columns], errors="ignore"))
    Xte = df_align(test_raw .drop(columns=[c for c in drop_cols if c in test_raw.columns],  errors="ignore"))

    cats = [c for c in ["receiving_country","country_code","id_type","stay_qualify","payment_method"] if c in Xtr.columns]
    Xtr_enc, encoders = encode_categoricals(Xtr, cats, encoders=None)
    Xte_enc, _        = encode_categoricals(Xte, cats, encoders=encoders)

    ytr = train_raw["is_fraud"].map({False: "NO_FRAUD", True: "FRAUD"})
    yte = test_raw ["is_fraud"].map({False: "NO_FRAUD", True: "FRAUD"})
    train_ds = Xtr_enc.copy(); train_ds["is_fraud"] = ytr.values
    test_ds  = Xte_enc.copy(); test_ds ["is_fraud"] = yte.values

    # ---- 5) Train RF (có class_weight)
    pos = int((train_raw["is_fraud"]==True).sum())
    neg = int((train_raw["is_fraud"]==False).sum())
    w_pos = neg / max(1, pos)

    learner = ydf.RandomForestLearner(
        label="is_fraud",
        class_weights={"NO_FRAUD": 1.0, "FRAUD": float(w_pos)},
        num_trees=500,
        max_depth=16,
    )
    model = learner.train(train_ds)

    # ---- 6) Đánh giá + thresholds
    y_true = (test_ds["is_fraud"].to_numpy()=="FRAUD").astype(int)
    scores = fraud_prob_from_model(model, test_ds.drop(columns=["is_fraud"]))
    prec, rec, _ = precision_recall_curve(y_true, scores)
    pr_auc = float(auc(rec, prec))
    roc    = float(roc_auc_score(y_true, scores))
    ths    = compute_thresholds(y_true, scores, fpr_cap=args.fpr_cap, recall_tgt=args.recall_tgt)
    th_low  = float(ths["th_recall"])
    th_high = float(ths["th_fpr_cap"]) if ths["th_fpr_cap"] is not None else float(ths["th_f1"])

    # ---- 7) Xuất artifacts vào thư mục version hoá
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    model_dir     = os.path.join(args.model_root, f"{args.model_name}_{stamp}")
    artifacts_dir = os.path.join(args.artifacts_root, f"{args.model_name}_{stamp}")
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(artifacts_dir, exist_ok=True)

    model.save(model_dir)
    export_encoders(encoders, out_dir=artifacts_dir)
    feat_cols, med = export_medians_and_schema(train_ds, out_dir=artifacts_dir, label_col="is_fraud")
    write_thresholds_yaml(th_low, th_high,
                          model_version=os.path.basename(model_dir),
                          out_dir=artifacts_dir, fpr_cap=args.fpr_cap)

    manifest = {
        "model_version": os.path.basename(model_dir),
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "window": {"start": start_dt.isoformat(), "end": end_dt.isoformat()},
        "cutoff_time": str(cutoff),
        "train_size": int(len(train_raw)), "test_size": int(len(test_raw)),
        "class_weight_pos": float(w_pos),
        "metrics": {"pr_auc": pr_auc, "roc_auc": roc},
        "thresholds": {"low": th_low, "high": th_high, "fpr_cap": float(args.fpr_cap)},
        "feature_count": len(feat_cols),
    }
    with open(os.path.join(artifacts_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # ---- 8) (Tuỳ chọn) auto-promote nếu tốt hơn model hiện hành
    if args.auto_promote:
        cur_art = os.path.join(args.artifacts_root, "current", "manifest.json")
        promote = True
        if os.path.exists(cur_art):
            try:
                with open(cur_art, "r", encoding="utf-8") as f: cur = json.load(f)
                if "metrics" in cur and cur["metrics"].get("pr_auc") is not None:
                    promote = pr_auc >= float(cur["metrics"]["pr_auc"])  # đơn giản: PR-AUC không giảm
            except Exception:
                promote = True
        if promote:
            # refresh symlinks current → phiên bản mới
            for root, target in [(args.model_root, model_dir), (args.artifacts_root, artifacts_dir)]:
                link = os.path.join(root, "current")
                if os.path.islink(link) or os.path.exists(link):
                    try:
                        if os.path.islink(link): os.unlink(link)
                        else: shutil.rmtree(link)
                    except Exception:
                        pass
                os.symlink(os.path.abspath(target), link)
            LOGGER.info("current → %s (PR-AUC=%.3f)", os.path.basename(model_dir), pr_auc)
        else:
            LOGGER.info("Current better: new PR-AUC=%.3f < old", pr_auc)

    LOGGER.info(
        "Done. Model: %s | Artifacts: %s | PR-AUC=%.3f ROC-AUC=%.3f | th_low=%.3f th_high=%.3f",
        model_dir,
        artifacts_dir,
        pr_auc,
        roc,
        th_low,
        th_high,
    )


if __name__ == "__main__":
    main()
