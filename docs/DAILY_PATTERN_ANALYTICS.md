# Daily Pattern Analytics - Segment-Based Analysis

## Overview

The Daily Pattern Analytics feature leverages Apache Pinot's segment architecture to analyze transaction patterns grouped by day. Each day's data is stored in separate segments, enabling efficient time-based analysis and pattern recognition.

## How Pinot Segments Work for Daily Analysis

### Segment Organization

Pinot automatically divides data into segments based on the time column (`create_dt`). For our realtime table:

```json
{
  "segmentsConfig": {
    "timeColumnName": "create_dt",
    "segmentPushFrequency": "DAILY",
    "retentionTimeValue": "30",
    "retentionTimeUnit": "DAYS"
  }
}
```

This means:
- **Daily segments**: Transactions are grouped into daily segments
- **30-day retention**: Older segments are automatically pruned
- **Efficient queries**: Date-range queries only scan relevant segments

### Query Optimization

When you query for daily patterns, Pinot uses **segment pruning**:

```sql
SELECT * FROM transactions 
WHERE create_dt >= ago('P7D')
GROUP BY DATETIMECONVERT(create_dt, '1:MILLISECONDS:EPOCH', '1:MILLISECONDS:EPOCH', '1:DAYS')
```

Pinot only scans the last 7 days of segments, not the entire table.

## Features

### 1. Daily Metrics Collection

For each day, the system analyzes:

**Volume Metrics**
- Total transactions
- Unique users
- Average transactions per user
- Peak hour of activity

**Financial Metrics**
- Total transaction amount
- Average transaction amount
- Maximum single transaction
- Amount distribution

**Fraud Metrics**
- Fraud count
- Fraud rate percentage
- Fraud distribution by payment method
- Fraud distribution by country

### 2. Pattern Detection

The AI analyzes each day for suspicious patterns:

**Temporal Patterns**
- ✅ Late night activity (0-5 AM) → High risk indicator
- ✅ Irregular hourly distribution → Potential bot activity
- ✅ Peak hour anomalies

**Volume Patterns**
- ✅ High transaction velocity per user
- ✅ Unusual transaction count spikes
- ✅ Low user diversity

**Financial Patterns**
- ✅ Large transaction amounts (>$5,000)
- ✅ High average amounts (>$1,000)
- ✅ Unusual amount distributions

**Fraud Patterns**
- ✅ Critical fraud rate (>10%)
- ✅ High fraud rate (>5%)
- ✅ Moderate fraud rate (>2%)

**Payment Method Patterns**
- ✅ High crypto fraud rate
- ✅ Limited payment diversity
- ✅ Payment method concentration

**Geographic Patterns**
- ✅ High fraud in specific countries
- ✅ Cross-border transaction concentration
- ✅ Country-specific anomalies

### 3. Risk Scoring

Each day receives a risk score (0-100) based on:

| Pattern | Risk Points |
|---------|-------------|
| Critical fraud rate (>10%) | +40 |
| High fraud rate (5-10%) | +25 |
| Moderate fraud rate (2-5%) | +10 |
| High velocity per user | +15 |
| Large transactions | +10 |
| Late night peak | +15 |
| Crypto fraud issues | +20 |
| Country fraud issues | +15 |
| Irregular distribution | +10 |

**Risk Levels**
- 🔴 **70-100**: CRITICAL - Immediate action required
- 🟡 **40-69**: HIGH - Enhanced monitoring needed
- 🟠 **20-39**: MODERATE - Continue monitoring
- 🟢 **0-19**: LOW - Normal operations

### 4. AI-Powered Recommendations

Based on detected patterns, the system provides actionable advice:

**Critical Situations**
```
🚨 URGENT: Fraud rate exceeds 10%
→ Implement immediate enhanced verification
→ Consider temporary transaction limits
→ Add multi-factor authentication
```

**High Risk**
```
⚠️ Elevated fraud rate (>5%)
→ Review fraud detection rules
→ Increase monitoring frequency
→ Manual review of flagged transactions
```

**Operational**
```
🔄 High transaction velocity detected
→ Implement rate limiting
→ Add CAPTCHA for high-frequency users
→ Monitor for bot patterns
```

