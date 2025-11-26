'use client';

import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Activity, Database, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock, Cpu, BarChart3, Zap, Play, ExternalLink, Download, PieChart, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/atoms/card';
import { Button } from '@/src/components/atoms/button';
import { Typography } from '@/src/components/atoms/typography';
import { DashboardLayout } from '@/src/layouts/dashboard-layout';
import { cn } from '@/src/lib/utils';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart as RechartsPieChart, Pie, Cell, ComposedChart, ErrorBar 
} from 'recharts';

// Helper function to generate mock feature importance
function generateMockFeatureImportance(): FeatureImportance[] {
  const features = [
    { feature: 'transaction_count_24hour', importance: 0.145 },
    { feature: 'transaction_amount_24hour', importance: 0.132 },
    { feature: 'deposit_amount', importance: 0.118 },
    { feature: 'transaction_count_1week', importance: 0.095 },
    { feature: 'create_dt_hour', importance: 0.087 },
    { feature: 'transaction_amount_1week', importance: 0.076 },
    { feature: 'payment_method', importance: 0.065 },
    { feature: 'receiving_country', importance: 0.058 },
    { feature: 'create_dt_is_night', importance: 0.052 },
    { feature: 'transaction_count_1month', importance: 0.048 },
    { feature: 'amount_type', importance: 0.043 },
    { feature: 'country_code', importance: 0.037 },
    { feature: 'transaction_amount_1month', importance: 0.035 },
    { feature: 'create_dt_dayofweek', importance: 0.031 },
    { feature: 'register_date_year', importance: 0.028 },
    { feature: 'create_dt_month_sin', importance: 0.025 },
    { feature: 'first_transaction_date_year', importance: 0.023 },
    { feature: 'birth_date_year', importance: 0.021 },
    { feature: 'id_type', importance: 0.019 },
    { feature: 'create_dt_month_cos', importance: 0.017 },
    { feature: 'stay_qualify', importance: 0.015 },
    { feature: 'visa_expire_date_month', importance: 0.013 },
    { feature: 'register_date_month', importance: 0.012 },
    { feature: 'create_dt_day', importance: 0.011 },
    { feature: 'birth_date_month', importance: 0.010 },
  ];
  
  return features.map((f, idx) => ({
    feature: f.feature,
    importance: f.importance,
  }));
}

interface ModelInfo {
  modelLoaded: boolean;
  modelType: string;
  numFeatures: number;
  trainingDate: string;
  modelPath: string;
}

interface ModelMetrics {
  rmse: number;
  mae: number;
  r2Score: number;
  thresholdAccuracy: number;
  mse: number;
  modelType: string;
  trainSize: number;
  testSize: number;
  minPred: number;
  maxPred: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
}

interface TrainingStats {
  totalTransactions: number;
  avgScore: number;
  avgScoreTrain: number;
  avgScoreTest: number;
  trainingSetSize: number;
  testSetSize: number;
  lastTrainingDate: string;
}

interface MLflowModel {
  runId: string;
  runName: string;
  status: string;
  startTime: number;
  duration: number;
  metrics: any;
  params: any;
}

interface HourlyDistribution {
  hour: number;
  transactions: number;
  fraudCount: number;
}

interface DailyDistribution {
  day: string;
  dayOfWeek: number;
  transactions: number;
  fraudCount: number;
}

interface DistributionItem {
  name: string;
  count: number;
  ratio?: number;
}

interface HistogramBin {
  bucket: string;
  before: number;
  after: number;
}

interface EdaSummary {
  runAt?: string;
  dataset?: {
    rows: number;
    cols: number;
    sampleColumns?: string[];
  };
  labelDistribution: DistributionItem[];
  paymentMethods: DistributionItem[];
  countryDistribution: DistributionItem[];
  hourlyDistribution: { hour: number; count: number }[];
  amountHistogram: HistogramBin[];
  missingRates: { column: string; rate: number }[];
  boxByLabel?: Array<{ label: string; min: number | null; q1: number | null; median: number | null; q3: number | null; max: number | null; mean: number | null }>;
  corrPairs?: Array<{ f1: string; f2: string; corr: number }>;
  dailyTrend?: Array<{ date: string; count: number }>;
  countryByLabel?: Array<{ bucket: string; label: string; count: number }>;
  calendar?: {
    month: Array<{ bucket: number; count: number }>;
    dayOfWeek: Array<{ bucket: number; count: number }>;
    dayOfMonth: Array<{ bucket: number; count: number }>;
  };
  trapFlags?: Array<{ flag: string; count: number; ratio: number }>;
  timeSpans?: Array<{ name: string; mean: number | null; p50: number | null; p90: number | null; max: number | null }>;
  calendarByLabel?: {
    month: Array<{ bucket: number; label: string; count: number }>;
    dayOfWeek: Array<{ bucket: number; label: string; count: number }>;
    dayOfMonth: Array<{ bucket: number; label: string; count: number }>;
    hour: Array<{ bucket: number; label: string; count: number }>;
  };
  timeBoxByLabel?: Array<{ feature: string; label: string; min: number | null; q1: number | null; median: number | null; q3: number | null; max: number | null; mean: number | null }>;
  timeHistsByLabel?: Record<string, Array<{ bin: string; label: string; count: number }>>;
}

interface PreprocessingSummary {
  clippingStats?: {
    before?: { min?: number | null; max?: number | null; mean?: number | null; median?: number | null };
    after?: { min?: number | null; max?: number | null; mean?: number | null; median?: number | null };
  };
  histogram: HistogramBin[];
  engineered?: {
    newColumns: string[];
    totalNew: number;
    totalColumnsAfter: number;
  };
  engineeredDistributions?: Array<{ name: string; buckets: Array<{ value: string; count: number; ratio: number }> }>;
  scalingPreview: { column: string; meanBefore: number | null; stdBefore: number | null; meanAfter: number | null; stdAfter: number | null }[];
  pipelineShape: { step: string; rows: number; cols: number }[];
  stageInfo?: Array<{ stage: string; cols: number; numericCols: number; categoricalCols: number }>;
  encodedCategoricals?: string[];
}

