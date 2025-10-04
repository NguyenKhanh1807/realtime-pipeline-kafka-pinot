# Apache Pinot Ingestion Guide

This guide explains how to ingest CSV data into Apache Pinot (using Docker), including schema creation, table setup, segment generation, uploading, and querying.

------------------------------------------------------------------------

## 1. Start Pinot Cluster (Quickstart)

``` bash
docker run -it   -p 9000:9000 -p 8099:8099   apachepinot/pinot:latest QuickStart -type batch
```

This starts Controller (9000), Broker (8099), Server, and Zookeeper.

------------------------------------------------------------------------

## 2. Create Schema

Make sure you have your schema file (e.g., `transactions_schema.json`).

Run in **PowerShell** (Windows):

``` powershell
Invoke-WebRequest -Uri "http://localhost:9000/schemas" `
  -Method POST `
  -ContentType "application/json" `
  -InFile "C:\Users\Dinh Khanh\Downloads\BTL\transactions_schema.json"
```

------------------------------------------------------------------------

## 3. Create Table

Prepare table config file (e.g.,
`transactions_offline_table_simple.json`).

``` powershell
Invoke-WebRequest -Uri "http://localhost:9000/tables" `
  -Method POST `
  -ContentType "application/json" `
  -InFile "C:\Users\Dinh Khanh\Downloads\BTL\transactions_offline_table_simple.json"
```

------------------------------------------------------------------------

## 4. Build Segment

Run Docker to create a Pinot segment from CSV:

``` powershell
docker run --rm -it `
  --mount type=bind,source="C:\Users\Dinh Khanh\Downloads\BTL\data",target=/data,readonly `
  --mount type=bind,source="C:\Users\Dinh Khanh\Downloads\BTL\segments",target=/segments `
  --mount type=bind,source="C:\Users\Dinh Khanh\Downloads\BTL",target=/conf,readonly `
  apachepinot/pinot:latest `
  CreateSegment `
  -dataDir /data `
  -tableConfigFile /conf/transactions_offline_table_simple.json `
  -schemaFile /conf/transactions_schema.json `
  -format CSV `
  -outDir /segments/out `
  -overwrite
```

After running, check `/segments/out` for generated segment.

------------------------------------------------------------------------

## 5. Upload Segment to Pinot

``` powershell
docker run --rm -it `
  --mount type=bind,source="C:\Users\Dinh Khanh\Downloads\BTL\segments",target=/segments `
  apachepinot/pinot:latest `
  UploadSegment `
  -controllerHost localhost `
  -controllerPort 9000 `
  -segmentDir /segments/out `
  -tableName transactions
```

------------------------------------------------------------------------

## 6. Query Data

Open <http://localhost:9000/#/query> or use REST API.

Example query:

``` powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:8099/query/sql" `
  -ContentType "application/json" `
  -Body (@{ sql = "SELECT COUNT(*) AS cnt FROM transactions_OFFLINE" } | ConvertTo-Json)
```

Query all data (with LIMIT):

``` sql
SELECT * FROM transactions_OFFLINE LIMIT 100;
```

------------------------------------------------------------------------

## Notes

-   Replace `localhost` with your server IP if accessing remotely (e.g., `93.115.172.151`).
-   On Windows PowerShell, **curl** maps to `Invoke-WebRequest`. Use syntax shown above.
-   Always check **Controller UI** at http://localhost:9000 to verify schemas, tables, and segments.

------------------------------------------------------------------------

✅ You have successfully ingested and queried data in Apache Pinot!