**Temporal Anomalies**
```
🌙 Late night peak activity
→ Investigate automated systems
→ Review transaction patterns
→ Consider time-based rules
```

### 5. Trend Analysis

Compares consecutive days to identify trends:

**Transaction Volume Trend**
- Percentage change day-over-day
- Direction indicator (↑ ↓ →)
- Interpretation (significant increase/decrease)

**Fraud Rate Trend**
- Absolute change in fraud percentage
- ✅ Improving or ⚠️ Worsening indicator

**Financial Trends**
- Average amount changes
- User activity trends

## API Endpoint

```bash
GET /api/analytics/daily-patterns?days=7
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | 7 | Number of days to analyze (1-30) |

### Response Format

```json
{
  "dailyPatterns": [
    {
      "date": "2025-11-24",
      "totalTransactions": 2582,
      "fraudCount": 470,
      "fraudRate": 18.2,
      "totalAmount": 1357481,
      "avgAmount": 525.75,
      "maxAmount": 1351,
      "uniqueUsers": 100,
      "avgTransactionsPerUser": 25.82,
      "peakHour": 16,
      "suspiciousPatterns": [
        "Critical fraud rate detected",
        "High velocity detected"
      ],
      "riskScore": 65,
      "advice": [
        "🟡 HIGH RISK LEVEL: Enhanced monitoring recommended",
        "🚨 URGENT: Implement enhanced verification"
      ]
    }
  ],
  "trends": {
    "transactionVolume": {
      "change": 12.5,
      "direction": "up",
      "interpretation": "Normal variation"
    },
    "fraudRate": {
      "change": -2.3,
      "direction": "down",
      "interpretation": "✅ Fraud rate improving"
    }
  }
}
```

## UI Features

### Dashboard Access

Navigate to: **Dashboard → Analytics Tab** or directly to `/analytics`

### Interactive Elements

**Time Range Selector**
- Last 7 days
- Last 14 days
- Last 30 days

**Trend Cards**
- Transaction volume trend
- Fraud rate trend
- Average amount trend
- Unique users trend

**Daily Breakdown (Expandable)**

For each day, click "Show Details" to see:
1. **Suspicious Patterns** - All detected anomalies
2. **Recommended Actions** - AI-generated advice
3. **Additional Metrics** - Detailed statistics

### Visual Indicators

**Risk Score Badge**
- 🔴 CRITICAL (70-100)
- 🟡 HIGH (40-69)
- 🟠 MODERATE (20-39)
- 🟢 LOW (0-19)

**Trend Arrows**
- ↑ Increasing
- ↓ Decreasing
- → Stable

## SQL Queries Used

### Daily Aggregated Metrics
```sql
SELECT 
  DATETIMECONVERT(create_dt, '1:MILLISECONDS:EPOCH', '1:MILLISECONDS:EPOCH', '1:DAYS') as day_ms,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as fraud_count,
  SUM(transaction_amount_24hour) as total_amount,
  AVG(transaction_amount_24hour) as avg_amount,
  MAX(transaction_amount_24hour) as max_amount,
  COUNT(DISTINCT user_seq) as unique_users
FROM transactions
WHERE create_dt >= ago('P7D')
GROUP BY day_ms
ORDER BY day_ms DESC
```

### Hourly Distribution
```sql
SELECT 
  DATETIMECONVERT(create_dt, '1:MILLISECONDS:EPOCH', '1:MILLISECONDS:EPOCH', '1:DAYS') as day_ms,
  DATETRUNC('HOUR', create_dt, 'MILLISECONDS') as hour_ms,
  COUNT(*) as hourly_count
FROM transactions
WHERE create_dt >= ago('P7D')
GROUP BY day_ms, hour_ms
```

### Payment Method Analysis
```sql
SELECT 
  DATETIMECONVERT(create_dt, '1:MILLISECONDS:EPOCH', '1:MILLISECONDS:EPOCH', '1:DAYS') as day_ms,
  payment_method,
  COUNT(*) as count,
  SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as fraud_count
