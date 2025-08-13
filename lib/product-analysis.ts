// Utility functions to orchestrate the complete product analysis flow

import type { 
  AnalyzeImageResponse, 
  EbaySearchResponse, 
  ProductNormalizeResponse,
  EbayListing,
  NormalizedProduct
} from '@/types/api';

export interface CompleteAnalysisResult {
  success: boolean;
  productInfo: {
    extractedTexts: string[];
    normalized: NormalizedProduct;
    confidence: number;
  };
  pricing: {
    listings: EbayListing[];
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    totalFound: number;
  };
  searchStrategy: string;
  processingTime: number;
  error?: string;
}

/**
 * Orchestrates the complete product analysis flow:
 * 1. Analyze image with Google Vision
 * 2. Normalize extracted text
 * 3. Search eBay for pricing
 */
export async function analyzeProductComplete(imageBase64: string): Promise<CompleteAnalysisResult> {
  const startTime = Date.now();
  
  try {
    // Step 1: Analyze image
    const imageAnalysisResponse = await fetch('/api/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    });
    
    if (!imageAnalysisResponse.ok) {
      throw new Error('Image analysis failed');
    }
    
    const imageAnalysis: AnalyzeImageResponse = await imageAnalysisResponse.json();
    
    if (!imageAnalysis.success) {
      throw new Error(imageAnalysis.error || 'Image analysis failed');
    }

    // Step 2: Normalize extracted text
    const rawTexts = imageAnalysis.extractedTexts.map(t => t.text);
    const normalizeResponse = await fetch('/api/product-normalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        rawText: rawTexts,
        context: 'product_name'
      }),
    });
    
    if (!normalizeResponse.ok) {
      throw new Error('Product normalization failed');
    }
    
    const normalization: ProductNormalizeResponse = await normalizeResponse.json();
    
    if (!normalization.success) {
      throw new Error(normalization.error || 'Product normalization failed');
    }

    // Step 3: Search eBay for pricing
    const ebaySearchResponse = await fetch('/api/ebay-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: normalization.normalized.searchKeywords,
        brandName: normalization.normalized.brandName,
        modelNumber: normalization.normalized.modelNumber,
        limit: 20,
      }),
    });
    
    if (!ebaySearchResponse.ok) {
      throw new Error('eBay search failed');
    }
    
    const ebaySearch: EbaySearchResponse = await ebaySearchResponse.json();
    
    if (!ebaySearch.success) {
      throw new Error(ebaySearch.error || 'eBay search failed');
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      productInfo: {
        extractedTexts: rawTexts,
        normalized: normalization.normalized,
        confidence: Math.min(imageAnalysis.confidence + normalization.normalized.confidence, 1.0) / 2,
      },
      pricing: {
        listings: ebaySearch.listings,
        averagePrice: ebaySearch.averagePrice,
        minPrice: ebaySearch.minPrice,
        maxPrice: ebaySearch.maxPrice,
        totalFound: ebaySearch.totalFound,
      },
      searchStrategy: ebaySearch.searchStrategy,
      processingTime,
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      productInfo: {
        extractedTexts: [],
        normalized: {
          productName: '',
          searchKeywords: [],
          confidence: 0,
        },
        confidence: 0,
      },
      pricing: {
        listings: [],
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalFound: 0,
      },
      searchStrategy: 'error',
      processingTime,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Helper function to convert File to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Helper function to format price for display
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price);
}

/**
 * Helper function to format date for display
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

/**
 * Helper function to get confidence level description
 */
export function getConfidenceLevel(confidence: number): { level: string; color: string; description: string } {
  if (confidence >= 0.8) {
    return {
      level: 'High',
      color: 'green',
      description: 'Very confident in product identification',
    };
  } else if (confidence >= 0.6) {
    return {
      level: 'Medium',
      color: 'yellow',
      description: 'Moderately confident in product identification',
    };
  } else if (confidence >= 0.4) {
    return {
      level: 'Low',
      color: 'orange',
      description: 'Low confidence, results may be inaccurate',
    };
  } else {
    return {
      level: 'Very Low',
      color: 'red',
      description: 'Very low confidence, manual verification recommended',
    };
  }
}
