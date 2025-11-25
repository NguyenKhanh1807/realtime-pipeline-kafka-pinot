'use client';

import { useState, useEffect } from 'react';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { Input } from '@/src/components/atoms/input';
import { cn } from '@/src/lib/utils';
import { useAuditLogger, AuditCategory, AuditAction } from '@/src/services/audit-logger';
import {
  Search,
  Download,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Shield,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface AuditLogViewerProps {
  className?: string;
  showFilters?: boolean;
  maxHeight?: string;
}

export function AuditLogViewer({
  className,
  showFilters = true,
  maxHeight = '600px'
}: AuditLogViewerProps) {
  const { getLogs, getStatistics, exportLogs } = useAuditLogger();

  const [logs, setLogs] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory | 'all'>('all');
  const [selectedAction, setSelectedAction] = useState<AuditAction | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<'info' | 'warn' | 'error' | 'debug' | 'all'>('all');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });
  const [limit, setLimit] = useState(100);

  const categories: (AuditCategory | 'all')[] = [
    'all', 'authentication', 'authorization', 'fraud_detection', 'transaction_analysis',
    'data_access', 'user_management', 'system', 'security', 'performance', 'api', 'export', 'reporting'
  ];

  const actions: (AuditAction | 'all')[] = [
    'all', 'login', 'logout', 'register', 'transaction_check', 'fraud_alert',
    'data_export', 'report_generation', 'user_create', 'user_update', 'user_delete',
    'api_access', 'query_execution', 'security_violation'
  ];

  const levels = ['all', 'info', 'warn', 'error', 'debug'] as const;

  useEffect(() => {
    loadLogs();
    loadStatistics();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filters: any = {
        limit,
      };

      if (selectedCategory !== 'all') filters.category = selectedCategory;
      if (selectedAction !== 'all') filters.action = selectedAction;
      if (selectedLevel !== 'all') filters.level = selectedLevel;

      if (dateRange.from) {
        filters.fromDate = new Date(dateRange.from).getTime();
      }
      if (dateRange.to) {
        filters.toDate = new Date(dateRange.to).getTime();
      }

      const auditLogs = getLogs(filters);
      setLogs(auditLogs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = () => {
    const stats = getStatistics(24 * 60 * 60 * 1000); // Last 24 hours
    setStatistics(stats);
  };

  const handleExport = () => {
    const data = exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return <User className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'fraud_detection': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-200';
      case 'warn': return 'text-orange-600 bg-orange-50 dark:bg-orange-200';
      case 'debug': return 'text-blue-600 bg-blue-50 dark:bg-blue-200';
      default: return 'text-green-600 bg-green-50 dark:bg-green-200';
    }
  };

  return (
    <div className={cn('bg-card border border-border rounded-lg', className)}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Typography variant="h2" size="xl" weight="semibold" className="text-foreground">
              Audit Logs
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
              Comprehensive activity tracking with OpenTelemetry correlation IDs
            </Typography>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                Total Logs (24h)
              </Typography>
              <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
                {statistics.totalLogs}
              </Typography>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                Authentication
              </Typography>
              <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
                {statistics.logsByCategory.authentication || 0}
              </Typography>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                Fraud Detection
              </Typography>
              <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
                {statistics.logsByCategory.fraud_detection || 0}
              </Typography>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                Errors
              </Typography>
              <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
                {statistics.logsByLevel.error || 0}
              </Typography>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                Search
              </Typography>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                Category
              </Typography>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as AuditCategory | 'all')}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                Level
              </Typography>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {levels.map(level => (
                  <option key={level} value={level}>
                    {level === 'all' ? 'All Levels' : level.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadLogs} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                From Date
              </Typography>
              <Input
                type="datetime-local"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                To Date
              </Typography>
              <Input
                type="datetime-local"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            <div>
              <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                Limit
              </Typography>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value={50}>50 entries</option>
                <option value={100}>100 entries</option>
                <option value={250}>250 entries</option>
                <option value={500}>500 entries</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="overflow-hidden">
        <div style={{ maxHeight }} className="overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <Typography variant="h3" size="lg" color="muted" className="text-muted-foreground">
                No audit logs found
              </Typography>
              <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                Try adjusting your filters or check back later for new activity.
              </Typography>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(log.id)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedLogs.has(log.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>

                      <div className={cn('px-2 py-1 rounded-full text-xs font-medium', getLevelColor(log.level))}>
                        {log.level.toUpperCase()}
                      </div>

                      {getCategoryIcon(log.category)}

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                            {log.action.replace('_', ' ')}
                          </Typography>
                          <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                            on {log.resource}
                          </Typography>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                            {log.userId ? `User: ${log.userId}` : 'System'}
                          </Typography>
                          <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                            •
                          </Typography>
                          <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </Typography>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Typography variant="span" size="xs" className="font-mono text-muted-foreground">
                        {log.correlationId.substring(0, 8)}...
                      </Typography>
                      {log.result && (
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          log.result === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900'
                            : 'bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900'
                        )}>
                          {log.result}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedLogs.has(log.id) && (
                    <div className="mt-4 pl-8 border-l-2 border-muted">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                            Details
                          </Typography>
                          <div className="space-y-1 text-sm">
                            <div><strong>Correlation ID:</strong> <code className="text-xs">{log.correlationId}</code></div>
                            <div><strong>Operation:</strong> {log.operation}</div>
                            <div><strong>Resource ID:</strong> {log.resourceId || 'N/A'}</div>
                            {log.userEmail && <div><strong>Email:</strong> {log.userEmail}</div>}
                          </div>
                        </div>

                        {log.performance && (
                          <div>
                            <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                              Performance
                            </Typography>
                            <div className="space-y-1 text-sm">
                              <div><strong>Duration:</strong> {log.performance.duration}ms</div>
                              {log.performance.databaseQueries && (
                                <div><strong>DB Queries:</strong> {log.performance.databaseQueries}</div>
                              )}
                              {log.performance.externalCalls && (
                                <div><strong>External Calls:</strong> {log.performance.externalCalls}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-4">
                          <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                            Metadata
                          </Typography>
                          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.errorMessage && (
                        <div className="mt-4">
                          <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-2 block">
                            Error
                          </Typography>
                          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-200 p-2 rounded">
                            {log.errorMessage}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
