// API Request/Response Types

export interface AnalyzeImageRequest {
  image: string; // base64 encoded image
}

export interface ExtractedText {
  text: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DetectedLogo {
  description: string;
  confidence: number;
  brandName?: string;
}

export interface QualityAssessment {
  textQuality: 'high' | 'medium' | 'low';
  brandDetected: boolean;
  modelDetected: boolean;
  keywordQuality: 'high' | 'medium' | 'low';
  overallScore: number;
  issues: string[];
  suggestions: string[];
}

export interface FallbackStrategy {
  type: 'label_based' | 'category_based' | 'partial_text' | 'generic_type';
  description: string;
  keywords: string[];
  confidence: number;
}

export interface AnalyzeImageResponse {
  success: boolean;
  extractedTexts: ExtractedText[];
  productKeywords: string[];
  brandName?: string;
  modelNumber?: string;
  barcode?: string;
  detectedLogos: DetectedLogo[];
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  qualityAssessment: QualityAssessment;
  fallbackStrategies: FallbackStrategy[];
  detectedObjects: string[];
  detectedLabels: string[];
  edgeCases: string[];
  processingTime: number;
  error?: string;
}

export interface EbaySearchRequest {
  keywords: string[];
  brandName?: string;
  modelNumber?: string;
  categoryId?: string;
  limit?: number;
}

export interface EbayListing {
  title: string;
  price: number;
  currency: string;
  condition: string;
  endDate: string;
  url: string;
  imageUrl?: string;
  shippingCost?: number;
  soldDate?: string;
  listingType: 'auction' | 'fixed';
}

export interface EbaySearchResponse {
  success: boolean;
  listings: EbayListing[];
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  totalFound: number;
  searchStrategy: string;
  searchStrategiesUsed: string[];
  searchKeywords: string[];
  qualityScore: number;
  relevanceThreshold: number;
  processingTime: number;
  error?: string;
}

export interface ProductNormalizeRequest {
  rawText: string[];
  context?: 'product_name' | 'brand' | 'model' | 'general';
}

export interface NormalizedProduct {
  productName: string;
  brandName?: string;
  modelNumber?: string;
  category?: string;
  searchKeywords: string[];
  confidence: number;
}

export interface ProductNormalizeResponse {
  success: boolean;
  normalized: NormalizedProduct;
  originalTexts: string[];
  processingMethod: 'rules' | 'ai' | 'hybrid';
  error?: string;
}

// Complete Analysis Pipeline Types
export interface AnalyzeCompleteRequest {
  image: string; // base64 encoded image
}

export interface AnalysisStep {
  step: 'image_analysis' | 'product_normalization' | 'ebay_search';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface AnalyzeCompleteResponse {
  success: boolean;
  steps: AnalysisStep[];
  imageAnalysis?: AnalyzeImageResponse;
  productNormalization?: ProductNormalizeResponse;
  ebaySearch?: EbaySearchResponse;
  summary: {
    productFound: boolean;
    pricingAvailable: boolean;
    qualityScore: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    recommendedActions: string[];
  };
  totalProcessingTime: number;
  error?: string;
}

// Internal utility types
export interface GoogleVisionTextAnnotation {
  description: string;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
}

export interface EbayFindingAPIResponse {
  findCompletedItemsResponse: [{
    searchResult: [{
      item?: Array<{
        title: [string];
        sellingStatus: [{
          convertedCurrentPrice: [{ '@currencyId': string; __value__: string }];
        }];
        condition?: [{ conditionDisplayName: [string] }];
        listingInfo: [{ endTime: [string]; listingType: [string] }];
        viewItemURL: [string];
        galleryURL?: [string];
        shippingInfo?: [{ shippingServiceCost: [{ '@currencyId': string; __value__: string }] }];
      }>;
      '@count': string;
    }];
  }];
}
