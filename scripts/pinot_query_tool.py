import argparse
import sys
import json
import time

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

def parse_args():
    p = argparse.ArgumentParser(
        description="Query Apache Pinot via pinotdb (DB-API) or REST, save results to CSV/Parquet."
    )
    p.add_argument("--host", default="93.115.172.151", help="Broker host (NOT controller UI host if different).")
    p.add_argument("--port", type=int, default=8099, help="Broker port (default 8099).")
    p.add_argument("--scheme", default="http", choices=["http", "https"], help="http/https")
    p.add_argument("--path", default="/query/sql", help="Broker SQL path (default /query/sql).")
    p.add_argument("--sql", default=None, help="SQL to execute. If omitted, uses SELECT 1.")
    p.add_argument("--table", default=None, help="Convenience: if provided and --sql omitted, runs SELECT * FROM <table> LIMIT 10.")
    p.add_argument("--mode", default="dbapi", choices=["dbapi", "rest"], help="dbapi uses pinotdb; rest uses HTTP POST.")
    p.add_argument("--out", default=None, help="Output file path (e.g., results.csv or results.parquet).")
    p.add_argument("--limit", type=int, default=10, help="Row limit for default query.")
    p.add_argument("--timeout", type=int, default=60, help="Timeout seconds for REST requests.")
    p.add_argument("--verify", action="store_true", help="Verify TLS certs when scheme=https (REST).")
    p.add_argument("--pretty", action="store_true", help="Pretty print a small sample to stdout.")
    return p.parse_args()

def build_default_sql(table, limit):
    if table:
        return f"SELECT * FROM {table} LIMIT {limit}"
    return "SELECT 1"

def to_dataframe_from_dbapi(cursor):
    cols = [d[0] for d in cursor.description] if cursor.description else []
    rows = list(cursor.fetchall())
    try:
        import pandas as pd
        df = pd.DataFrame(rows, columns=cols or None)
        return df
    except Exception as e:
        eprint("Pandas not available or failed:", e)
        print(rows)
        return None

def to_dataframe_from_rest(resp_json):
    rt = resp_json.get("resultTable") or {}
    cols = rt.get("dataSchema", {}).get("columnNames", [])
    rows = rt.get("rows", [])
    try:
        import pandas as pd
        df = pd.DataFrame(rows, columns=cols or None)
        return df
    except Exception as e:
        eprint("Pandas not available or failed:", e)
        print(rows)
        return None

def save_df(df, out_path):
    if df is None:
        eprint("No DataFrame to save.")
        return
    if out_path is None:
        return
    import os
    ext = os.path.splitext(out_path)[1].lower()
    if ext == ".csv":
        df.to_csv(out_path, index=False)
    elif ext == ".parquet":
        try:
            df.to_parquet(out_path, index=False)
        except Exception as e:
            eprint("Failed to save parquet; ensure pyarrow or fastparquet is installed. Error:", e)
            eprint("Falling back to CSV next to parquet file.")
            df.to_csv(out_path + ".csv", index=False)
            return
    else:
        df.to_csv(out_path, index=False)

def run_dbapi(host, port, scheme, path, sql):
    try:
        from pinotdb import connect
    except Exception as e:
        eprint("Failed to import pinotdb. Install with: pip install pinotdb")
        raise

    conn = connect(host=host, port=port, path=path, scheme=scheme)
    cur = conn.cursor()
    cur.execute(sql)
    return cur

def run_rest(host, port, scheme, path, sql, timeout, verify):
    import requests
    url = f"{scheme}://{host}:{port}{path}"
    payload = {"sql": sql}
    headers = {"Content-Type": "application/json"}
    r = requests.post(url, data=json.dumps(payload), headers=headers, timeout=timeout, verify=verify)
    r.raise_for_status()
    return r.json()

def main():
    args = parse_args()
    sql = args.sql or build_default_sql(args.table, args.limit)

    print(f"Executing in {args.mode.upper()} mode: {sql}")
    t0 = time.time()

    if args.mode == "dbapi":
        cur = run_dbapi(args.host, args.port, args.scheme, args.path, sql)
        df = to_dataframe_from_dbapi(cur)
    else:
        resp = run_rest(args.host, args.port, args.scheme, args.path, sql, args.timeout, args.verify)
        if "exceptions" in resp and resp["exceptions"]:
            eprint("Pinot returned exceptions:", resp["exceptions"])
        df = to_dataframe_from_rest(resp)

    elapsed = time.time() - t0
    print(f"Query done in {elapsed:.2f}s")

    if df is not None:
        if args.pretty:
            try:
                import pandas as pd
                with pd.option_context('display.max_rows', 10, 'display.max_columns', None):
                    print(df.head(10))
            except Exception:
                print(df.head(10) if hasattr(df, 'head') else df)
        if args.out:
            save_df(df, args.out)
            print(f"Saved to {args.out}")
    else:
        print("No DataFrame produced. See errors above.")

if __name__ == "__main__":
    main()
