'use client';

import { useState } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  TrendingUp, 
  Star, 
  Clock, 
  Tag, 
  ExternalLink,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle,
  Info,
  Lightbulb
} from 'lucide-react';
import { EbayListing } from '../../types/api';
import type { CompleteAnalysisResult } from '../../lib/product-analysis';

interface AnalysisResultsProps {
  results: CompleteAnalysisResult;
  onNewAnalysis: () => void;
}

export default function AnalysisResults({ results, onNewAnalysis }: AnalysisResultsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAllListings, setShowAllListings] = useState(false);
  const [showFallbacks, setShowFallbacks] = useState(false);

  // Extract data from CompleteAnalysisResult structure
  const productInfo = results.productInfo;
  const pricing = results.pricing;
  const searchStrategy = results.searchStrategy;
  
  // Create derived values to match expected interface
  const productFound = productInfo.normalized.productName && 
                      productInfo.normalized.productName.trim().length > 0;
  const pricingAvailable = pricing.totalFound > 0;
  const confidenceLevel = productInfo.confidence >= 0.8 ? 'high' : 
                         productInfo.confidence >= 0.5 ? 'medium' : 'low';

  // Confidence level styling
  const getConfidenceColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Format price with currency
  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!results.success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Analysis Failed</h3>
          <p className="text-gray-600 mb-6">{results.error || 'An unexpected error occurred'}</p>
          <button
            onClick={onNewAnalysis}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-8">
      {/* Main Results Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* Header with confidence */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Analysis Complete</h3>
              <p className="text-gray-600">Product successfully analyzed</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg border ${getConfidenceColor(confidenceLevel)}`}>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span className="font-medium capitalize">{confidenceLevel} Confidence</span>
            </div>
          </div>
        </div>

        {/* Product Information */}
        {productNormalization?.success && (
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Product Details</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Product Name</p>
                <p className="font-medium text-gray-800">{productNormalization.normalized.productName}</p>
              </div>
              {productNormalization.normalized.brandName && (
                <div>
                  <p className="text-sm text-gray-600">Brand</p>
                  <p className="font-medium text-gray-800">{productNormalization.normalized.brandName}</p>
                </div>
              )}
              {productNormalization.normalized.modelNumber && (
                <div>
                  <p className="text-sm text-gray-600">Model</p>
                  <p className="font-medium text-gray-800">{productNormalization.normalized.modelNumber}</p>
                </div>
              )}
              {productNormalization.normalized.category && (
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-800">{productNormalization.normalized.category}</p>
                </div>
              )}
            </div>
            
            {/* Keywords */}
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Search Keywords</p>
              <div className="flex flex-wrap gap-2">
                {productNormalization.normalized.searchKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Information */}
        {pricingAvailable && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-800">Market Pricing</h4>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">{ebaySearch.totalFound} listings found</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Average Price</p>
                <p className="text-2xl font-bold text-green-600">{formatPrice(ebaySearch.averagePrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Median Price</p>
                <p className="text-xl font-semibold text-blue-600">{formatPrice(ebaySearch.medianPrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Low</p>
                <p className="text-lg font-medium text-gray-800">{formatPrice(ebaySearch.minPrice)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">High</p>
                <p className="text-lg font-medium text-gray-800">{formatPrice(ebaySearch.maxPrice)}</p>
              </div>
            </div>

            {/* Search Strategy Used */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Search Strategy: {ebaySearch.searchStrategy}</span>
                </div>
                <span className="text-sm text-gray-500">Quality Score: {(ebaySearch.qualityScore * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Listings Preview */}
        {ebaySearch?.success && ebaySearch.listings.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-800">Recent Sales</h4>
              <button
                onClick={() => setShowAllListings(!showAllListings)}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
              >
                <span>{showAllListings ? 'Show Less' : `Show All ${ebaySearch.listings.length}`}</span>
                {showAllListings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="space-y-3">
              {(showAllListings ? ebaySearch.listings : ebaySearch.listings.slice(0, 3)).map((listing, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm line-clamp-2">{listing.title}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
                      <span>{listing.condition}</span>
                      <span>{formatDate(listing.endDate)}</span>
                      <span className="capitalize">{listing.listingType}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-800">{formatPrice(listing.price, listing.currency)}</p>
                      {listing.shippingCost && listing.shippingCost > 0 && (
                        <p className="text-xs text-gray-500">+{formatPrice(listing.shippingCost)} shipping</p>
                      )}
                    </div>
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showDetails ? 'Hide' : 'Show'} Technical Details</span>
          </button>
          
          <button
            onClick={onNewAnalysis}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Analyze Another Product
          </button>
        </div>
      </div>

      {/* Technical Details */}
      {showDetails && (
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-6">Technical Details</h4>
          
          {/* Processing Steps */}
          <div className="mb-6">
            <h5 className="font-medium text-gray-700 mb-3">Processing Pipeline</h5>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center space-x-3">
                  {getStepIcon(step.status)}
                  <span className="font-medium text-gray-700 capitalize">{step.step.replace('_', ' ')}</span>
                  {step.endTime && step.startTime && (
                    <span className="text-sm text-gray-500">
                      ({step.endTime - step.startTime}ms)
                    </span>
                  )}
                  {step.error && <span className="text-sm text-red-600">- {step.error}</span>}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Total processing time: {results.totalProcessingTime}ms
            </p>
          </div>

          {/* Quality Assessment */}
          {imageAnalysis?.qualityAssessment && (
            <div className="mb-6">
              <h5 className="font-medium text-gray-700 mb-3">Quality Assessment</h5>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Text Quality</p>
                    <p className="font-medium capitalize">{imageAnalysis.qualityAssessment.textQuality}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Keyword Quality</p>
                    <p className="font-medium capitalize">{imageAnalysis.qualityAssessment.keywordQuality}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Overall Score</p>
                    <p className="font-medium">{(imageAnalysis.qualityAssessment.overallScore * 100).toFixed(0)}%</p>
                  </div>
                </div>
                
                {imageAnalysis.qualityAssessment.issues.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Detected Issues:</p>
                    <ul className="space-y-1">
                      {imageAnalysis.qualityAssessment.issues.map((issue, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm text-orange-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {imageAnalysis.qualityAssessment.suggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Suggestions for Better Results:</p>
                    <ul className="space-y-1">
                      {imageAnalysis.qualityAssessment.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm text-blue-700">
                          <Lightbulb className="w-4 h-4" />
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edge Cases */}
          {imageAnalysis?.edgeCases && imageAnalysis.edgeCases.length > 0 && (
            <div className="mb-6">
              <h5 className="font-medium text-gray-700 mb-3">Edge Cases Detected</h5>
              <div className="space-y-2">
                {imageAnalysis.edgeCases.map((edgeCase, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                    <Info className="w-4 h-4" />
                    <span>{edgeCase}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback Strategies */}
          {imageAnalysis?.fallbackStrategies && imageAnalysis.fallbackStrategies.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-700">Fallback Strategies Available</h5>
                <button
                  onClick={() => setShowFallbacks(!showFallbacks)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showFallbacks ? 'Hide' : 'Show'} Fallbacks
                </button>
              </div>
              
              {showFallbacks && (
                <div className="space-y-3">
                  {imageAnalysis.fallbackStrategies.map((strategy, index) => (
                    <div key={index} className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-blue-800 capitalize">
                          {strategy.type.replace('_', ' ')} Strategy
                        </span>
                        <span className="text-sm text-blue-600">
                          {(strategy.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 mb-2">{strategy.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {strategy.keywords.map((keyword, kidx) => (
                          <span key={kidx} className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recommended Actions */}
      {summary.recommendedActions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">Recommended Actions</h4>
          <div className="space-y-3">
            {summary.recommendedActions.map((action, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <span className="text-gray-700">{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
