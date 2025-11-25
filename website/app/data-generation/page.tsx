'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/src/layouts/dashboard-layout';
import { Button } from '@/src/components/atoms/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/src/components/atoms/card';
import { Play, Square, RefreshCw, Database, AlertCircle, CheckCircle2, TrendingUp, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DataGenerationStatus {
  is_running: boolean;
  process_id?: number;
  started_at?: string;
  records_generated?: number;
  last_sequence?: number;
}

interface DataGenerationConfig {
  interval_seconds: number;
  topic_raw: string;
  bootstrap_servers: string;
  start_sequence: number;
  simulation_mode: string;
}

interface DataMetrics {
  timestamp: string;
  totalRecords: number;
  recordsPerSecond: number;
}

interface PinotMetrics {
  timestamp: string;
  queryTime: number;
  docsScanned: number;
  segmentsQueried: number;
}

export default function DataGenerationPage() {
  const [status, setStatus] = useState<DataGenerationStatus>({ is_running: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [dataMetrics, setDataMetrics] = useState<DataMetrics[]>([]);
  const [pinotMetrics, setPinotMetrics] = useState<PinotMetrics[]>([]);
  const [isActuallyGenerating, setIsActuallyGenerating] = useState(false);
  const [config, setConfig] = useState<DataGenerationConfig>({
    interval_seconds: 2,
    topic_raw: 'transactions_raw',
    bootstrap_servers: 'localhost:9092',
    start_sequence: 1,
    simulation_mode: 'auto',
  });

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/data-generation/status');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Status fetch failed:', response.status, errorText);
        setBackendConnected(false);
        throw new Error(`Failed to fetch status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Received status data:', data); // Debug log
      setStatus(data);
      setError(null);
      setBackendConnected(true);
    } catch (err: any) {
      console.error('Error fetching status:', err);
      setBackendConnected(false);
      // Don't show error for initial fetch failures - backend might not be running
      // setError('Backend not available');
    }
  };

  const fetchPinotMetrics = async () => {
    try {
      const { pinotClient } = await import('@/src/services/pinot-client');
      
      // Query Pinot to get total records and query performance
      const query = {
        sql: 'SELECT COUNT(*) as total_records FROM transactions',
      };
      
      const startTime = performance.now();
      const result = await pinotClient.query(query);
      const endTime = performance.now();
      
      if (result) {
        const totalRecords = typeof result.resultTable.rows[0]?.[0] === 'number' 
          ? result.resultTable.rows[0][0] 
          : 0;
        
        const now = new Date().toLocaleTimeString();
        
        // Update data metrics
        setDataMetrics(prev => {
          const newMetrics = [...prev, {
            timestamp: now,
            totalRecords,
            recordsPerSecond: prev.length > 0 
              ? Math.max(0, (totalRecords - prev[prev.length - 1].totalRecords) / 3)
              : 0
          }].slice(-20); // Keep last 20 data points
          
          // Detect if data is actually being generated
          if (newMetrics.length >= 2) {
            const lastTwo = newMetrics.slice(-2);
            const isIncreasing = lastTwo[1].totalRecords > lastTwo[0].totalRecords;
            setIsActuallyGenerating(isIncreasing);
          }
          
          return newMetrics;
        });
        
        // Update Pinot performance metrics
        setPinotMetrics(prev => [...prev, {
          timestamp: now,
          queryTime: endTime - startTime,
          docsScanned: result.numDocsScanned || 0,
          segmentsQueried: result.numSegmentsQueried || 0,
        }].slice(-20)); // Keep last 20 data points
      }
    } catch (err) {
      console.error('Failed to fetch Pinot metrics:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchPinotMetrics();
    
    const statusInterval = setInterval(() => {
      fetchStatus();
    }, 3000); // Poll every 3 seconds
    const metricsInterval = setInterval(() => {
      fetchPinotMetrics();
    }, 3000); // Poll every 3 seconds
    
    return () => {
      clearInterval(statusInterval);
      clearInterval(metricsInterval);
    };
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data-generation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start data generation');
      }

      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data-generation/stop', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to stop data generation');
      }

      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Generate Data</h1>
          <p className="text-muted-foreground mt-2">
            Control the real-time data generation process for transaction streaming
          </p>
        </div>

        {/* Backend Connection Status */}
        {backendConnected === false && (
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="font-semibold text-orange-900 dark:text-orange-100">Backend Not Connected</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Unable to connect to the backend API at <code className="px-1 py-0.5 bg-orange-200 dark:bg-orange-900 rounded text-xs">http://localhost:8080</code>. 
                    Please ensure the backend server is running.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Generation Status
            </CardTitle>
            <CardDescription>
              Current state of the transaction data generator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status.is_running ? (
                  <>
                    <div className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">Process Running</span>
                  </>
                ) : (
                  <>
                    <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                    <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">Process Stopped</span>
                  </>
                )}
              </div>
              
              {/* Activity Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
                {isActuallyGenerating ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-medium">Data Flowing</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                    <span className="text-xs font-medium">No Activity</span>
                  </>
                )}
              </div>
            </div>

            {status.is_running && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Process ID</p>
                  <p className="text-lg font-mono">{status.process_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Started At</p>
                  <p className="text-sm">{status.started_at ? new Date(status.started_at).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={status.is_running ? handleStop : handleStart}
                disabled={loading || backendConnected === false}
                variant={status.is_running ? "destructive" : "default"}
                className="flex items-center gap-2"
              >
                {status.is_running ? (
                  <>
                    <Square className="h-4 w-4" />
                    Stop Generation
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Generation
                  </>
                )}
              </Button>
              <Button
                onClick={fetchStatus}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Generation Metrics Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Data Generation Progress
              </CardTitle>
              <CardDescription>
                Total records in Pinot over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dataMetrics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="timestamp" 
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="totalRecords" 
                      name="Total Records"
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Collecting data metrics...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Pinot Query Performance
              </CardTitle>
              <CardDescription>
                Query response time and segments processed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pinotMetrics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={pinotMetrics}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="timestamp" 
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Query Time (ms)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Segments', angle: 90, position: 'insideRight', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="queryTime" 
                      name="Query Time (ms)"
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="segmentsQueried" 
                      name="Segments Queried"
                      stroke="#ffc658" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Collecting performance metrics...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Metrics Summary */}
        {dataMetrics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Records</div>
                <div className="text-2xl font-bold">{dataMetrics[dataMetrics.length - 1]?.totalRecords.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Records/Second</div>
                <div className="text-2xl font-bold">{dataMetrics[dataMetrics.length - 1]?.recordsPerSecond.toFixed(1)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Avg Query Time</div>
                <div className="text-2xl font-bold">
                  {pinotMetrics.length > 0 
                    ? (pinotMetrics.reduce((sum, m) => sum + m.queryTime, 0) / pinotMetrics.length).toFixed(1) 
                    : '0'} ms
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Segments Queried</div>
                <div className="text-2xl font-bold">
                  {pinotMetrics[pinotMetrics.length - 1]?.segmentsQueried || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Adjust data generation parameters (changes apply on next start)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Simulation Mode Selector */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Simulation Mode
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { value: 'auto', label: '⏰ Auto (Time-based)', desc: 'Follows real-time patterns' },
                    { value: 'peak', label: '📈 Peak Hours', desc: '8-15 tx/batch, 0.5s' },
                    { value: 'normal', label: '📊 Normal', desc: '4-8 tx/batch, 1.0s' },
                    { value: 'low', label: '📉 Low Activity', desc: '2-4 tx/batch, 1.5s' },
                    { value: 'night', label: '🌙 Night Mode', desc: '1-2 tx/batch, 2.5s' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setConfig({ ...config, simulation_mode: mode.value })}
                      disabled={status.is_running}
                      className={`
                        p-3 rounded-lg border-2 text-left transition-all
                        ${config.simulation_mode === mode.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                        }
                        ${status.is_running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="font-semibold text-sm mb-1">{mode.label}</div>
                      <div className="text-xs text-muted-foreground">{mode.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {config.simulation_mode === 'auto' 
                    ? '⏰ Transactions will vary based on actual time of day (low at night, high 9AM-6PM)'
                    : `🎮 Fixed rate simulation - transactions will maintain consistent pattern regardless of time`
                  }
                </p>
              </div>

              {/* Other Configuration Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={config.interval_seconds}
                    onChange={(e) => setConfig({ ...config, interval_seconds: parseInt(e.target.value) || 2 })}
                    disabled={status.is_running}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Sequence
                  </label>
                  <input
                    type="number"
                    value={config.start_sequence}
                    onChange={(e) => setConfig({ ...config, start_sequence: parseInt(e.target.value) || 1 })}
                    disabled={status.is_running}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Kafka Topic
                  </label>
                  <input
                    type="text"
                    value={config.topic_raw}
                    onChange={(e) => setConfig({ ...config, topic_raw: e.target.value })}
                    disabled={status.is_running}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bootstrap Servers
                  </label>
                  <input
                    type="text"
                    value={config.bootstrap_servers}
                    onChange={(e) => setConfig({ ...config, bootstrap_servers: e.target.value })}
                    disabled={status.is_running}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>The data generator produces synthetic transaction records and streams them to Kafka</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Configure the interval to control how frequently new records are generated</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Records are sent to the configured Kafka topic for real-time processing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>You can stop and start the process at any time; the sequence number will continue from where it left off</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Prerequisites Card */}
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <AlertCircle className="h-5 w-5" />
              Prerequisites
            </CardTitle>
            <CardDescription>
              Required services that must be running before starting data generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">Kafka Broker</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Must be running on <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">{config.bootstrap_servers}</code>
                  </p>
                  <code className="block px-3 py-2 bg-gray-900 dark:bg-gray-950 text-gray-100 rounded text-xs overflow-x-auto">
                    # Check if Kafka is running<br/>
                    nc -zv localhost 9092
                  </code>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">Kafka Topic</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Topic <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">{config.topic_raw}</code> should exist
                  </p>
                  <code className="block px-3 py-2 bg-gray-900 dark:bg-gray-950 text-gray-100 rounded text-xs overflow-x-auto">
                    # Create topic if needed<br/>
                    kafka-topics --create --topic {config.topic_raw} \<br/>
                    {'  '}--bootstrap-server localhost:9092
                  </code>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">Backend API</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Backend server at <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">http://localhost:8080</code>
                  </p>
                  <code className="block px-3 py-2 bg-gray-900 dark:bg-gray-950 text-gray-100 rounded text-xs overflow-x-auto">
                    # Start backend server<br/>
                    uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