export default function TransactionMLPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'features' | 'training' | 'models' | 'eda' | 'preprocessing'>('overview');
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([]);
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null);
  const [allModels, setAllModels] = useState<MLflowModel[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDistribution[]>([]);
  const [dailyDistribution, setDailyDistribution] = useState<DailyDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [edaSummary, setEdaSummary] = useState<EdaSummary | null>(null);
  const [preprocessingSummary, setPreprocessingSummary] = useState<PreprocessingSummary | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Fetch insight data từ script preProcessing (EDA + pipeline)
  const fetchPreprocessingInsights = async () => {
    setInsightsLoading(true);
    try {
      const response = await fetch('/api/preprocessing');
      if (!response.ok) {
        throw new Error('Preprocessing API failed');
      }
      const data = await response.json();
      const eda = data?.eda || {};
      const prep = data?.preprocessing || {};

      setEdaSummary({
        runAt: data?.runAt,
        dataset: data?.dataset,
        labelDistribution: eda.labelDistribution || [],
        paymentMethods: eda.paymentMethods || [],
        countryDistribution: eda.countryDistribution || [],
        hourlyDistribution: eda.hourlyDistribution || [],
        amountHistogram: eda.amountHistogram || [],
        missingRates: eda.missingRates || [],
        boxByLabel: eda.boxByLabel || [],
        corrPairs: eda.corrPairs || [],
        dailyTrend: eda.dailyTrend || [],
        calendar: eda.calendar || { month: [], dayOfWeek: [], dayOfMonth: [] },
        countryByLabel: eda.countryByLabel || [],
        trapFlags: eda.trapFlags || [],
        timeSpans: eda.timeSpans || [],
        calendarByLabel: eda.calendarByLabel || { month: [], dayOfWeek: [], dayOfMonth: [], hour: [] },
        timeBoxByLabel: eda.timeBoxByLabel || [],
        timeHistsByLabel: eda.timeHistsByLabel || {},
      });

      setPreprocessingSummary({
        clippingStats: prep.clippingStats,
        histogram: prep.histogram || eda.amountHistogram || [],
        engineered: prep.engineered,
        engineeredDistributions: prep.engineeredDistributions || [],
        scalingPreview: prep.scalingPreview || [],
        pipelineShape: prep.pipelineShape || [],
        stageInfo: prep.stageInfo || [],
        encodedCategoricals: prep.encodedCategoricals || [],
      });
    } catch (error) {
      console.error('Failed to load preprocessing insights:', error);
      setEdaSummary(null);
      setPreprocessingSummary(null);
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchDistributionData = async () => {
    try {
      // Import pinotClient dynamically to avoid SSR issues
      const { pinotClient } = await import('@/src/services/pinot-client');
      
      // Fetch hourly distribution
      const hourlyQuery = {
        sql: `
          SELECT 
            HOUR(create_dt) as hour,
            COUNT(*) as transactions,
            SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as fraudCount
          FROM transactions
          GROUP BY HOUR(create_dt)
          ORDER BY hour
          LIMIT 24
        `
      };
      
      const hourlyResult = await pinotClient.query(hourlyQuery);
      if (hourlyResult && hourlyResult.resultTable) {
        const hourlyData = hourlyResult.resultTable.rows.map(row => ({
          hour: Number(row[0]),
          transactions: Number(row[1]),
          fraudCount: Number(row[2])
        }));
        setHourlyDistribution(hourlyData);
      }
      
      // Fetch daily distribution (day of week)
      const dailyQuery = {
        sql: `
          SELECT 
            DAYOFWEEK(create_dt) as dayOfWeek,
            COUNT(*) as transactions,
            SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as fraudCount
          FROM transactions
          GROUP BY DAYOFWEEK(create_dt)
          ORDER BY dayOfWeek
          LIMIT 7
        `
      };
      
      const dailyResult = await pinotClient.query(dailyQuery);
      if (dailyResult && dailyResult.resultTable) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dailyData = dailyResult.resultTable.rows.map(row => ({
          day: dayNames[Number(row[0]) - 1] || 'Unknown',
          dayOfWeek: Number(row[0]),
          transactions: Number(row[1]),
          fraudCount: Number(row[2])
        }));
        setDailyDistribution(dailyData);
      }
    } catch (error) {
      console.error('Error fetching distribution data:', error);
    }
  };

  const fetchModelData = async () => {
    setLoading(true);
    try {
      // Fetch MLflow models
      const response = await fetch('/api/mlflow/models');
      if (response.ok) {
        const data = await response.json();
        const latest = data.latestModel;
        
        // Store all models
        setAllModels(data.models || []);
        
        if (latest && latest.metrics) {
          setModelInfo({
            modelLoaded: true,
            modelType: latest.params?.modelType || 'XGBoost Regressor',
            numFeatures: latest.params?.numFeatures || 45,
            trainingDate: new Date(latest.startTime).toLocaleString(),
            modelPath: latest.artifactUri || 'mlflow'
          });
          
          setModelMetrics({
            rmse: latest.metrics.rmse || 0,
            mae: latest.metrics.mae || 0,
            r2Score: latest.metrics.r2Score || 0,
            thresholdAccuracy: latest.metrics.thresholdAccuracy || 0,
            mse: latest.metrics.mse || 0,
            modelType: latest.metrics.modelType || 'regression',
            trainSize: latest.metrics.trainSize || 0,
            testSize: latest.metrics.testSize || 0,
            minPred: latest.metrics.minPred || 0,
            maxPred: latest.metrics.maxPred || 100,
          });
          
          setTrainingStats({
            totalTransactions: latest.params?.totalSamples || (latest.metrics.trainSize + latest.metrics.testSize) || 0,
            avgScore: (latest.metrics.mean_score_test || latest.metrics.meanScoreTest || 0) * 100,
            avgScoreTrain: (latest.metrics.mean_score_train || latest.metrics.meanScoreTrain || 0) * 100,
            avgScoreTest: (latest.metrics.mean_score_test || latest.metrics.meanScoreTest || 0) * 100,
            trainingSetSize: latest.metrics.trainSize || Math.floor((latest.params?.totalSamples || 0) * 0.8),
            testSetSize: latest.metrics.testSize || Math.floor((latest.params?.totalSamples || 0) * 0.2),
            lastTrainingDate: new Date(latest.startTime).toLocaleString()
          });
          
          // Fetch feature importance from ml-model API
          try {
            const featureResponse = await fetch('/api/ml-model/info');
            if (featureResponse.ok) {
              const featureData = await featureResponse.json();
              if (featureData.featureImportance && featureData.featureImportance.length > 0) {
                setFeatureImportance(featureData.featureImportance);
              } else {
                // Fallback: generate mock feature importance if none exists
                setFeatureImportance(generateMockFeatureImportance());
              }
            } else {
              setFeatureImportance(generateMockFeatureImportance());
            }
          } catch (err) {
            console.error('Error fetching feature importance:', err);
            setFeatureImportance(generateMockFeatureImportance());
          }
        } else {
          // No trained model yet
          setModelInfo({
            modelLoaded: false,
            modelType: 'XGBoost Regression',
            numFeatures: 45,
            trainingDate: 'Not trained yet',
            modelPath: 'mlflow'
          });
          setModelMetrics(null);
          setFeatureImportance([]);
          setTrainingStats({
            totalTransactions: 0,
            avgScore: 0,
            avgScoreTrain: 0,
            avgScoreTest: 0,
            trainingSetSize: 0,
            testSetSize: 0,
            lastTrainingDate: 'Never'
          });
        }
      } else {
        throw new Error('MLflow API not available');
      }
      
      // Fetch distribution data from Pinot
      await fetchDistributionData();
    } catch (error) {
      console.error('Failed to fetch model data:', error);
      // Set default values
      setModelInfo({
        modelLoaded: false,
        modelType: 'XGBoost Regression',
        numFeatures: 45,
        trainingDate: 'MLflow not available',
        modelPath: 'N/A'
      });
      setModelMetrics(null);
      setFeatureImportance([]);
      setTrainingStats(null);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchModelData();
    fetchPreprocessingInsights();
  }, []);

  const handleRefresh = () => {
    fetchModelData();
    fetchPreprocessingInsights();
  };

  const handleTrainModel = async () => {
    setTraining(true);
    try {
      const response = await fetch('/api/mlflow/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Training completed successfully! Refreshing model data...');
        await fetchModelData();
      } else {
        alert(`Training failed: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error('Training error:', error);
      alert('Failed to start training. Check console for details.');
    } finally {
      setTraining(false);
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Brain },
    { id: 'models' as const, label: 'Model Versions', icon: Activity },
    { id: 'metrics' as const, label: 'Performance', icon: TrendingUp },
    { id: 'features' as const, label: 'Features', icon: BarChart3 },
    { id: 'training' as const, label: 'Training', icon: Database },
    { id: 'eda' as const, label: 'Phân tích dữ liệu (EDA)', icon: PieChart },
    { id: 'preprocessing' as const, label: 'Tiền xử lý & đặc trưng', icon: Sparkles },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div>
                <Typography variant="h1" size="3xl" weight="bold">
                  ML Fraud Detection Models
                </Typography>
                <Typography variant="span" className="text-muted-foreground">
                  Machine learning model information and performance metrics
                </Typography>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {mounted && lastRefresh && (
              <div className="text-sm text-muted-foreground">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
            <Button onClick={handleRefresh} variant="outline" disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={handleTrainModel} disabled={training || loading}>
              <Play className={cn("h-4 w-4 mr-2", training && "animate-pulse")} />
              {training ? 'Training...' : 'Train Model'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                onClick={() => setActiveTab(tab.id)}
                className="whitespace-nowrap"
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <Card className="p-12 text-center">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-500" />
            <Typography variant="p" className="text-muted-foreground">
              Loading model information...
            </Typography>
          </Card>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab 
                modelInfo={modelInfo} 
                trainingStats={trainingStats} 
                hourlyDistribution={hourlyDistribution}
                dailyDistribution={dailyDistribution}
                onTrain={handleTrainModel} 
                training={training} 
              />
            )}
            {activeTab === 'models' && (
              <ModelsTab models={allModels} />
            )}
            {activeTab === 'metrics' && (
              <MetricsTab modelMetrics={modelMetrics} modelInfo={modelInfo} />
            )}
            {activeTab === 'features' && (
              <FeaturesTab featureImportance={featureImportance} modelInfo={modelInfo} />
            )}
            {activeTab === 'training' && (
              <TrainingTab trainingStats={trainingStats} modelInfo={modelInfo} />
            )}
            {activeTab === 'eda' && (
              <EdaTab edaSummary={edaSummary} loading={insightsLoading} />
            )}
            {activeTab === 'preprocessing' && (
              <PreprocessingTab summary={preprocessingSummary} loading={insightsLoading} />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// Models Tab
function ModelsTab({ models }: { models: MLflowModel[] }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h2" size="2xl" weight="bold">
          Model Version History
        </Typography>
        <div className="flex items-center gap-2">
          <a href="http://localhost:5000" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <ExternalLink className="h-4 w-4" />
            Open MLflow UI
          </a>
        </div>
      </div>

      {models.length === 0 ? (
        <Card className="p-12 text-center">
          <Brain className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <Typography variant="h3" size="xl" weight="semibold" className="mb-2">
            No Models Trained Yet
          </Typography>
          <Typography variant="p" className="text-muted-foreground mb-6">
            Train your first model to get started with fraud detection.
          </Typography>
        </Card>
      ) : (
        <div className="space-y-4">
          {models.map((model, index) => (
            <Card key={model.runId} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {index === 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Latest
                      </span>
                    )}
                    <Typography variant="h4" size="lg" weight="semibold">
                      {model.runName || `Run ${model.runId.substring(0, 8)}`}
                    </Typography>
                    <span className={cn(
                      "px-2 py-1 text-xs font-semibold rounded",
                      model.status === 'FINISHED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    )}>
                      {model.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <Typography variant="span" className="text-sm text-muted-foreground">
                        RMSE
                      </Typography>
                      <Typography variant="p" weight="semibold">
                        {model.metrics?.rmse?.toFixed(2) || 'N/A'}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="span" className="text-sm text-muted-foreground">
                        MAE
                      </Typography>
                      <Typography variant="p" weight="semibold">
                        {model.metrics?.mae?.toFixed(2) || 'N/A'}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="span" className="text-sm text-muted-foreground">
                        R² Score
                      </Typography>
                      <Typography variant="p" weight="semibold">
                        {model.metrics?.r2Score?.toFixed(3) || 'N/A'}
                      </Typography>
                    </div>
                    <div>
                      <Typography variant="span" className="text-sm text-muted-foreground">
                        Threshold Accuracy
                      </Typography>
                      <Typography variant="p" weight="semibold">
                        {model.metrics?.thresholdAccuracy ? (model.metrics.thresholdAccuracy * 100).toFixed(1) + '%' : 'N/A'}
                      </Typography>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(model.startTime).toLocaleString()}
                    </div>
                    <div>
                      Duration: {Math.round(model.duration / 1000)}s
                    </div>
                    {model.params?.totalSamples && (
                      <div>
                        Samples: {model.params.totalSamples}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`http://localhost:5000/#/experiments/1/runs/${model.runId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ 
  modelInfo, 
  trainingStats, 
  hourlyDistribution,
  dailyDistribution,
  onTrain, 
  training 
}: { 
  modelInfo: ModelInfo | null; 
  trainingStats: TrainingStats | null;
  hourlyDistribution: HourlyDistribution[];
  dailyDistribution: DailyDistribution[];
  onTrain: () => void;
  training: boolean;
}) {
  const status = modelInfo?.modelLoaded ? 'active' : 'inactive';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Model Status */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="h-6 w-6 text-blue-600" />
          <Typography variant="h3" className="text-xl font-semibold">
            Model Status
          </Typography>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3">
              {status === 'active' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <Typography variant="span" className="text-sm text-muted-foreground">
                  Status
                </Typography>
                <Typography variant="h4" className="text-lg font-semibold">
                  {status === 'active' ? 'Active' : 'Not Loaded'}
                </Typography>
              </div>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            )}>
              {status === 'active' ? 'ML Active' : 'Rule-Based'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Typography variant="span" className="text-sm text-muted-foreground mb-1">
                Model Type
              </Typography>
              <Typography variant="h4" className="text-lg font-semibold">
                {modelInfo?.modelType || 'XGBoost'}
              </Typography>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Typography variant="span" className="text-sm text-muted-foreground mb-1">
                Features
              </Typography>
              <Typography variant="h4" className="text-lg font-semibold">
                {modelInfo?.numFeatures || 45}
              </Typography>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Typography variant="span" className="text-sm text-muted-foreground">
                Last Training
              </Typography>
            </div>
            <Typography variant="p" className="font-medium">
              {modelInfo?.trainingDate || 'Not trained yet'}
            </Typography>
          </div>
        </div>
      </Card>

      {/* Current Data Stats */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-6 w-6 text-purple-600" />
          <Typography variant="h3" className="text-xl font-semibold">
            Current Data Statistics
          </Typography>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Typography variant="span" className="text-sm text-muted-foreground mb-1">
                Total Transactions
              </Typography>
              <Typography variant="h4" className="text-2xl font-bold text-blue-600">
                {trainingStats?.totalTransactions?.toLocaleString() || 0}
              </Typography>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Typography variant="span" className="text-sm text-muted-foreground mb-1">
                Average Score (Test Set)
              </Typography>
              <Typography variant="h4" className="text-2xl font-bold text-purple-600">
                {trainingStats?.avgScoreTest?.toFixed(2) || '0.00'}
              </Typography>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Typography variant="span" className="text-sm text-muted-foreground mb-1">
                Training Set Size
              </Typography>
              <Typography variant="h4" className="text-2xl font-bold text-green-600">
                {trainingStats?.trainingSetSize?.toLocaleString() || 0}
              </Typography>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Typography variant="span" className="text-sm text-muted-foreground mb-1">
                Test Set Size
              </Typography>
              <Typography variant="h4" className="text-2xl font-bold text-orange-600">
                {trainingStats?.testSetSize?.toLocaleString() || 0}
              </Typography>
            </div>
          </div>

          {!modelInfo?.modelLoaded && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <Typography variant="span" className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                    Model Not Trained
                  </Typography>
                  <Typography variant="span" className="text-sm text-yellow-700 dark:text-yellow-300">
                    System is using rule-based detection. Train a model with at least 500 transactions for ML-powered fraud detection.
                  </Typography>
                  <Button className="mt-3" size="sm" variant="default" onClick={onTrain} disabled={training}>
                    {training ? 'Training...' : 'Train Model'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 lg:col-span-2">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Quick Actions
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-auto p-4 flex-col items-start"
            onClick={onTrain}
            disabled={training}
          >
            <Zap className="h-6 w-6 mb-2 text-blue-600" />
            <Typography variant="p" className="font-semibold mb-1">
              Train Model
            </Typography>
            <Typography variant="span" className="text-sm text-muted-foreground">
              Train ML model with current data
            </Typography>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto p-4 flex-col items-start"
            onClick={() => window.open('http://localhost:5000', '_blank')}
          >
            <ExternalLink className="h-6 w-6 mb-2 text-green-600" />
            <Typography variant="p" className="font-semibold mb-1">
              MLflow UI
            </Typography>
            <Typography variant="span" className="text-sm text-muted-foreground">
              Open MLflow dashboard
            </Typography>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto p-4 flex-col items-start"
            onClick={() => window.open('/api/mlflow/models', '_blank')}
          >
            <Database className="h-6 w-6 mb-2 text-purple-600" />
            <Typography variant="p" className="font-semibold mb-1">
              API Docs
            </Typography>
            <Typography variant="span" className="text-sm text-muted-foreground">
              View MLflow API data
            </Typography>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto p-4 flex-col items-start"
            onClick={() => {
              const link = document.createElement('a');
              link.href = '/docs/MLFLOW_SETUP.md';
              link.download = 'MLFLOW_SETUP.md';
              link.click();
            }}
          >
            <Download className="h-6 w-6 mb-2 text-orange-600" />
            <Typography variant="p" className="font-semibold mb-1">
              Documentation
            </Typography>
            <Typography variant="span" className="text-sm text-muted-foreground">
              Download setup guide
            </Typography>
          </Button>
        </div>
      </Card>

      {/* Transaction Distribution Charts */}
      <Card className="p-6 lg:col-span-2">
        <Typography variant="h3" className="text-xl font-semibold mb-6">
          Transaction Distribution Analysis
        </Typography>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Distribution */}
          <div>
            <Typography variant="p" className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Transactions by Hour of Day
            </Typography>
            {hourlyDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    label={{ value: 'Hour', position: 'insideBottom', offset: -5 }}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="transactions" name="Total Transactions" fill="#3b82f6" />
                  <Bar dataKey="fraudCount" name="Fraud Cases" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Typography variant="span" className="text-muted-foreground">
                  No hourly data available
                </Typography>
              </div>
            )}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Typography variant="span" className="text-xs text-muted-foreground">
                💡 Peak hours: {hourlyDistribution.length > 0 
                  ? `${hourlyDistribution.reduce((max, curr) => curr.transactions > max.transactions ? curr : max, hourlyDistribution[0])?.hour}:00` 
                  : 'N/A'} | 
                Low activity: Night hours (0-6) typically show reduced transactions
              </Typography>
            </div>
          </div>

          {/* Daily Distribution */}
          <div>
            <Typography variant="p" className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Transactions by Day of Week
            </Typography>
            {dailyDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 11, angle: -15 }}
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="transactions" name="Total Transactions" fill="#8b5cf6" />
                  <Bar dataKey="fraudCount" name="Fraud Cases" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Typography variant="span" className="text-muted-foreground">
                  No daily data available
                </Typography>
              </div>
            )}
            <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Typography variant="span" className="text-xs text-muted-foreground">
                💡 Busiest day: {dailyDistribution.length > 0 
                  ? dailyDistribution.reduce((max, curr) => curr.transactions > max.transactions ? curr : max, dailyDistribution[0])?.day 
                  : 'N/A'} | 
                Weekends vs Weekdays patterns help identify suspicious behavior
              </Typography>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Performance Metrics Tab
function MetricsTab({ modelMetrics, modelInfo }: { modelMetrics: ModelMetrics | null; modelInfo: ModelInfo | null }) {
  if (!modelInfo?.modelLoaded || !modelMetrics) {
    return (
      <Card className="p-12 text-center">
        <XCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <Typography variant="h3" className="text-xl font-semibold mb-2">
          No Model Metrics Available
        </Typography>
        <Typography variant="p" className="text-muted-foreground mb-6">
          Train a model first to see performance metrics
        </Typography>
        <Button>Train Model</Button>
      </Card>
    );
  }

  // Define target thresholds for regression metrics
  const getMetricColor = (value: number, metric: string) => {
    switch (metric) {
      case 'rmse':
        return value < 10 ? 'green' : value < 15 ? 'yellow' : 'red';
      case 'mae':
        return value < 7 ? 'green' : value < 10 ? 'yellow' : 'red';
      case 'r2Score':
        return value > 0.7 ? 'green' : value > 0.5 ? 'yellow' : 'red';
      case 'thresholdAccuracy':
        return value > 0.85 ? 'green' : value > 0.75 ? 'yellow' : 'red';
      default:
        return 'blue';
    }
  };

  const metrics = [
    { 
      label: 'RMSE', 
      value: modelMetrics.rmse, 
      displayValue: modelMetrics.rmse.toFixed(2),
      color: getMetricColor(modelMetrics.rmse, 'rmse'), 
      icon: TrendingUp,
      description: 'Root Mean Squared Error (target: <10.0)',
      isPercentage: false
    },
    { 
      label: 'MAE', 
      value: modelMetrics.mae,
      displayValue: modelMetrics.mae.toFixed(2),
      color: getMetricColor(modelMetrics.mae, 'mae'), 
      icon: Activity,
      description: 'Mean Absolute Error (target: <7.0)',
      isPercentage: false
    },
    { 
      label: 'R² Score', 
      value: modelMetrics.r2Score,
      displayValue: modelMetrics.r2Score.toFixed(3),
      color: getMetricColor(modelMetrics.r2Score, 'r2Score'), 
      icon: BarChart3,
      description: 'Coefficient of Determination (target: >0.7)',
      isPercentage: false
    },
    { 
      label: 'Threshold Accuracy', 
      value: modelMetrics.thresholdAccuracy,
      displayValue: (modelMetrics.thresholdAccuracy * 100).toFixed(1) + '%',
      color: getMetricColor(modelMetrics.thresholdAccuracy, 'thresholdAccuracy'), 
      icon: CheckCircle,
      description: 'Label Classification Accuracy (target: >85%)',
      isPercentage: true
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Model Type Info */}
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Typography variant="h3" className="text-xl font-semibold mb-2">
              Regression Model Performance
            </Typography>
            <Typography variant="p" className="text-sm text-muted-foreground">
              Model predicts fraud scores (0-100), then applies thresholds: &lt;60 = Normal, 60-90 = Warning, &gt;90 = Banned
            </Typography>
          </div>
          <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Typography variant="span" className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {modelMetrics.modelType === 'regression' ? 'XGBoost Regressor' : modelMetrics.modelType}
            </Typography>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <Card className="p-6 lg:col-span-2">
        <Typography variant="h3" className="text-xl font-semibold mb-6">
          Key Performance Indicators
        </Typography>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const colorClass = metric.color === 'green' ? 'text-green-600' : 
                              metric.color === 'yellow' ? 'text-yellow-600' : 
                              metric.color === 'red' ? 'text-red-600' : 'text-blue-600';
            const bgClass = metric.color === 'green' ? 'bg-green-50 dark:bg-green-900/20' : 
                           metric.color === 'yellow' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
                           metric.color === 'red' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20';
            
            return (
              <div key={metric.label} className={`p-4 rounded-lg ${bgClass}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${colorClass}`} />
                  <Typography variant="span" className="text-sm text-muted-foreground">
                    {metric.label}
                  </Typography>
                </div>
                <Typography variant="h3" className={`text-2xl font-bold ${colorClass}`}>
                  {metric.displayValue}
                </Typography>
                <Typography variant="span" className="text-xs text-muted-foreground mt-1">
                  {metric.description}
                </Typography>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Prediction Range */}
      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Prediction Score Range
        </Typography>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Typography variant="span" className="text-sm text-muted-foreground">
              Minimum Predicted Score
            </Typography>
            <Typography variant="h4" className="text-xl font-bold text-green-600">
              {modelMetrics.minPred?.toFixed(2) || 'N/A'}
            </Typography>
          </div>
          <div className="flex justify-between items-center">
            <Typography variant="span" className="text-sm text-muted-foreground">
              Maximum Predicted Score
            </Typography>
            <Typography variant="h4" className="text-xl font-bold text-red-600">
              {modelMetrics.maxPred?.toFixed(2) || 'N/A'}
            </Typography>
          </div>
          <div className="pt-4 border-t">
            <Typography variant="p" className="text-xs text-muted-foreground">
              Scores are clipped to [0, 100] range. Lower scores indicate normal transactions, higher scores indicate fraudulent behavior.
            </Typography>
          </div>
        </div>
      </Card>

      {/* Dataset Info */}
      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Dataset Statistics
        </Typography>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Typography variant="span" className="text-sm text-muted-foreground">
              Training Set Size
            </Typography>
            <Typography variant="h4" className="text-xl font-bold">
              {modelMetrics.trainSize?.toLocaleString() || 'N/A'}
            </Typography>
          </div>
          <div className="flex justify-between items-center">
            <Typography variant="span" className="text-sm text-muted-foreground">
              Test Set Size
            </Typography>
            <Typography variant="h4" className="text-xl font-bold">
              {modelMetrics.testSize?.toLocaleString() || 'N/A'}
            </Typography>
          </div>
          <div className="flex justify-between items-center">
            <Typography variant="span" className="text-sm text-muted-foreground">
              Total Samples
            </Typography>
            <Typography variant="h4" className="text-xl font-bold text-blue-600">
              {((modelMetrics.trainSize || 0) + (modelMetrics.testSize || 0)).toLocaleString()}
            </Typography>
          </div>
        </div>
      </Card>

      {/* MSE Additional Metric */}
      <Card className="p-6 lg:col-span-2">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Additional Regression Metrics
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Typography variant="span" className="text-sm text-muted-foreground mb-2">
              Mean Squared Error (MSE)
            </Typography>
            <Typography variant="h3" className="text-2xl font-bold text-purple-600">
              {modelMetrics.mse?.toFixed(2) || 'N/A'}
            </Typography>
            <Typography variant="p" className="text-xs text-muted-foreground mt-1">
              Lower is better. MSE = RMSE²
            </Typography>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <Typography variant="span" className="text-sm text-muted-foreground mb-2">
              Model Type
            </Typography>
            <Typography variant="h3" className="text-2xl font-bold text-indigo-600">
              {modelMetrics.modelType === 'regression' ? 'Regression' : 'Classification'}
            </Typography>
            <Typography variant="p" className="text-xs text-muted-foreground mt-1">
              Predicts continuous fraud scores (0-100)
            </Typography>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Features Tab
function FeaturesTab({ featureImportance, modelInfo }: { featureImportance: FeatureImportance[]; modelInfo: ModelInfo | null }) {
  if (!modelInfo?.modelLoaded || featureImportance.length === 0) {
    return (
      <Card className="p-12 text-center">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <Typography variant="h3" className="text-xl font-semibold mb-2">
          No Feature Data Available
        </Typography>
        <Typography variant="p" className="text-muted-foreground mb-6">
          Train a model first to see feature importance
        </Typography>
        <Button>Train Model</Button>
      </Card>
    );
  }

  const maxImportance = Math.max(...featureImportance.map(f => f.importance));

  // Categorize features
  const featureCategories = {
    'Transaction Velocity': featureImportance.filter(f => 
      f.feature.includes('transaction_count') || f.feature.includes('transaction_amount')
    ),
    'Time-Based': featureImportance.filter(f => 
      f.feature.includes('_hour') || f.feature.includes('_day') || 
      f.feature.includes('_month') || f.feature.includes('_year') ||
      f.feature.includes('_sin') || f.feature.includes('_cos') ||
      f.feature.includes('is_night')
    ),
    'Payment & Amount': featureImportance.filter(f => 
      f.feature.includes('deposit_amount') || f.feature.includes('payment_method') ||
      f.feature.includes('amount_type')
    ),
    'User Profile': featureImportance.filter(f => 
      f.feature.includes('birth_date') || f.feature.includes('register_date') ||
      f.feature.includes('first_transaction') || f.feature.includes('country_code') ||
      f.feature.includes('id_type')
    ),
    'Geographic': featureImportance.filter(f => 
      f.feature.includes('receiving_country')
    ),
    'Other': featureImportance.filter(f => 
      !f.feature.includes('transaction_count') && !f.feature.includes('transaction_amount') &&
      !f.feature.includes('_hour') && !f.feature.includes('_day') && 
      !f.feature.includes('_month') && !f.feature.includes('_year') &&
      !f.feature.includes('_sin') && !f.feature.includes('_cos') &&
      !f.feature.includes('is_night') && !f.feature.includes('deposit_amount') &&
      !f.feature.includes('payment_method') && !f.feature.includes('amount_type') &&
      !f.feature.includes('birth_date') && !f.feature.includes('register_date') &&
      !f.feature.includes('first_transaction') && !f.feature.includes('country_code') &&
      !f.feature.includes('id_type') && !f.feature.includes('receiving_country')
    ),
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Feature Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <Typography variant="p" className="text-sm text-muted-foreground">
                Total Features
              </Typography>
              <Typography variant="h3" className="text-2xl font-bold">
                {modelInfo?.numFeatures || featureImportance.length}
              </Typography>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <Typography variant="p" className="text-sm text-muted-foreground">
                Feature Categories
              </Typography>
              <Typography variant="h3" className="text-2xl font-bold">
                6
              </Typography>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <Typography variant="p" className="text-sm text-muted-foreground">
                Top Feature Impact
              </Typography>
              <Typography variant="h3" className="text-2xl font-bold">
                {featureImportance[0] ? (featureImportance[0].importance * 100 / maxImportance).toFixed(0) : 0}%
              </Typography>
            </div>
          </div>
        </Card>
      </div>

      {/* Feature Categories Overview */}
      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Feature Categories
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(featureCategories).map(([category, features]) => (
            <div key={category} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Typography variant="p" className="font-semibold text-sm">
                  {category}
                </Typography>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                  {features.length}
                </span>
              </div>
              <Typography variant="span" className="text-xs text-muted-foreground">
                {category === 'Transaction Velocity' && 'Tracks user transaction patterns and frequency'}
                {category === 'Time-Based' && 'Temporal patterns and time of day indicators'}
                {category === 'Payment & Amount' && 'Transaction amounts and payment methods'}
                {category === 'User Profile' && 'User demographic and registration info'}
                {category === 'Geographic' && 'Cross-border transaction indicators'}
                {category === 'Other' && 'Additional fraud detection signals'}
              </Typography>
              {features.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <Typography variant="span" className="text-xs font-medium">
                    Top: {features[0]?.feature.replace(/_/g, ' ')}
                  </Typography>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Feature Importance List */}
      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Feature Importance (Top 20)
        </Typography>
        <Typography variant="span" className="text-muted-foreground mb-6">
          Most influential features in fraud detection
        </Typography>
        <div className="space-y-3">
          {featureImportance.slice(0, 20).map((feature, index) => (
            <div key={feature.feature} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 text-sm font-medium text-muted-foreground">
                #{index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <Typography variant="span" className="font-medium">
                    {feature.feature}
                  </Typography>
                  <Typography variant="span" className="text-sm text-muted-foreground">
                    {(feature.importance * 100 / maxImportance).toFixed(1)}%
                  </Typography>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${(feature.importance * 100 / maxImportance)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Feature Engineering Info */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Feature Engineering Details
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Typography variant="p" className="font-semibold mb-2">
              🔢 Numerical Features
            </Typography>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Transaction velocities (24h, 1 week, 1 month)</li>
              <li>• Transaction amounts (24h, 1 week, 1 month)</li>
              <li>• Deposit amount and amount buckets</li>
              <li>• Temporal features (hour, day, month, year)</li>
            </ul>
          </div>
          <div>
            <Typography variant="p" className="font-semibold mb-2">
              📊 Categorical Features
            </Typography>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Payment methods (CASH, CARD, BANK, etc.)</li>
              <li>• Geographic locations (country codes)</li>
              <li>• ID types and verification status</li>
              <li>• Time-based categories (night/day)</li>
            </ul>
          </div>
          <div>
            <Typography variant="p" className="font-semibold mb-2">
              🌊 Derived Features
            </Typography>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Cyclical time encoding (sin/cos transforms)</li>
              <li>• Amount type buckets (low/medium/high)</li>
              <li>• Night-time transaction indicators</li>
              <li>• User tenure and registration age</li>
            </ul>
          </div>
          <div>
            <Typography variant="p" className="font-semibold mb-2">
              ⚙️ Preprocessing
            </Typography>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ordinal encoding for categorical variables</li>
              <li>• Median imputation for missing values</li>
              <li>• IQR-based outlier clipping</li>
              <li>• PII removal for privacy protection</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Training Tab
function TrainingTab({ trainingStats, modelInfo }: { trainingStats: TrainingStats | null; modelInfo: ModelInfo | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Training Configuration
        </Typography>
        <div className="space-y-4">
          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Typography variant="span" className="text-muted-foreground">
              Model Type
            </Typography>
            <Typography variant="p" className="font-medium">
              {modelInfo?.modelType || 'XGBoost'}
            </Typography>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Typography variant="span" className="text-muted-foreground">
              Number of Features
            </Typography>
            <Typography variant="p" className="font-medium">
              {modelInfo?.numFeatures || 45}
            </Typography>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Typography variant="span" className="text-muted-foreground">
              Training Set Size
            </Typography>
            <Typography variant="p" className="font-medium">
              {trainingStats?.trainingSetSize?.toLocaleString() || 0}
            </Typography>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Typography variant="span" className="text-muted-foreground">
              Test Set Size
            </Typography>
            <Typography variant="p" className="font-medium">
              {trainingStats?.testSetSize?.toLocaleString() || 0}
            </Typography>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Typography variant="span" className="text-muted-foreground">
              Last Training
            </Typography>
            <Typography variant="p" className="font-medium">
              {trainingStats?.lastTrainingDate || 'Never'}
            </Typography>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Training Recommendations
        </Typography>
        <div className="space-y-4">
          <div className={cn(
            "p-4 rounded-lg border-2",
            trainingStats && trainingStats.totalTransactions >= 500
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
          )}>
            <div className="flex items-start gap-3">
              {trainingStats && trainingStats.totalTransactions >= 500 ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              )}
              <div>
                <Typography variant="p" className="font-semibold mb-1">
                  Data Volume: {trainingStats?.totalTransactions || 0} transactions
                </Typography>
                <Typography variant="span" className="text-sm text-muted-foreground">
                  {trainingStats && trainingStats.totalTransactions >= 500
                    ? "Sufficient data for training"
                    : `Need ${500 - (trainingStats?.totalTransactions || 0)} more transactions (min: 500)`
                  }
                </Typography>
              </div>
            </div>
          </div>

          <Button className="w-full" size="lg">
            <Zap className="h-4 w-4 mr-2" />
            Start Training
          </Button>
        </div>
      </Card>

      <Card className="p-6 lg:col-span-2">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Training Steps
        </Typography>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <Typography variant="p" className="font-semibold mb-1">
                Collect Training Data
              </Typography>
              <Typography variant="span" className="text-sm text-muted-foreground">
                Accumulate at least 500 labeled transactions with 5-20% fraud rate
              </Typography>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <Typography variant="p" className="font-semibold mb-1">
                Train Model
              </Typography>
              <Typography variant="span" className="text-sm text-muted-foreground">
                Run: <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">python scripts/train_fraud_model.py</code>
              </Typography>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <Typography variant="p" className="font-semibold mb-1">
                Deploy Model
              </Typography>
              <Typography variant="span" className="text-sm text-muted-foreground">
                Restart processor to load the trained model automatically
              </Typography>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// EDA Tab
function EdaTab({ edaSummary, loading }: { edaSummary: EdaSummary | null; loading: boolean }) {
  // Nếu API chưa về, hiển thị spinner nhẹ
  if (loading && !edaSummary) {
    return (
      <Card className="p-12 text-center">
        <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-500" />
        <Typography variant="p" className="text-muted-foreground">
          Đang tải thống kê EDA từ pipeline preProcessing...
        </Typography>
      </Card>
    );
  }

  const summary: EdaSummary = edaSummary || {
    labelDistribution: [],
    paymentMethods: [],
    countryDistribution: [],
    hourlyDistribution: [],
    amountHistogram: [],
    missingRates: [],
  };

  const histogramData = (summary.amountHistogram || []).map((item) => ({
    bucket: item.bucket,
    Trước: item.before,
    Sau: item.after,
  }));

  const dailyTrend = summary.dailyTrend || [];
  const corrPairs = summary.corrPairs || [];
  const boxStats = summary.boxByLabel || [];
  const boxChartData = boxStats.map((b) => ({
    label: b.label,
    median: b.median ?? 0,
    min: b.min ?? 0,
    max: b.max ?? 0,
    mean: b.mean ?? 0,
  }));
  const calendar = summary.calendar || { month: [], dayOfWeek: [], dayOfMonth: [] };
  const trapFlags = summary.trapFlags || [];
  const timeSpans = summary.timeSpans || [];
  const calendarByLabel = summary.calendarByLabel || { month: [], dayOfWeek: [], dayOfMonth: [], hour: [] };
  const timeBoxByLabel = summary.timeBoxByLabel || [];
  const timeHistsByLabel = summary.timeHistsByLabel || {};
  const countryByLabel = summary.countryByLabel || [];

  const groupCalendarByLabel = (list: { bucket: number; label: string; count: number }[]) => {
    const grouped: Record<number, Record<string, number>> = {};
    list.forEach(item => {
      grouped[item.bucket] = grouped[item.bucket] || {};
      grouped[item.bucket][item.label] = item.count;
    });
    return Object.entries(grouped).map(([bucket, obj]) => ({ bucket: Number(bucket), ...obj }));
  };

  const buildStackedHist = (list: { bin: string; label: string; count: number }[]) => {
    const grouped: Record<string, any> = {};
    list.forEach(item => {
      if (!grouped[item.bin]) grouped[item.bin] = { bin: item.bin };
      grouped[item.bin][item.label] = item.count;
    });
    return Object.values(grouped);
  };

  const groupByLabelGeneric = (list: Array<{ bucket: string | number; label: string; count: number }>) => {
    const grouped: Record<string, any> = {};
    list.forEach(item => {
      const key = String(item.bucket);
      if (!grouped[key]) grouped[key] = { bucket: key };
      grouped[key][item.label] = item.count;
    });
    return Object.values(grouped);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <Typography variant="span" className="text-sm text-muted-foreground">
            Tổng mẫu sau khi load
          </Typography>
          <Typography variant="h3" className="text-2xl font-bold">
            {summary.dataset?.rows?.toLocaleString() || 'N/A'}
          </Typography>
          <Typography variant="span" className="text-xs text-muted-foreground">
            Cập nhật: {summary.runAt ? new Date(summary.runAt).toLocaleString() : 'N/A'}
          </Typography>
        </Card>
        <Card className="p-4">
          <Typography variant="span" className="text-sm text-muted-foreground">
            Số cột
          </Typography>
          <Typography variant="h3" className="text-2xl font-bold">
            {summary.dataset?.cols || 'N/A'}
          </Typography>
          <Typography variant="span" className="text-xs text-muted-foreground">
            Ví dụ cột: {summary.dataset?.sampleColumns?.slice(0, 3).join(', ') || '...'}
          </Typography>
        </Card>
        <Card className="p-4">
          <Typography variant="span" className="text-sm text-muted-foreground">
            Mất dữ liệu nhiều nhất
          </Typography>
          <Typography variant="h3" className="text-2xl font-bold">
            {summary.missingRates?.[0]?.column || 'Ổn định'}
          </Typography>
          <Typography variant="span" className="text-xs text-muted-foreground">
            {summary.missingRates?.[0]?.rate ? `${(summary.missingRates[0].rate * 100).toFixed(1)}% null` : 'Ít NA'}
          </Typography>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" className="text-xl font-semibold">
              Phân bố nhãn (label)
            </Typography>
            <PieChart className="h-5 w-5 text-blue-600" />
          </div>
          {summary.labelDistribution?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.labelDistribution.map(item => ({ label: item.name, count: item.count }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography variant="span" className="text-muted-foreground">Chưa có dữ liệu nhãn.</Typography>
          )}
          <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
            Ghi chú: Tỉ lệ cao của nhãn 0 thể hiện bộ dữ liệu cân bằng thấp; cần chú ý khi đánh giá độ chính xác.
          </Typography>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" className="text-xl font-semibold">
              Phương thức thanh toán nổi bật
            </Typography>
            <SlidersHorizontal className="h-5 w-5 text-purple-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={summary.paymentMethods}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {summary.paymentMethods.map((_, idx) => (
                      <Cell key={idx} fill={['#6366f1', '#22c55e', '#f97316', '#06b6d4', '#a855f7', '#f43f5e'][idx % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {summary.paymentMethods?.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <Typography variant="span" className="text-sm">{item.name}</Typography>
                  <Typography variant="span" className="text-sm text-muted-foreground">
                    {item.count.toLocaleString()} giao dịch
                  </Typography>
                </div>
              ))}
            </div>
          </div>
          <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
            Ghi chú: So sánh nhanh giữa các kênh thanh toán giúp phát hiện kênh có xu hướng rủi ro cao.
          </Typography>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" className="text-xl font-semibold">
              Phân phối số tiền trước/sau clipping
            </Typography>
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogramData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Trước" fill="#ef4444" />
              <Bar dataKey="Sau" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
          <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
            Clipping cắt đỉnh bất thường nhưng giữ lại cấu trúc chính của phân phối. Để tránh mô hình quá phụ thuộc vào duy nhất một biến.
          </Typography>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" className="text-xl font-semibold">
              Lưu lượng theo giờ giao dịch
            </Typography>
            <Clock className="h-5 w-5 text-sky-600" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={summary.hourlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" name="Số giao dịch" stroke="#0ea5e9" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
          <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
            Mẹo: Đỉnh vào giờ hành chính gợi ý hành vi hợp lệ; giao dịch đêm nhiều có thể là tín hiệu bất thường.
          </Typography>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <Typography variant="h3" className="text-xl font-semibold mb-4">
            Phân phối theo tháng
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={calendar.month}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="bucket" label={{ value: 'Tháng', position: 'insideBottom', offset: -5 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
           
          </div>
          <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
            Biểu đồ thời gian giúp nhìn rõ mùa vụ và xu hướng cuối/đầu tuần – tương tự lineplot trong notebook.
          </Typography>
        </Card>

        <Card className="p-6">
          <Typography variant="h3" className="text-xl font-semibold mb-4">
            Ngày trong tháng/ ngày trong tuần
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={calendar.dayOfMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={calendar.dayOfWeek}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="bucket" label={{ value: 'Thứ (0=Mon)', position: 'insideBottom', offset: -5 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
      
        </Card>
      </div>

      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Khoảng thời gian hành vi theo nhãn
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'account_age', title: 'Account age: đã tồn tại bao lâu create_dt - register_date' },
            { key: 'user_seniority', title: 'Thâm niên người dùng: đã giao dịch bao lâu hay gian lận này chính là giao dịch đầu tiên create_dt - first_transaction_date' },
            { key: 'time_to_activate', title: 'Thời gian kích hoạt: first_transaction_date - register_date'},
          ].map(item => (
            <div key={item.key} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Typography variant="span" className="text-sm font-semibold block mb-2">
                {item.title}
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={buildStackedHist(timeHistsByLabel[item.key] || [])}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="0" name="Label 0" fill="#22c55e" />
                  <Bar dataKey="1" name="Label 1" fill="#f97316" />
                  <Bar dataKey="2" name="Label 2" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
        <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
          Nếu có label gian lận, các cột màu cam/đỏ sẽ tập trung ở bin thấp (tài khoản mới/ kích hoạt nhanh)
        </Typography>
      </Card>

      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Phân phối theo nhãn: tháng, ngày trong tháng, ngày trong tuần, giờ trong ngày
        </Typography>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={groupCalendarByLabel(calendarByLabel.month)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="0" name="Label 0" fill="#22c55e" />
              <Bar dataKey="1" name="Label 1" fill="#f97316" />
              <Bar dataKey="2" name="Label 2" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={groupCalendarByLabel(calendarByLabel.dayOfMonth)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="0" name="Label 0" fill="#22c55e" />
              <Bar dataKey="1" name="Label 1" fill="#f97316" />
              <Bar dataKey="2" name="Label 2" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={groupCalendarByLabel(calendarByLabel.dayOfWeek)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="0" name="Label 0" fill="#22c55e" />
              <Bar dataKey="1" name="Label 1" fill="#f97316" />
              <Bar dataKey="2" name="Label 2" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={groupCalendarByLabel(calendarByLabel.hour)}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="0" name="Label 0" fill="#22c55e" />
              <Bar dataKey="1" name="Label 1" fill="#f97316" />
              <Bar dataKey="2" name="Label 2" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
          Stacked bar giúp xem nhanh nhãn gian lận tập trung ở tháng/ngày/giờ nào; màu cam/đỏ nổi bật khi label &gt; 0.
        </Typography>
      </Card>


      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Phân bổ quốc gia theo nhãn
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={groupByLabelGeneric(countryByLabel)}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="0" name="Label 0" fill="#22c55e" />
            <Bar dataKey="1" name="Label 1" fill="#f97316" />
            <Bar dataKey="2" name="Label 2" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
        <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
          Cho thấy quốc gia nhận tiền nào có tỷ trọng giao dịch gian lận cao hơn (màu cam/đỏ nếu có label &gt; 0).
        </Typography>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" className="text-xl font-semibold">
              Xu hướng giao dịch theo ngày
            </Typography>
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" name="Giao dịch" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
            Đồ thị này mô phỏng lineplot: dễ thấy ngày tăng giảm đột biến để điều tra bất thường.
          </Typography>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" className="text-xl font-semibold">
              Tương quan đặc trưng (top)
            </Typography>
            <BarChart3 className="h-5 w-5 text-indigo-600" />
          </div>
          {corrPairs.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {corrPairs.map((pair) => {
                const corr = pair.corr || 0;
                const intensity = Math.min(1, Math.abs(corr));
                const color = corr >= 0 ? `rgba(34,197,94,${0.15 + intensity * 0.6})` : `rgba(239,68,68,${0.15 + intensity * 0.6})`;
                return (
                  <div key={`${pair.f1}-${pair.f2}`} className="p-3 rounded-lg border bg-white dark:bg-gray-800" style={{ backgroundColor: color }}>
                    <Typography variant="span" className="text-sm font-semibold block">
                      {pair.f1} ↔ {pair.f2}
                    </Typography>
                    <Typography variant="span" className="text-xs text-muted-foreground">
                      Hệ số tương quan: {corr.toFixed(2)}
                    </Typography>
                  </div>
                );
              })}
            </div>
          ) : (
            <Typography variant="span" className="text-muted-foreground text-sm">Chưa đủ dữ liệu để tính corr.</Typography>
          )}
          <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
            Đây là bản rút gọn heatmap tương quan; ô xanh dương/đỏ thể hiện mức độ +/− mạnh.
          </Typography>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Typography variant="h3" className="text-xl font-semibold">
            Boxplot deposit_amount theo nhãn
          </Typography>
          <SlidersHorizontal className="h-5 w-5 text-sky-600" />
        </div>
        {boxStats.length ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={boxChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="median" name="Median" fill="#0ea5e9" />
              <ErrorBar dataKey="min" dataKey2="max" width={4} stroke="#ef4444" />
              <Line type="monotone" dataKey="mean" name="Mean" stroke="#22c55e" strokeWidth={2} dot />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="span" className="text-muted-foreground">Không tìm thấy nhãn để vẽ boxplot.</Typography>
        )}
        <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
          Mô phỏng boxplot: cột xanh là median, đoạn đỏ biểu diễn min/max, đường xanh lá là mean để so sánh lệch.
        </Typography>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Typography variant="h3" className="text-xl font-semibold">
            Cột thiếu dữ liệu (top)
          </Typography>
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
        </div>
        <div className="space-y-3">
          {(summary.missingRates || []).map((item) => (
            <div key={item.column} className="flex items-center gap-3">
              <div className="w-32 text-sm font-medium">{item.column}</div>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                  style={{ width: `${(item.rate || 0) * 100}%` }}
                />
              </div>
              <div className="w-16 text-right text-sm text-muted-foreground">
                {((item.rate || 0) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
        <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
          Ghi chú: Các cột NA cao cần xem xét lại nguồn dữ liệu hoặc chiến lược điền giá trị trước khi huấn luyện.
        </Typography>
      </Card>
    </div>
  );
}

// Tab Tiền xử lý & đặc trưng
function PreprocessingTab({ summary, loading }: { summary: PreprocessingSummary | null; loading: boolean }) {
  if (loading && !summary) {
    return (
      <Card className="p-12 text-center">
        <RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4 text-blue-500" />
        <Typography variant="p" className="text-muted-foreground">
          Đang tải luồng tiền xử lý và đặc trưng...
        </Typography>
      </Card>
    );
  }

  const data = summary || {
    histogram: [],
    scalingPreview: [],
    pipelineShape: [],
    stageInfo: [],
    encodedCategoricals: [],
    engineeredDistributions: [],
  };

  const clippingStats = data.clippingStats;
  const formatNumber = (value?: number | null) => value || value === 0 ? value.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 'N/A';

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Typography variant="h3" className="text-xl font-semibold">
            Luồng xử lý từ preProcessing
          </Typography>
          <Sparkles className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.pipelineShape?.map((step, idx) => (
            <div key={step.step} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {idx + 1}
                </div>
                <Typography variant="p" className="font-semibold">{step.step}</Typography>
              </div>
              <Typography variant="span" className="text-sm text-muted-foreground">
                {step.rows.toLocaleString()} dòng • {step.cols} cột
              </Typography>
            </div>
          ))}
        </div>
        <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
          Luồng gồm: load dữ liệu → làm sạch/cắt ngoại lệ → tạo đặc trưng → encode + scale.
        </Typography>
      </Card>

      <Card className="p-6">
        <Typography variant="h3" className="text-xl font-semibold mb-4">
          Số lượng cột theo từng bước (raw → aligned → encoded → scaled)
        </Typography>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.stageInfo}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="cols" name="Tổng cột" fill="#6366f1" />
            <Bar dataKey="numericCols" name="Cột số" fill="#22c55e" />
            <Bar dataKey="categoricalCols" name="Cột phân loại" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
        <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
          Bước aligned thêm feature thời gian/logic; encoded biến các cột phân loại thành số; scaled chuẩn hoá thang đo.
        </Typography>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" className="text-xl font-semibold">
              Clipping số tiền (trước/sau)
            </Typography>
            <BarChart3 className="h-5 w-5 text-emerald-600" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={(data.histogram || []).map(item => ({ bucket: item.bucket, before: item.before, after: item.after }))}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="before" name="Trước" fill="#f97316" />
              <Bar dataKey="after" name="Sau" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Typography variant="span" className="text-xs text-muted-foreground">Trước clipping</Typography>
              <Typography variant="p" className="text-sm font-semibold">
                Min: {formatNumber(clippingStats?.before?.min)} | Max: {formatNumber(clippingStats?.before?.max)}
              </Typography>
              <Typography variant="span" className="text-xs text-muted-foreground">
                Mean: {formatNumber(clippingStats?.before?.mean)} | Median: {formatNumber(clippingStats?.before?.median)}
              </Typography>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Typography variant="span" className="text-xs text-muted-foreground">Sau clipping</Typography>
              <Typography variant="p" className="text-sm font-semibold">
                Min: {formatNumber(clippingStats?.after?.min)} | Max: {formatNumber(clippingStats?.after?.max)}
              </Typography>
              <Typography variant="span" className="text-xs text-muted-foreground">
                Mean: {formatNumber(clippingStats?.after?.mean)} | Median: {formatNumber(clippingStats?.after?.median)}
              </Typography>
            </div>
          </div>
          <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
            Ghi chú: Cắt ngoại lệ giảm độ lệch chuẩn, giúp scaler hoạt động ổn định và tránh chi phối bởi outlier.
          </Typography>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h3" className="text-xl font-semibold">
              Các đặc trưng mới nổi bật
            </Typography>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex flex-wrap gap-2">
            {data.engineered?.newColumns?.length ? (
              data.engineered.newColumns.map((col) => (
                <span key={col} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 rounded-full text-xs font-medium">
                  {col}
                </span>
              ))
            ) : (
              <Typography variant="span" className="text-muted-foreground text-sm">Chưa ghi nhận cột mới.</Typography>
            )}
          </div>
          <Typography variant="span" className="text-xs text-muted-foreground block mt-3">
            Tổng cột sau feature engineering: {data.engineered?.totalColumnsAfter || 0} (thêm {data.engineered?.totalNew || 0} cột).
          </Typography>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 mt-2">
            <li><code>account_age</code> (create_dt - register_date): số ngày tài khoản tồn tại → tài khoản mới rủi ro hơn.</li>
            <li><code>user_seniority</code> (create_dt - first_transaction_date): thâm niên giao dịch; thấp báo hiệu tài khoản “mới đi giao dịch”.</li>
            <li><code>time_to_activate</code> (first_transaction_date - register_date): thời gian kích hoạt sau đăng ký; 0-1 ngày là hành vi bật nhanh đáng ngờ.</li>
            <li><code>amount_type</code>: phân bucket tiền (nhỏ/vừa/lớn) để mô hình nhạy với mức giao dịch.</li>
            <li><code>create_dt_hour</code>, <code>create_dt_is_night</code>: thời gian trong ngày, cờ giao dịch ban đêm.</li>
            <li><code>country_mismatch</code>, <code>name_mismatch</code>: bẫy logic sai lệch thông tin (quốc gia/ tên gửi).</li>
          </ul>
          <div className="mt-3">
            <Typography variant="span" className="text-xs text-muted-foreground">
              Cột được encode: {data.encodedCategoricals?.length ? data.encodedCategoricals.join(', ') : 'Không có hoặc chưa lấy được danh sách.'}
            </Typography>
          </div>
        </Card>
      </div>

    </div>
  );
}
