'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/src/layouts/dashboard-layout';
import { Typography } from '@/src/components/atoms/typography';
import { Card } from '@/src/components/atoms/card';
import { Button } from '@/src/components/atoms/button';
import { useIsAuthenticated } from '@/src/contexts/app-context';
import { 
  Database, 
  Server, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Cpu,
  BarChart3,
  ExternalLink,
  LineChart,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ComponentStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  message: string;
  icon: any;
}

interface MonitoringStatus {
  name: string;
  status: 'healthy' | 'error' | 'unknown';
  message: string;
  url?: string;
  metrics?: {
    label: string;
    value: string | number;
  }[];
}

interface PinotSegmentInfo {
  tableName: string;
  tableType: 'OFFLINE' | 'REALTIME';
  segmentCount: number;
  totalDocs: number;
  consumingSegments?: number;
}

interface PostgresUser {
  user_seq: number;
  user_name: string;
  country_code: string;
  id_type: string;
  register_date: string;
  birth_date?: string;
  status?: 'normal' | 'warning' | 'banned';
  ban_reason?: string;
}

interface DatabaseStats {
  totalUsers: number;
  activeBans: number;
  bannedUsers: number;
  warningUsers: number;
  countryDistribution: Record<string, number>;
}

interface PartitionDetail {
  partition: number;
  currentOffset: number;
  latestOffset: number;
  lag: number;
}

interface SegmentIngestionInfo {
  segmentName: string;
  consumerState: string;
  serverName: string;
  lastConsumedTimestamp: number;
  partitions: number;
  currentOffset: number;
  latestOffset: number;
  lag: number;
  partitionDetails: PartitionDetail[];
}

interface IngestionStatus {
  table: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  segments: SegmentIngestionInfo[];
  totalLag?: number;
  isConsuming?: boolean;
}

