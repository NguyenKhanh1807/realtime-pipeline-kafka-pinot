import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional


def eprint(*args, **kwargs) -> None:
    print(*args, file=sys.stderr, **kwargs)


@dataclass
class PinotFetchConfig:
    host: str
    port: int
    scheme: str
    path: str
    table: str
    mode: str = "dbapi"
    timeout: int = 60
    verify: bool = False


_CONFIG: Optional[PinotFetchConfig] = None

def configure(config: PinotFetchConfig) -> None:
    global _CONFIG
    _CONFIG = config

# Hàm để lấy cấu hình, ném lỗi nếu chưa được cấu hình
def _require_config() -> PinotFetchConfig:
    if _CONFIG is None:
        raise RuntimeError("Pinot fetch configuration is missing. Call configure(...) before fetch().")
    return _CONFIG

# Định dạng datetime thành chuỗi phù hợp cho truy vấn SQL
def _format_ts(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

# Xây dựng câu truy vấn SQL dựa trên tham số đầu vào
def _build_sql(table: str, start_dt: datetime, end_dt: datetime, limit_nf: Optional[int]) -> str:
    start_literal = _format_ts(start_dt)
    end_literal = _format_ts(end_dt)
    query = (
        f"SELECT * FROM {table} "
        f"WHERE create_dt >= '{start_literal}' AND create_dt < '{end_literal}' "
        f"ORDER BY create_dt DESC"
    )
    if limit_nf is not None:
        query += f" LIMIT {limit_nf}"
    query += " OPTION(useMultistageEngine=true)"
    return query

# Thực thi truy vấn sử dụng pinotdb (DBAPI)
def _run_dbapi(cfg: PinotFetchConfig, sql: str):
    try:
        from pinotdb import connect
    except Exception as exc:
        raise RuntimeError("pinotdb chưa được cài đặt. Cài bằng: pip install pinotdb") from exc
    conn = connect(host=cfg.host, port=cfg.port, path=cfg.path, scheme=cfg.scheme)
    cur = conn.cursor()
    cur.execute(sql)
    cols = [meta[0] for meta in cur.description] if cur.description else []
    rows = cur.fetchall()
    import pandas as pd
    return pd.DataFrame(rows, columns=cols or None) # Chuyển sang DataFrame pandas

# Thực thi truy vấn sử dụng REST API
def _run_rest(cfg: PinotFetchConfig, sql: str):
    import requests
    url = f"{cfg.scheme}://{cfg.host}:{cfg.port}{cfg.path}"
    payload = {"sql": sql}
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, data=json.dumps(payload), headers=headers, timeout=cfg.timeout, verify=cfg.verify)
    response.raise_for_status()
    body = response.json()
    if "exceptions" in body and body["exceptions"]:
        eprint("Pinot returned exceptions:", body["exceptions"])
    result_table = body.get("resultTable") or {}
    cols = result_table.get("dataSchema", {}).get("columnNames", [])
    rows = result_table.get("rows", [])
    import pandas as pd
    return pd.DataFrame(rows, columns=cols or None)

# Hàm chính để lấy dữ liệu từ Pinot dựa trên khoảng thời gian
def fetch(start_dt: datetime, end_dt: datetime, limit_nf: Optional[int] = None):
    cfg = _require_config()
    sql = _build_sql(cfg.table, start_dt, end_dt, limit_nf)
    if cfg.mode == "dbapi":
        return _run_dbapi(cfg, sql)
    if cfg.mode == "rest":
        return _run_rest(cfg, sql)
    raise ValueError(f"Unsupported mode: {cfg.mode}")

# Hàm để lấy dữ liệu dựa trên ngày kết thúc và số tháng cửa sổ
def fetch_by_end_date(end_date: Optional[str], window_months: int, limit_nf: Optional[int] = None):
    if window_months < 0:
        raise ValueError("window_months must be >= 0")
    tz = timezone.utc
    end_dt = (
        datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=tz)
        if end_date
        else datetime.now(tz)
    )
    start_dt = end_dt - timedelta(days=30 * window_months) if window_months > 0 else end_dt
    return fetch(start_dt, end_dt, limit_nf)

# Giúp hàm để xác định đường dẫn đầu ra
def _resolve_out_path(out_path: str) -> str:
    if os.path.isabs(out_path):
        return out_path
    return os.path.abspath(os.path.join(os.getcwd(), out_path))

# Hàm để lưu DataFrame vào tệp CSV hoặc Parquet
def save_df(df, out_path: Optional[str]) -> None:
    if df is None or out_path is None:
        return
    normalized_path = _resolve_out_path(out_path)
    folder = os.path.dirname(normalized_path) or "."
    os.makedirs(folder, exist_ok=True)
    ext = os.path.splitext(normalized_path)[1].lower()
    if ext == ".csv":
        df.to_csv(normalized_path, index=False)
    elif ext == ".parquet":
        try:
            df.to_parquet(normalized_path, index=False)
        except Exception as exc:
            eprint("Failed to save parquet; falling back to CSV:", exc)
            df.to_csv(normalized_path + ".csv", index=False)
    else:
        df.to_csv(normalized_path, index=False)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Fetch Pinot data between start and end timestamps derived from create_dt."
    )
    parser.add_argument("--host", default="93.115.172.151")
    parser.add_argument("--port", type=int, default=8099)
    parser.add_argument("--scheme", default="http", choices=["http", "https"])
    parser.add_argument("--path", default="/query/sql")
    parser.add_argument("--table", default="transactions")
    parser.add_argument("--mode", choices=["dbapi", "rest"], default="dbapi")
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--end-date", dest="end_date", default=None)
    parser.add_argument("--window-months", type=int, default=1)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--out", default="data/data.csv")
    parser.add_argument("--pretty", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    cfg = PinotFetchConfig(
        host=args.host,
        port=args.port,
        scheme=args.scheme,
        path=args.path,
        table=args.table,
        mode=args.mode,
        timeout=args.timeout,
        verify=args.verify,
    )
    configure(cfg)

    t0 = time.time()
    df = fetch_by_end_date(args.end_date, args.window_months, args.limit)
    elapsed = time.time() - t0
    print(f"Fetched {0 if df is None else len(df)} rows in {elapsed:.2f}s", file=sys.stderr)

    if args.pretty and df is not None:
        try:
            import pandas as pd
            with pd.option_context("display.max_rows", 10, "display.max_columns", None):
                print(df.head(10))
        except Exception:
            print(df.head(10) if hasattr(df, "head") else df)

    if args.out and df is not None:
        save_df(df, args.out)
        print(f"Saved to {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
