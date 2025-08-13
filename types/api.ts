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

export interface AnalyzeImageResponse {
  success: boolean;
  extractedTexts: ExtractedText[];
  productKeywords: string[];
  brandName?: string;
  modelNumber?: string;
  barcode?: string;
  confidence: number;
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
  minPrice: number;
  maxPrice: number;
  totalFound: number;
  searchStrategy: string;
  searchKeywords: string[];
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
