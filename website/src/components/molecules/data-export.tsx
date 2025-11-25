'use client';

import { useState } from 'react';
import { Button } from '@/src/components/atoms/button';
import { Typography } from '@/src/components/atoms/typography';
import { cn } from '@/src/lib/utils';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
  dateRange: {
    from: string;
    to: string;
  };
  filters: {
    riskLevel?: string[];
    category?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  includeCharts: boolean;
  includeMetadata: boolean;
}

interface DataExportProps {
  onExport: (options: ExportOptions) => Promise<{ success: boolean; downloadUrl?: string; error?: string }>;
  availableFormats?: ('csv' | 'json' | 'pdf' | 'xlsx')[];
  className?: string;
}

export function DataExport({
  onExport,
  availableFormats = ['csv', 'json', 'xlsx', 'pdf'],
  className
}: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportMessage, setExportMessage] = useState('');

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      to: new Date().toISOString().split('T')[0], // Today
    },
    filters: {},
    includeCharts: false,
    includeMetadata: true,
  });

  const formatIcons = {
    csv: FileSpreadsheet,
    json: FileJson,
    pdf: FileText,
    xlsx: FileSpreadsheet,
  };

  const formatLabels = {
    csv: 'CSV (Comma Separated Values)',
    json: 'JSON (JavaScript Object Notation)',
    pdf: 'PDF (Portable Document Format)',
    xlsx: 'Excel (XLSX)',
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('idle');
    setExportMessage('');

    try {
      const result = await onExport(exportOptions);

      if (result.success && result.downloadUrl) {
        // Trigger download
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `fraud-data-export-${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setExportStatus('success');
        setExportMessage('Export completed successfully!');
      } else {
        setExportStatus('error');
        setExportMessage(result.error || 'Export failed');
      }
    } catch (error) {
      setExportStatus('error');
      setExportMessage(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const updateFilters = (key: keyof ExportOptions['filters'], value: any) => {
    setExportOptions(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value,
      },
    }));
  };

  const riskLevels = ['low', 'medium', 'high', 'critical'];
  const categories = ['authentication', 'fraud_detection', 'transaction_analysis', 'security', 'api'];

  return (
    <div className={cn('bg-card border border-border rounded-lg p-6', className)}>
      <div className="mb-6">
        <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-2">
          Data Export
        </Typography>
        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
          Export fraud detection data and reports in various formats
        </Typography>
      </div>

      {/* Export Status */}
      {exportStatus !== 'idle' && (
        <div className={cn(
          'mb-6 p-4 rounded-lg border',
          exportStatus === 'success'
            ? 'bg-green-50 border-green-200 dark:bg-green-200 dark:border-green-400'
            : 'bg-red-50 border-red-200 dark:bg-red-200 dark:border-red-400'
        )}>
          <div className="flex items-center space-x-2">
            {exportStatus === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <Typography variant="span" size="sm" className={
              exportStatus === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
            }>
              {exportMessage}
            </Typography>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-3 block">
            Export Format
          </Typography>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availableFormats.map((format) => {
              const Icon = formatIcons[format];
              return (
                <button
                  key={format}
                  onClick={() => setExportOptions(prev => ({ ...prev, format }))}
                  className={cn(
                    'p-3 border rounded-lg text-left transition-colors',
                    exportOptions.format === format
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Typography variant="span" size="sm" weight="medium" className="text-foreground block">
                        {format.toUpperCase()}
                      </Typography>
                      <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                        {formatLabels[format]}
                      </Typography>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-3 block">
            Date Range
          </Typography>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                From Date
              </label>
              <input
                type="date"
                value={exportOptions.dateRange.from}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, from: e.target.value }
                }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                To Date
              </label>
              <input
                type="date"
                value={exportOptions.dateRange.to}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, to: e.target.value }
                }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div>
          <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-3 block">
            Filters (Optional)
          </Typography>

          {/* Risk Levels */}
          <div className="mb-4">
            <Typography variant="span" size="xs" color="muted" className="text-muted-foreground mb-2 block">
              Risk Levels
            </Typography>
            <div className="flex flex-wrap gap-2">
              {riskLevels.map((level) => (
                <label key={level} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.filters.riskLevel?.includes(level) || false}
                    onChange={(e) => {
                      const current = exportOptions.filters.riskLevel || [];
                      if (e.target.checked) {
                        updateFilters('riskLevel', [...current, level]);
                      } else {
                        updateFilters('riskLevel', current.filter(l => l !== level));
                      }
                    }}
                    className="rounded border border-input"
                  />
                  <Typography variant="span" size="sm" className="capitalize">
                    {level}
                  </Typography>
                </label>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="mb-4">
            <Typography variant="span" size="xs" color="muted" className="text-muted-foreground mb-2 block">
              Categories
            </Typography>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <label key={category} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.filters.category?.includes(category) || false}
                    onChange={(e) => {
                      const current = exportOptions.filters.category || [];
                      if (e.target.checked) {
                        updateFilters('category', [...current, category]);
                      } else {
                        updateFilters('category', current.filter(c => c !== category));
                      }
                    }}
                    className="rounded border border-input"
                  />
                  <Typography variant="span" size="sm" className="capitalize">
                    {category.replace('_', ' ')}
                  </Typography>
                </label>
              ))}
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Min Amount
              </label>
              <input
                type="number"
                placeholder="0"
                value={exportOptions.filters.minAmount || ''}
                onChange={(e) => updateFilters('minAmount', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Max Amount
              </label>
              <input
                type="number"
                placeholder="No limit"
                value={exportOptions.filters.maxAmount || ''}
                onChange={(e) => updateFilters('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>
        </div>

        {/* Additional Options */}
        <div>
          <Typography variant="span" size="sm" weight="medium" className="text-foreground mb-3 block">
            Additional Options
          </Typography>
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeCharts}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  includeCharts: e.target.checked
                }))}
                className="rounded border border-input"
              />
              <Typography variant="span" size="sm">
                Include charts and visualizations (PDF/XLSX only)
              </Typography>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeMetadata}
                onChange={(e) => setExportOptions(prev => ({
                  ...prev,
                  includeMetadata: e.target.checked
                }))}
                className="rounded border border-input"
              />
              <Typography variant="span" size="sm">
                Include export metadata and timestamps
              </Typography>
            </label>
          </div>
        </div>

        {/* Export Button */}
        <div className="pt-4 border-t border-border">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Data ({formatLabels[exportOptions.format]})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
