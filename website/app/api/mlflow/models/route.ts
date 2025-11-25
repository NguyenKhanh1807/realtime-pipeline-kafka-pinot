import { NextRequest, NextResponse } from 'next/server';

const MLFLOW_URL = process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    // Get experiment ID for fraud-detection
    const experimentsRes = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/experiments/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        max_results: 1,
        filter: "name = 'fraud-detection'"
      })
    });

    if (!experimentsRes.ok) {
      return NextResponse.json(
        { error: 'MLflow not available' },
        { status: 503 }
      );
    }

    const experimentsData = await experimentsRes.json();
    
    if (!experimentsData.experiments || experimentsData.experiments.length === 0) {
      return NextResponse.json({
        models: [],
        latestModel: null,
        message: 'No experiments found. Train your first model.'
      });
    }

    const experimentId = experimentsData.experiments[0].experiment_id;

    // Get all runs for this experiment
    const runsRes = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/runs/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experiment_ids: [experimentId],
        max_results: 50,
        order_by: ['start_time DESC']
      })
    });

    if (!runsRes.ok) {
      throw new Error('Failed to fetch runs');
    }

    const runsData = await runsRes.json();
    const runs = runsData.runs || [];

    // Get registered models
    const modelsRes = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/registered-models/search`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    let registeredModels = [];
    if (modelsRes.ok) {
      const modelsData = await modelsRes.json();
      registeredModels = modelsData.registered_models || [];
    }

    // Transform runs into model records
    const models = runs.map((run: any) => {
      const metrics = run.data?.metrics || [];
      const params = run.data?.params || [];
      
      const getMetric = (name: string) => {
        const metric = metrics.find((m: any) => m.key === name);
        return metric ? parseFloat(metric.value) : null;
      };

      const getParam = (name: string) => {
        const param = params.find((p: any) => p.key === name);
        return param ? param.value : null;
      };

      return {
        runId: run.info.run_id,
        runName: run.info.run_name,
        experimentId: run.info.experiment_id,
        status: run.info.status,
        startTime: run.info.start_time,
        endTime: run.info.end_time,
        duration: run.info.end_time - run.info.start_time,
        metrics: {
          // Regression metrics
          rmse: getMetric('rmse'),
          mae: getMetric('mae'),
          r2Score: getMetric('r2_score'),
          thresholdAccuracy: getMetric('threshold_accuracy'),
          modelType: getParam('model_type') || 'regression',
          // Additional metrics
          mse: getMetric('mse'),
          trainSize: getMetric('train_size'),
          testSize: getMetric('test_size'),
          minPred: getMetric('min_pred'),
          maxPred: getMetric('max_pred'),
          // Score metrics
          meanScoreTest: getMetric('mean_score_test'),
          meanScoreTrain: getMetric('mean_score_train'),
          mean_score_test: getMetric('mean_score_test'),
          mean_score_train: getMetric('mean_score_train'),
        },
        params: {
          nEstimators: getParam('n_estimators'),
          maxDepth: getParam('max_depth'),
          learningRate: getParam('learning_rate'),
          numFeatures: getParam('num_features'),
          totalSamples: getParam('total_samples'),
          modelType: getParam('model_type'),
        },
        artifactUri: run.info.artifact_uri,
        tags: run.data?.tags || []
      };
    });

    // Find latest successful run
    const latestModel = models.find((m: any) => m.status === 'FINISHED') || null;

    return NextResponse.json({
      models,
      latestModel,
      registeredModels,
      totalRuns: runs.length,
      experimentId
    });

  } catch (error) {
    console.error('Error fetching MLflow data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MLflow data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
