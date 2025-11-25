import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Path to the latest model
    const modelBasePath = join(process.cwd(), '..', 'models', 'fraud_detection_latest');
    const metadataPath = join(modelBasePath, 'metadata.json');
    const featureImportancePath = join(modelBasePath, 'feature_importance.csv');

    // Check if model exists
    if (!existsSync(metadataPath)) {
      // Return mock data if no model is trained yet
      return NextResponse.json({
        modelInfo: {
          modelLoaded: false,
          modelType: 'XGBoost Classifier',
          numFeatures: 0,
          trainingDate: 'N/A',
          modelPath: 'Not trained yet',
        },
        modelMetrics: {
          rocAuc: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          accuracy: 0,
          truePositives: 0,
          trueNegatives: 0,
          falsePositives: 0,
          falseNegatives: 0,
        },
        featureImportance: [],
        trainingStats: {
          totalSamples: 0,
          fraudSamples: 0,
          normalSamples: 0,
          trainingTime: 'N/A',
          lastTraining: 'Never',
        },
      });
    }

    // Read metadata.json
    const metadataContent = readFileSync(metadataPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    // Read feature importance
    let featureImportance: Array<{ feature: string; importance: number; rank: number }> = [];
    if (existsSync(featureImportancePath)) {
      const csvContent = readFileSync(featureImportancePath, 'utf-8');
      const lines = csvContent.trim().split('\n');
      
      // Skip header and parse CSV
      featureImportance = lines.slice(1).map((line, index) => {
        const [feature, importance] = line.split(',');
        return {
          feature: feature.trim(),
          importance: parseFloat(importance),
          rank: index + 1,
        };
      });
    }

    // Extract metrics from metadata
    const testMetrics = metadata.test_metrics || {};
    const confusionMatrix = testMetrics.confusion_matrix || { tp: 0, tn: 0, fp: 0, fn: 0 };

    // Calculate training stats
    const trainingSamples = metadata.training_samples || 0;
    const fraudCount = metadata.fraud_count || 0;
    const normalCount = trainingSamples - fraudCount;

    // Format the response
    const response = {
      modelInfo: {
        modelLoaded: true,
        modelType: metadata.model_type || 'XGBoost Classifier',
        numFeatures: metadata.num_features || featureImportance.length,
        trainingDate: metadata.training_timestamp || new Date().toISOString(),
        modelPath: modelBasePath,
      },
      modelMetrics: {
        rocAuc: testMetrics.roc_auc || 0,
        precision: testMetrics.precision || 0,
        recall: testMetrics.recall || 0,
        f1Score: testMetrics.f1_score || 0,
        accuracy: testMetrics.accuracy || 0,
        truePositives: confusionMatrix.tp || 0,
        trueNegatives: confusionMatrix.tn || 0,
        falsePositives: confusionMatrix.fp || 0,
        falseNegatives: confusionMatrix.fn || 0,
      },
      featureImportance: featureImportance.slice(0, 20), // Top 20 features
      trainingStats: {
        totalSamples: trainingSamples,
        fraudSamples: fraudCount,
        normalSamples: normalCount,
        trainingTime: metadata.training_duration || 'N/A',
        lastTraining: metadata.training_timestamp || 'N/A',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[ML Model Info] Error fetching model data:', error);
    
    // Return error response with mock data structure
    return NextResponse.json({
      error: 'Failed to load model information',
      modelInfo: {
        modelLoaded: false,
        modelType: 'XGBoost Classifier',
        numFeatures: 0,
        trainingDate: 'N/A',
        modelPath: 'Error loading model',
      },
      modelMetrics: {
        rocAuc: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        accuracy: 0,
        truePositives: 0,
        trueNegatives: 0,
        falsePositives: 0,
        falseNegatives: 0,
      },
      featureImportance: [],
      trainingStats: {
        totalSamples: 0,
        fraudSamples: 0,
        normalSamples: 0,
        trainingTime: 'N/A',
        lastTraining: 'Never',
      },
    }, { status: 500 });
  }
}