export default function DatabaseManagementPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<ComponentStatus[]>([]);
  const [monitoringServices, setMonitoringServices] = useState<MonitoringStatus[]>([]);
  const [segments, setSegments] = useState<PinotSegmentInfo[]>([]);
  const [users, setUsers] = useState<PostgresUser[]>([]);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [ingestionStatus, setIngestionStatus] = useState<IngestionStatus[]>([]);
  const [kafkaLag, setKafkaLag] = useState<number>(0);
  const [ingestionMetrics, setIngestionMetrics] = useState<{
    consumerLag: number;
    currentOffset: number;
    logEndOffset: number;
    consumingSegments: number;
  } | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  
  // User table pagination and filtering
  const [userFilter, setUserFilter] = useState<'all' | 'normal' | 'warning' | 'banned'>('all');
  const [userPage, setUserPage] = useState(0);
  const usersPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchSystemStatus();
    
    // Auto-refresh database stats every 10 seconds
    const statsInterval = setInterval(() => {
      fetchDatabaseStats();
      fetchPostgresUsers();
      fetchKafkaLag();
      fetchIngestionMetrics();
    }, 10000);
    
    return () => clearInterval(statsInterval);
  }, [isAuthenticated, router]);

  const fetchSystemStatus = async () => {
    setLoading(true);
    try {
      await Promise.all([
        checkPinotHealth(),
        checkKafkaHealth(),
        checkPostgresHealth(),
        checkProducerHealth(),
        checkMonitoringServices(),
        fetchPinotSegments(),
        fetchPostgresUsers(),
        fetchDatabaseStats(),
        fetchIngestionStatus(),
        fetchKafkaLag(),
        fetchIngestionMetrics()
      ]);
    } catch (error) {
      console.error('Error fetching system status:', error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  const checkPinotHealth = async () => {
    try {
      const response = await fetch('/api/pinot', { method: 'GET' });
      const data = await response.json();
      
      // Pinot health endpoint returns plain text "OK", so check response status
      const isHealthy = response.ok;
      
      setComponents(prev => [
        ...prev.filter(c => c.name !== 'Apache Pinot'),
        {
          name: 'Apache Pinot',
          status: isHealthy ? 'healthy' : 'error',
          message: isHealthy ? 'Broker is responding' : 'Broker is not responding',
          icon: Database
        }
      ]);
    } catch (error) {
      setComponents(prev => [
        ...prev.filter(c => c.name !== 'Apache Pinot'),
        {
          name: 'Apache Pinot',
          status: 'error',
          message: 'Unable to connect to Pinot',
          icon: Database
        }
      ]);
    }
  };

  const checkKafkaHealth = async () => {
    try {
      // Check Kafka by querying consumer lag (if we can get lag, Kafka is up)
      const response = await fetch('/api/kafka/lag');
      
      if (response.ok) {
        const data = await response.json();
        const hasConsumer = data.consumers && data.consumers.length > 0;
        
        setComponents(prev => [
          ...prev.filter(c => c.name !== 'Kafka Broker'),
          {
            name: 'Kafka Broker',
            status: 'healthy',
            message: hasConsumer ? `Consumer active (lag: ${data.totalLag} records)` : 'Kafka is running',
            icon: Server
          }
        ]);
      } else {
        setComponents(prev => [
          ...prev.filter(c => c.name !== 'Kafka Broker'),
          {
            name: 'Kafka Broker',
            status: 'warning',
            message: 'Unable to verify Kafka status',
            icon: Server
          }
        ]);
      }
    } catch (error) {
      setComponents(prev => [
        ...prev.filter(c => c.name !== 'Kafka Broker'),
        {
          name: 'Kafka Broker',
          status: 'unknown',
          message: 'Unable to verify Kafka status',
          icon: Server
        }
      ]);
    }
  };

  const checkPostgresHealth = async () => {
    try {
      const response = await fetch('/api/database/users');
      const data = await response.json();
      
      // Check if we got users data successfully
      const isHealthy = response.ok && !data.error;
      
      setComponents(prev => [
        ...prev.filter(c => c.name !== 'PostgreSQL'),
        {
          name: 'PostgreSQL',
          status: isHealthy ? 'healthy' : 'error',
          message: isHealthy ? `Database connected (${data.count || 0} users)` : 'Database connection failed',
          icon: HardDrive
        }
      ]);
    } catch (error) {
      setComponents(prev => [
        ...prev.filter(c => c.name !== 'PostgreSQL'),
        {
          name: 'PostgreSQL',
          status: 'error',
          message: 'Unable to connect to database',
          icon: HardDrive
        }
      ]);
    }
  };

  const checkProducerHealth = async () => {
    try {
      const response = await fetch('/api/producer/status');
      const data = await response.json();
      
      // Check for producer_active field from the API
      const isActive = data.producer_active === true;
      
      setComponents(prev => [
        ...prev.filter(c => c.name !== 'Data Producer'),
        {
          name: 'Data Producer',
          status: isActive ? 'healthy' : 'warning',
          message: isActive ? `Producer is running (${data.recent_transactions || 0} txns)` : 'Producer is stopped',
          icon: Activity
        }
      ]);
    } catch (error) {
      setComponents(prev => [
        ...prev.filter(c => c.name !== 'Data Producer'),
        {
          name: 'Data Producer',
          status: 'unknown',
          message: 'Unable to check producer status',
          icon: Activity
        }
      ]);
    }
  };

  const checkMonitoringServices = async () => {
    const services: MonitoringStatus[] = [];
    
    // Check Grafana
    try {
      const grafanaResponse = await fetch('/api/monitoring/grafana');
      const grafanaData = await grafanaResponse.json();
      
      services.push({
        name: 'Grafana',
        status: grafanaResponse.ok && grafanaData.healthy ? 'healthy' : 'error',
        message: grafanaResponse.ok && grafanaData.version ? `Running v${grafanaData.version}` : grafanaData.error || 'Not responding',
        url: 'http://localhost:3001'
      });
    } catch (error) {
      services.push({
        name: 'Grafana',
        status: 'error',
        message: 'Connection failed',
        url: 'http://localhost:3001'
      });
    }
    
    // Check Prometheus
    try {
      const promResponse = await fetch('/api/monitoring/prometheus');
      const promData = await promResponse.json();
      
      services.push({
        name: 'Prometheus',
        status: promResponse.ok && promData.healthy ? 'healthy' : 'error',
        message: promData.status || promData.error || 'Not responding',
        url: 'http://localhost:9090'
      });
    } catch (error) {
      services.push({
        name: 'Prometheus',
        status: 'error',
        message: 'Connection failed',
        url: 'http://localhost:9090'
      });
    }
    
    // Check Pinot Exporter
    try {
      const exporterResponse = await fetch('/api/monitoring/exporter');
      const exporterData = await exporterResponse.json();
      
      services.push({
        name: 'Pinot Exporter',
        status: exporterResponse.ok && exporterData.healthy ? 'healthy' : 'error',
        message: exporterData.status || exporterData.error || 'Not responding',
        url: 'http://localhost:9093/metrics'
      });
    } catch (error) {
      services.push({
        name: 'Pinot Exporter',
        status: 'error',
        message: 'Connection failed',
        url: 'http://localhost:9093/metrics'
      });
    }
    
    // Check Query Metrics
    try {
      const metricsResponse = await fetch('/api/pinot?action=metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        
        services.push({
          name: 'Query Metrics',
          status: 'healthy',
          message: 'Tracking active',
          metrics: [
            { label: 'QPM', value: metricsData.queriesPerMinute || 0 },
            { label: 'Avg Latency', value: `${(metricsData.avgLatencyLastMinuteMs || 0).toFixed(1)}ms` },
            { label: 'Total Queries', value: metricsData.totalQueries || 0 }
          ]
        });
      }
    } catch (error) {
      services.push({
        name: 'Query Metrics',
        status: 'error',
        message: 'Metrics unavailable'
      });
    }
    
    setMonitoringServices(services);
  };

  const fetchPinotSegments = async () => {
    try {
      // Fetch segment information from Pinot
      const response = await fetch('/api/pinot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `SELECT COUNT(*) as total FROM transactions`
        })
      });

      const data = await response.json();
      const totalDocs = data.resultTable?.rows?.[0]?.[0] || 0;
      const consumingSegments = data.numConsumingSegmentsQueried || 0;
      const totalSegments = data.numSegmentsQueried || 0;

      setSegments([
        {
          tableName: 'transactions',
          tableType: 'REALTIME',
          segmentCount: totalSegments,
          totalDocs: totalDocs,
          consumingSegments: consumingSegments
        }
      ]);
    } catch (error) {
      console.error('Error fetching segment info:', error);
      setSegments([]);
    }
  };

  const fetchPostgresUsers = async () => {
    try {
      const response = await fetch('/api/database/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching PostgreSQL users:', error);
      setUsers([]);
    }
  };

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('/api/database/stats');
      if (response.ok) {
        const data = await response.json();
        setDbStats(data);
      }
    } catch (error) {
      console.error('Error fetching database stats:', error);
      setDbStats(null);
    }
  };

  const handleUserAction = async (userSeq: number, action: 'ban' | 'unban' | 'warn') => {
    setUpdatingUser(userSeq);
    try {
      const response = await fetch('/api/database/user-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userSeq, action }),
      });

      if (response.ok) {
        // Refresh users and stats
        await Promise.all([
          fetchPostgresUsers(),
          fetchDatabaseStats(),
        ]);
      } else {
        console.error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setUpdatingUser(null);
    }
  };

  const fetchIngestionStatus = async () => {
    try {
      const response = await fetch('/api/pinot/ingestion');
      if (response.ok) {
        const data = await response.json();
        setIngestionStatus(data.ingestionStatus || []);
      }
    } catch (error) {
      console.error('Error fetching ingestion status:', error);
      setIngestionStatus([]);
    }
  };

  const fetchKafkaLag = async () => {
    try {
      const response = await fetch('/api/kafka/lag');
      if (response.ok) {
        const data = await response.json();
        setKafkaLag(data.totalLag || 0);
      }
    } catch (error) {
      console.error('Error fetching Kafka lag:', error);
      setKafkaLag(0);
    }
  };

  const fetchIngestionMetrics = async () => {
    try {
      const response = await fetch('/api/prometheus/ingestion');
      if (!response.ok) {
        throw new Error('Failed to fetch ingestion metrics');
      }
      const metrics = await response.json();
      setIngestionMetrics(metrics);
    } catch (error) {
      console.error('Error fetching ingestion metrics:', error);
      setIngestionMetrics({
        consumerLag: 0,
        currentOffset: 0,
        logEndOffset: 0,
        consumingSegments: 0
      });
    }
  };

  const toggleTableExpansion = (tableName: string) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h1" size="3xl" weight="bold" className="mb-2">
              Database Management
            </Typography>
            <Typography variant="p" color="muted">
              Monitor system components and database segments
            </Typography>
          </div>
          <div className="flex items-center gap-3">
            <Typography variant="p" size="sm" color="muted">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Typography>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchSystemStatus}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Component Status */}
        <Card className="p-6">
          <Typography variant="h3" size="lg" weight="semibold" className="mb-4">
            Component Status
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {components.length === 0 && loading ? (
              <div className="col-span-4 text-center py-8 text-muted-foreground">
                Loading component status...
              </div>
            ) : (
              components.map((component) => {
                const Icon = component.icon;
                return (
                  <div
                    key={component.name}
                    className={cn(
                      "p-4 rounded-lg border",
                      getStatusColor(component.status)
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                      {getStatusIcon(component.status)}
                    </div>
                    <Typography variant="h4" size="sm" weight="semibold" className="mb-1">
                      {component.name}
                    </Typography>
                    <Typography variant="p" size="xs" color="muted">
                      {component.message}
                    </Typography>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Monitoring Services */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-muted-foreground" />
              <Typography variant="h3" size="lg" weight="semibold">
                Monitoring Services
              </Typography>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('http://localhost:3001/d/817646a6-3666-48ee-9f62-2209e0b11407/pinot-query-performance', '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Grafana Dashboards
            </Button>
          </div>

          {monitoringServices.length === 0 && loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading monitoring status...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {monitoringServices.map((service) => (
                <div
                  key={service.name}
                  className={cn(
                    "p-4 rounded-lg border",
                    getStatusColor(service.status)
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-6 w-6 text-muted-foreground" />
                      {service.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => window.open(service.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {getStatusIcon(service.status)}
                  </div>
                  <Typography variant="h4" size="sm" weight="semibold" className="mb-1">
                    {service.name}
                  </Typography>
                  <Typography variant="p" size="xs" color="muted" className="mb-2">
                    {service.message}
                  </Typography>
                  {service.metrics && service.metrics.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border space-y-1">
                      {service.metrics.map((metric, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{metric.label}:</span>
                          <span className="font-semibold">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {monitoringServices.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <Typography variant="p" size="sm" color="muted">
                  Available Dashboards
                </Typography>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('http://localhost:3001/d/b43aa969-6b89-4ce7-989f-d2c5bb5d877a/pinot-performance-monitoring', '_blank')}
                    className="gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Pinot Performance
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('http://localhost:3001/d/817646a6-3666-48ee-9f62-2209e0b11407/pinot-query-performance', '_blank')}
                    className="gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    Query Performance
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Ingestion Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <Typography variant="h3" size="lg" weight="semibold">
                Real-time Ingestion Status
              </Typography>
            </div>
          </div>
          
          {ingestionStatus.length === 0 && loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading ingestion status...
            </div>
          ) : ingestionStatus.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No real-time tables found
            </div>
          ) : (
            <div className="space-y-4">
              {ingestionStatus.map((table) => {
                const isExpanded = expandedTables.has(table.table);
                
                return (
                  <div
                    key={table.table}
                    className={cn(
                      "border rounded-lg p-4 transition-colors",
                      getStatusColor(table.status)
                    )}
                  >
                    {/* Table Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(table.status)}
                        <div>
                          <Typography variant="h4" size="base" weight="semibold">
                            {table.table}
                          </Typography>
                          <Typography variant="p" size="sm" color="muted">
                            {table.message}
                          </Typography>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Typography variant="p" size="xs" color="muted">
                            Total Lag
                          </Typography>
                          <Typography variant="p" size="sm" weight="semibold">
                            {kafkaLag.toLocaleString()} records
                          </Typography>
                        </div>
                        
                        {table.segments.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTableExpansion(table.table)}
                            className="gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Show Details
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Segment Details (Expandable) */}
                    {isExpanded && table.segments.length > 0 && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        {table.segments.map((segment, idx) => (
                          <div
                            key={idx}
                            className="bg-background/50 rounded-lg p-4 border border-border/50"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div>
                                <Typography variant="p" size="xs" color="muted" className="mb-1">
                                  Segment Name
                                </Typography>
                                <Typography variant="p" size="sm" weight="medium" className="font-mono text-xs">
                                  {segment.segmentName}
                                </Typography>
                              </div>
                              
                              <div>
                                <Typography variant="p" size="xs" color="muted" className="mb-1">
                                  Server
                                </Typography>
                                <Typography variant="p" size="sm" weight="medium">
                                  {segment.serverName}
                                </Typography>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              <div className="bg-muted/30 rounded p-2">
                                <Typography variant="p" size="xs" color="muted">
                                  State
                                </Typography>
                                <Typography variant="p" size="sm" weight="semibold">
                                  {segment.consumerState}
                                </Typography>
                              </div>
                              
                              <div className="bg-muted/30 rounded p-2">
                                <Typography variant="p" size="xs" color="muted">
                                  Partitions
                                </Typography>
                                <Typography variant="p" size="sm" weight="semibold">
                                  {segment.partitions}
                                </Typography>
                              </div>
                              
                              <div className="bg-muted/30 rounded p-2">
                                <Typography variant="p" size="xs" color="muted">
                                  Current Offset
                                </Typography>
                                <Typography variant="p" size="sm" weight="semibold">
                                  {segment.currentOffset.toLocaleString()}
                                </Typography>
                              </div>
                              
                              <div className="bg-muted/30 rounded p-2">
                                <Typography variant="p" size="xs" color="muted">
                                  Lag
                                </Typography>
                                <Typography 
                                  variant="p" 
                                  size="sm" 
                                  weight="semibold"
                                  className={cn(
                                    segment.lag === 0 ? 'text-green-600 dark:text-green-400' : 
                                    segment.lag > 1000 ? 'text-yellow-600 dark:text-yellow-400' : 
                                    'text-muted-foreground'
                                  )}
                                >
                                  {segment.lag.toLocaleString()}
                                </Typography>
                              </div>
                            </div>
                            
                            {/* Partition Details */}
                            {segment.partitionDetails.length > 0 && (
                              <div className="border-t border-border/50 pt-3">
                                <Typography variant="p" size="xs" color="muted" className="mb-2">
                                  Partition Details
                                </Typography>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {segment.partitionDetails.map((partition) => (
                                    <div 
                                      key={partition.partition}
                                      className="bg-muted/20 rounded p-2 text-sm"
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <Typography variant="p" size="xs" weight="medium">
                                          Partition {partition.partition}
                                        </Typography>
                                        <Typography 
                                          variant="p" 
                                          size="xs" 
                                          className={cn(
                                            partition.lag === 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                                          )}
                                        >
                                          Lag: {partition.lag}
                                        </Typography>
                                      </div>
                                      <Typography variant="p" size="xs" color="muted">
                                        Offset: {partition.currentOffset.toLocaleString()} / {partition.latestOffset.toLocaleString()}
                                      </Typography>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Pinot Segments */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" size="lg" weight="semibold">
              Pinot Table Segments
            </Typography>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          
          {segments.length === 0 && loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading segment information...
            </div>
          ) : segments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No segments found
            </div>
          ) : (
            <div className="space-y-4">
              {segments.map((segment) => (
                <div
                  key={`${segment.tableName}-${segment.tableType}`}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Typography variant="h4" size="base" weight="semibold">
                        {segment.tableName}
                      </Typography>
                      <Typography variant="p" size="sm" color="muted">
                        Type: {segment.tableType}
                      </Typography>
                    </div>
                    <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {segment.tableType}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <Typography variant="p" size="xs" color="muted" className="mb-1">
                        Total Segments
                      </Typography>
                      <Typography variant="h3" size="xl" weight="bold">
                        {segment.segmentCount}
                      </Typography>
                    </div>
                    
                    {segment.consumingSegments !== undefined && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <Typography variant="p" size="xs" color="muted" className="mb-1">
                          Consuming Segments
                        </Typography>
                        <Typography variant="h3" size="xl" weight="bold">
                          {segment.consumingSegments}
                        </Typography>
                      </div>
                    )}
                    
                    <div className="bg-muted/50 rounded-lg p-3">
                      <Typography variant="p" size="xs" color="muted" className="mb-1">
                        Total Documents
                      </Typography>
                      <Typography variant="h3" size="xl" weight="bold">
                        {segment.totalDocs.toLocaleString()}
                      </Typography>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Ingestion Metrics */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" size="lg" weight="semibold">
              Real-time Ingestion Metrics
            </Typography>
            <Activity className="h-5 w-5 text-blue-500" />
          </div>

          {ingestionMetrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <Typography variant="p" size="xs" color="muted">
                    Consumer Lag
                  </Typography>
                </div>
                <Typography variant="h3" size="2xl" weight="bold" className="text-blue-600 dark:text-blue-400">
                  {ingestionMetrics.consumerLag.toLocaleString()}
                </Typography>
                <Typography variant="span" size="xs" color="muted">
                  records behind
                </Typography>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <Typography variant="p" size="xs" color="muted">
                    Current Offset
                  </Typography>
                </div>
                <Typography variant="h3" size="2xl" weight="bold" className="text-green-600 dark:text-green-400">
                  {ingestionMetrics.currentOffset.toLocaleString()}
                </Typography>
                <Typography variant="span" size="xs" color="muted">
                  records consumed
                </Typography>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-purple-600" />
                  <Typography variant="p" size="xs" color="muted">
                    Log End Offset
                  </Typography>
                </div>
                <Typography variant="h3" size="2xl" weight="bold" className="text-purple-600 dark:text-purple-400">
                  {ingestionMetrics.logEndOffset.toLocaleString()}
                </Typography>
                <Typography variant="span" size="xs" color="muted">
                  total available
                </Typography>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-orange-600" />
                  <Typography variant="p" size="xs" color="muted">
                    Active Segments
                  </Typography>
                </div>
                <Typography variant="h3" size="2xl" weight="bold" className="text-orange-600 dark:text-orange-400">
                  {ingestionMetrics.consumingSegments}
                </Typography>
                <Typography variant="span" size="xs" color="muted">
                  consuming now
                </Typography>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Typography variant="p" color="muted">
                Loading ingestion metrics...
              </Typography>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <Typography variant="span" color="muted">
                Ingestion Health: {ingestionMetrics?.consumerLag === 0 ? '✓ Caught up' : `${ingestionMetrics?.consumerLag} records lag`}
              </Typography>
              <Typography variant="span" color="muted">
                Updated: {lastRefresh.toLocaleTimeString()}
              </Typography>
            </div>
          </div>
        </Card>

        {/* PostgreSQL Database Stats */}
        <Card className="p-6">
          <Typography variant="h3" size="lg" weight="semibold" className="mb-4">
            PostgreSQL Database
          </Typography>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <Typography variant="p" size="xs" color="muted" className="mb-1">
                Total Users
              </Typography>
              <Typography variant="h3" size="2xl" weight="bold">
                {dbStats?.totalUsers || 0}
              </Typography>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <Typography variant="p" size="xs" color="muted" className="mb-1">
                Active Bans
              </Typography>
              <Typography variant="h3" size="2xl" weight="bold" className="text-red-500">
                {dbStats?.bannedUsers || 0}
              </Typography>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <Typography variant="p" size="xs" color="muted" className="mb-1">
                Warnings
              </Typography>
              <Typography variant="h3" size="2xl" weight="bold" className="text-yellow-500">
                {dbStats?.warningUsers || 0}
              </Typography>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <Typography variant="p" size="xs" color="muted" className="mb-1">
                Countries
              </Typography>
              <Typography variant="h3" size="2xl" weight="bold">
                {Object.keys(dbStats?.countryDistribution || {}).length}
              </Typography>
            </div>
          </div>

          {/* User Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b border-border">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <Typography variant="h4" size="sm" weight="semibold">
                  User Management
                </Typography>
                
                {/* Filter Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant={userFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setUserFilter('all'); setUserPage(0); }}
                    className="text-xs"
                  >
                    All ({users.length})
                  </Button>
                  <Button
                    variant={userFilter === 'normal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setUserFilter('normal'); setUserPage(0); }}
                    className="text-xs"
                  >
                    🟢 Normal ({users.filter(u => (u.status || 'normal') === 'normal').length})
                  </Button>
                  <Button
                    variant={userFilter === 'warning' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setUserFilter('warning'); setUserPage(0); }}
                    className="text-xs"
                  >
                    🟡 Warning ({users.filter(u => u.status === 'warning').length})
                  </Button>
                  <Button
                    variant={userFilter === 'banned' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setUserFilter('banned'); setUserPage(0); }}
                    className="text-xs"
                  >
                    🔴 Banned ({users.filter(u => u.status === 'banned').length})
                  </Button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Register Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(() => {
                    // Filter users based on selected filter
                    const filteredUsers = userFilter === 'all' 
                      ? users 
                      : users.filter(u => (u.status || 'normal') === userFilter);
                    
                    // Calculate pagination
                    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
                    const startIndex = userPage * usersPerPage;
                    const endIndex = startIndex + usersPerPage;
                    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
                    
                    if (users.length === 0 && loading) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                            Loading users...
                          </td>
                        </tr>
                      );
                    }
                    
                    if (filteredUsers.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                            No {userFilter !== 'all' ? userFilter : ''} users found
                          </td>
                        </tr>
                      );
                    }
                    
                    return paginatedUsers.map((user) => {
                      const status = user.status || 'normal';
                      const isUpdating = updatingUser === user.user_seq;
                      
                      return (
                        <tr key={user.user_seq} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm font-medium">
                            {user.user_seq}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {user.user_name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                              {user.country_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {status === 'banned' ? (
                              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                                <XCircle className="h-3 w-3" />
                                Banned
                              </span>
                            ) : status === 'warning' ? (
                              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                                <AlertTriangle className="h-3 w-3" />
                                Warning
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                                <CheckCircle className="h-3 w-3" />
                                Normal
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(user.register_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              {status === 'banned' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUserAction(user.user_seq, 'unban')}
                                  disabled={isUpdating}
                                  className="text-xs h-7"
                                >
                                  {isUpdating ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  )}
                                  Unban
                                </Button>
                              ) : status === 'warning' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUserAction(user.user_seq, 'ban')}
                                  disabled={isUpdating}
                                  className="text-xs h-7 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  {isUpdating ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3 w-3 mr-1" />
                                  )}
                                  Ban
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUserAction(user.user_seq, 'warn')}
                                  disabled={isUpdating}
                                  className="text-xs h-7 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                >
                                  {isUpdating ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                  )}
                                  Warn
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {(() => {
              const filteredUsers = userFilter === 'all' 
                ? users 
                : users.filter(u => (u.status || 'normal') === userFilter);
              const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
              
              if (filteredUsers.length === 0) return null;
              
              return (
                <div className="bg-muted/30 px-4 py-3 border-t border-border flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {userPage * usersPerPage + 1} to {Math.min((userPage + 1) * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage(p => Math.max(0, p - 1))}
                      disabled={userPage === 0}
                      className="text-xs"
                    >
                      <ChevronUp className="h-4 w-4 rotate-[-90deg]" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-3 text-sm">
                      Page {userPage + 1} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={userPage >= totalPages - 1}
                      className="text-xs"
                    >
                      Next
                      <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Typography variant="p" size="sm" color="muted">
                Active Tables
              </Typography>
              <Database className="h-5 w-5 text-muted-foreground" />
            </div>
            <Typography variant="h2" size="2xl" weight="bold">
              {segments.length}
            </Typography>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Typography variant="p" size="sm" color="muted">
                Total Segments
              </Typography>
              <Cpu className="h-5 w-5 text-muted-foreground" />
            </div>
            <Typography variant="h2" size="2xl" weight="bold">
              {segments.reduce((sum, s) => sum + s.segmentCount, 0)}
            </Typography>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Typography variant="p" size="sm" color="muted">
                Total Records
              </Typography>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <Typography variant="h2" size="2xl" weight="bold">
              {segments.reduce((sum, s) => sum + s.totalDocs, 0).toLocaleString()}
            </Typography>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
