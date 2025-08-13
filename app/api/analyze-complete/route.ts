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

    // Validate image data format
    if (!body.image.startsWith('data:image/')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid image format. Please provide a base64 encoded image.'
      } as CompleteAnalysisResult, { status: 400 });
    }

    console.log('Starting complete product analysis...');

    // Step 1: Analyze image with Google Vision
    console.log('Step 1: Analyzing image with Google Vision API...');
    const imageAnalysisResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analyze-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: body.image }),
    });
    
    if (!imageAnalysisResponse.ok) {
      const errorText = await imageAnalysisResponse.text();
      console.error('Image analysis HTTP error:', imageAnalysisResponse.status, errorText);
      throw new Error(`Image analysis failed: ${imageAnalysisResponse.status}`);
    }
    
    const imageAnalysis = await imageAnalysisResponse.json();
    
    if (!imageAnalysis.success) {
      console.error('Image analysis error:', imageAnalysis.error);
      throw new Error(imageAnalysis.error || 'Image analysis failed');
    }

    console.log(`Image analysis completed. Found ${imageAnalysis.extractedTexts?.length || 0} text segments, confidence: ${imageAnalysis.confidence}`);

    // Handle edge case: no text found in image
    if (!imageAnalysis.extractedTexts || imageAnalysis.extractedTexts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No text found in image. Please ensure the image contains clear product text or labels.',
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
        searchStrategy: 'no_text_found',
        processingTime: Date.now() - startTime,
      } as CompleteAnalysisResult, { status: 200 });
    }

    // Step 2: Normalize extracted text
    console.log('Step 2: Normalizing extracted product information...');
    const rawTexts = imageAnalysis.extractedTexts.map((t: any) => t.text).filter((text: string) => text && text.trim().length > 0);
    
    if (rawTexts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid text found for product analysis.',
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
        searchStrategy: 'no_valid_text',
        processingTime: Date.now() - startTime,
      } as CompleteAnalysisResult, { status: 200 });
    }

    const normalizeResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/product-normalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        rawText: rawTexts,
        context: 'product_name'
      }),
    });
    
    if (!normalizeResponse.ok) {
      const errorText = await normalizeResponse.text();
      console.error('Product normalization HTTP error:', normalizeResponse.status, errorText);
      throw new Error(`Product normalization failed: ${normalizeResponse.status}`);
    }
    
    const normalization = await normalizeResponse.json();
    
    if (!normalization.success) {
      console.error('Product normalization error:', normalization.error);
      throw new Error(normalization.error || 'Product normalization failed');
    }

    console.log(`Product normalization completed. Product: "${normalization.normalized.productName}", Keywords: [${normalization.normalized.searchKeywords.join(', ')}]`);

    // Handle edge case: no search keywords found
    if (!normalization.normalized.searchKeywords || normalization.normalized.searchKeywords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Unable to identify product information for price lookup. The image may not contain clear product details.',
        productInfo: {
          extractedTexts: rawTexts,
          normalized: normalization.normalized,
          confidence: normalization.normalized.confidence,
        },
        pricing: {
          listings: [],
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalFound: 0,
        },
        searchStrategy: 'no_search_keywords',
        processingTime: Date.now() - startTime,
      } as CompleteAnalysisResult, { status: 200 });
    }

    // Step 3: Search eBay for pricing
    console.log('Step 3: Searching eBay for pricing information...');
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
      const errorText = await ebaySearchResponse.text();
      console.error('eBay search HTTP error:', ebaySearchResponse.status, errorText);
      throw new Error(`eBay search failed: ${ebaySearchResponse.status}`);
    }
    
    const ebaySearch = await ebaySearchResponse.json();
    
    if (!ebaySearch.success) {
      console.error('eBay search error:', ebaySearch.error);
      
      // Don't throw error for eBay search failure - return partial results
      return NextResponse.json({
        success: true,
        productInfo: {
          extractedTexts: rawTexts,
          normalized: normalization.normalized,
          confidence: Math.min(imageAnalysis.confidence + normalization.normalized.confidence, 1.0) / 2,
        },
        pricing: {
          listings: [],
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0,
          totalFound: 0,
        },
        searchStrategy: 'ebay_search_failed',
        processingTime: Date.now() - startTime,
        error: `Pricing lookup failed: ${ebaySearch.error || 'Unknown eBay error'}`,
      } as CompleteAnalysisResult);
    }

    console.log(`eBay search completed. Found ${ebaySearch.totalFound} listings using strategy: ${ebaySearch.searchStrategy}`);

    const processingTime = Date.now() - startTime;
    
    // Calculate overall analysis confidence
    const overallConfidence = Math.min(
      (imageAnalysis.confidence * 0.4) + 
      (normalization.normalized.confidence * 0.3) + 
      (ebaySearch.totalFound > 0 ? 0.3 : 0),
      0.95
    );

    console.log(`Complete analysis finished in ${processingTime}ms. Overall confidence: ${overallConfidence.toFixed(2)}`);

    return NextResponse.json({
      success: true,
      productInfo: {
        extractedTexts: rawTexts,
        normalized: normalization.normalized,
        confidence: overallConfidence,
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
    
    console.error('Complete analysis error:', error);
    
    // Provide helpful error messages based on the type of error
    let errorMessage = 'An unexpected error occurred during product analysis.';
    let statusCode = 500;
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('vision') || message.includes('google')) {
        errorMessage = 'Image analysis service is currently unavailable. Please try again later.';
      } else if (message.includes('ebay')) {
        errorMessage = 'Price lookup service is temporarily unavailable, but product identification may still work.';
        statusCode = 200; // Partial success
      } else if (message.includes('network') || message.includes('fetch')) {
        errorMessage = 'Network error occurred. Please check your connection and try again.';
      } else if (message.includes('api key') || message.includes('auth')) {
        errorMessage = 'Service configuration error. Please contact support.';
      } else {
        errorMessage = error.message;
      }
    }
    
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
      error: errorMessage,
    } as CompleteAnalysisResult, { status: statusCode });
  }
}
