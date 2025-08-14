'use client';

import { useState, useEffect } from 'react';
import { 
  Eye, 
  Search, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  AlertCircle
} from 'lucide-react';

interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  duration?: number;
}

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  currentStep?: string;
  steps?: {
    step: string;
    status: string;
    error?: string;
  }[];
}

export default function AnalysisProgress({ 
  isAnalyzing, 
  currentStep = 'image_analysis',
  steps = []
}: AnalysisProgressProps) {
  const [progressSteps, setProgressSteps] = useState<AnalysisStep[]>([
    {
      id: 'image_analysis',
      title: 'Analyzing Image',
      description: 'Extracting text, logos, and product details',
      icon: <Eye className="w-5 h-5" />,
      status: 'pending'
    },
    {
      id: 'product_normalization',
      title: 'Processing Product Info',
      description: 'Normalizing product name, brand, and model',
      icon: <Search className="w-5 h-5" />,
      status: 'pending'
    },
    {
      id: 'ebay_search',
      title: 'Finding Market Prices',
      description: 'Searching eBay for recent sales data',
      icon: <TrendingUp className="w-5 h-5" />,
      status: 'pending'
    }
  ]);

  // Update step statuses based on current progress
  useEffect(() => {
    if (!isAnalyzing) {
      setProgressSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));
      return;
    }

    setProgressSteps(prev => prev.map(step => {
      // Update from API steps if available
      const apiStep = steps.find(s => s.step === step.id);
      if (apiStep) {
        return {
          ...step,
          status: apiStep.status as any
        };
      }

      // Fallback to basic progression
      const stepOrder = ['image_analysis', 'product_normalization', 'ebay_search'];
      const currentIndex = stepOrder.indexOf(currentStep);
      const stepIndex = stepOrder.indexOf(step.id);

      if (stepIndex < currentIndex) {
        return { ...step, status: 'completed' as const };
      } else if (stepIndex === currentIndex) {
        return { ...step, status: 'in_progress' as const };
      } else {
        return { ...step, status: 'pending' as const };
      }
    }));
  }, [currentStep, isAnalyzing, steps]);

  const getStepIcon = (step: AnalysisStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'in_progress':
        return (
          <div className="relative">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        );
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepColor = (step: AnalysisStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'in_progress':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getProgressPercentage = () => {
    const completed = progressSteps.filter(step => step.status === 'completed').length;
    const inProgress = progressSteps.filter(step => step.status === 'in_progress').length;
    const total = progressSteps.length;
    
    return ((completed + (inProgress * 0.5)) / total) * 100;
  };

  if (!isAnalyzing) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-2">Analyzing Your Product</h3>
        <p className="text-gray-600">Please wait while we process your image and find pricing information</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Progress</span>
          <span className="text-sm text-gray-600">{Math.round(getProgressPercentage())}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {progressSteps.map((step, index) => (
          <div key={step.id}>
            <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${getStepColor(step)}`}>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{step.title}</h4>
                  <p className="text-sm text-gray-600">{step.description}</p>
                  {step.status === 'failed' && steps.find(s => s.step === step.id)?.error && (
                    <p className="text-sm text-red-600 mt-1">
                      Error: {steps.find(s => s.step === step.id)?.error}
                    </p>
                  )}
                </div>
                {step.status === 'completed' && (
                  <div className="text-sm text-green-600 font-medium">
                    ✓ Complete
                  </div>
                )}
                {step.status === 'in_progress' && (
                  <div className="text-sm text-blue-600 font-medium">
                    Processing...
                  </div>
                )}
              </div>
            </div>
            
            {/* Connector line */}
            {index < progressSteps.length - 1 && (
              <div className="flex justify-center my-2">
                <div className="w-0.5 h-4 bg-gray-300"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h5 className="font-medium text-blue-800 mb-2">💡 Tips for Better Results</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Ensure the product name or brand is clearly visible</li>
          <li>• Take photos in good lighting conditions</li>
          <li>• Avoid reflections and shadows on the product</li>
          <li>• Include model numbers or barcodes when visible</li>
        </ul>
      </div>
    </div>
  );
}