FROM transactions
WHERE create_dt >= ago('P7D')
GROUP BY day_ms, payment_method
```

## Benefits of Segment-Based Analysis

### 1. Performance
- **Fast queries**: Only scans relevant segments
- **Parallel processing**: Each segment analyzed independently
- **Low latency**: Sub-second response for 30 days of data

### 2. Scalability
- **Automatic pruning**: Old segments deleted automatically
- **Efficient storage**: Segments compressed and optimized
- **Linear scaling**: Add more servers = analyze more days

### 3. Flexibility
- **Easy to extend**: Add new metrics without schema changes
- **Real-time updates**: New segments created as data arrives
- **Historical analysis**: Query any time range efficiently

### 4. Business Value
- **Daily insights**: Understand day-to-day patterns
- **Trend detection**: Identify emerging fraud patterns early
- **Proactive prevention**: Act before fraud escalates
- **Compliance**: Daily reporting for audit requirements

## Use Cases

### 1. Daily Operations Review
```
Morning routine:
1. Check yesterday's risk score
2. Review suspicious patterns
3. Implement recommended actions
4. Monitor trends
```

### 2. Fraud Investigation
```
When fraud spike detected:
1. Compare to previous days
2. Identify pattern changes
3. Review country/payment method distribution
4. Implement targeted countermeasures
```

### 3. Business Intelligence
```
Weekly review:
1. Analyze 7-day trends
2. Identify peak activity patterns
3. Optimize fraud rules
4. Adjust risk thresholds
```

### 4. Compliance Reporting
```
Generate daily reports showing:
1. Transaction volume
2. Fraud rates
3. Risk assessments
4. Actions taken
```

## Best Practices

### 1. Regular Monitoring
- Review daily patterns every morning
- Set up alerts for high risk scores
- Track trends week-over-week

### 2. Action on Insights
- Implement recommended actions immediately
- Document pattern changes
- Adjust fraud rules based on patterns

### 3. Segment Retention
- Keep 30 days for trend analysis
- Archive older data if needed for compliance
- Balance storage vs analysis needs

### 4. Performance Optimization
- Query only needed date ranges
- Use appropriate grouping (daily, hourly)
- Leverage Pinot's time-based pruning

## Troubleshooting

### No Data Returned

**Problem**: API returns empty dailyPatterns
```bash
curl http://localhost:3000/api/analytics/daily-patterns?days=7
# Returns: {"dailyPatterns": [], "trends": null}
```

**Solutions**:
1. Check Pinot has data: `SELECT COUNT(*) FROM transactions`
2. Verify date range: `SELECT MIN(create_dt), MAX(create_dt) FROM transactions`
3. Check segment status: `/tables/transactions/segments`

### High Risk Scores Always

**Problem**: Every day shows 70+ risk score

**Analysis**:
- Review actual fraud rates in data
- Check if thresholds are too sensitive
- Verify data quality (labels correct?)

**Adjust**: Modify risk score calculation in `analyzePatterns()` function

### Slow Query Performance

**Problem**: API takes >5 seconds to respond

**Optimize**:
1. Reduce days queried (7 instead of 30)
2. Add indexes on grouping columns
3. Check Pinot cluster resources
4. Review segment count and size

## Future Enhancements

1. **Machine Learning Integration**
   - Anomaly detection on daily patterns
   - Predictive fraud rate forecasting
   - Automated threshold adjustment

2. **Advanced Visualizations**
   - Heatmaps of hourly patterns
   - Geographic fraud maps
   - Payment method charts

3. **Alerting**
   - Email/SMS for critical risk days
   - Slack/Teams integration
   - Automated response workflows

4. **Comparative Analysis**
   - Week-over-week comparison
   - Month-over-month trends
   - Year-over-year seasonality

## Related Documentation

- [Pinot Segment Management](https://docs.pinot.apache.org/basics/components/segment)
- [Time-Based Partitioning](https://docs.pinot.apache.org/operators/operating-pinot/tuning/routing#time-boundary-routing)
- [Ingestion Tracking](./INGESTION_TRACKING.md)
- [Fraud Detection ML Model](./ML_FRAUD_DETECTION.md)
