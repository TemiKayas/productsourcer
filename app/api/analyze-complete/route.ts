import { NextRequest, NextResponse } from 'next/server';
import type { CompleteAnalysisResult } from '@/lib/product-analysis';

/**
 * Complete product analysis endpoint that orchestrates:
 * 1. Image analysis with Google Vision
 * 2. Text normalization 
 * 3. eBay price lookup
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    if (!body.image) {
      return NextResponse.json({
        success: false,
        error: 'No image data provided'
      } as CompleteAnalysisResult, { status: 400 });
    }

    // Step 1: Analyze image
    const imageAnalysisResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: body.image }),
    });
    
    if (!imageAnalysisResponse.ok) {
      throw new Error('Image analysis failed');
    }
    
    const imageAnalysis = await imageAnalysisResponse.json();
    
    if (!imageAnalysis.success) {
      throw new Error(imageAnalysis.error || 'Image analysis failed');
    }

    // Step 2: Normalize extracted text
    const rawTexts = imageAnalysis.extractedTexts.map((t: any) => t.text);
    const normalizeResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/product-normalize`, {
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
    
    const normalization = await normalizeResponse.json();
    
    if (!normalization.success) {
      throw new Error(normalization.error || 'Product normalization failed');
    }

    // Step 3: Search eBay for pricing
    const ebaySearchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/ebay-search`, {
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
    
    const ebaySearch = await ebaySearchResponse.json();
    
    if (!ebaySearch.success) {
      throw new Error(ebaySearch.error || 'eBay search failed');
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
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
    } as CompleteAnalysisResult);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
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
    } as CompleteAnalysisResult, { status: 500 });
  }
}
