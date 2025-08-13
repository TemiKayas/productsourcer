import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getConfig } from '@/lib/env';
import type { 
  AnalyzeImageRequest, 
  AnalyzeImageResponse, 
  ExtractedText, 
  GoogleVisionTextAnnotation 
} from '@/types/api';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const config = getConfig();
    
    if (!config.google.visionApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google Vision API key not configured'
      } as AnalyzeImageResponse, { status: 500 });
    }

    const body: AnalyzeImageRequest = await request.json();
    
    if (!body.image) {
      return NextResponse.json({
        success: false,
        error: 'No image data provided'
      } as AnalyzeImageResponse, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Image = body.image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Call Google Vision API
    const visionResponse = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${config.google.visionApiKey}`,
      {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 50 },
              { type: 'LOGO_DETECTION', maxResults: 10 }
            ]
          }
        ]
      }
    );

    const visionResult = visionResponse.data.responses[0];
    
    if (visionResult.error) {
      return NextResponse.json({
        success: false,
        error: `Vision API error: ${visionResult.error.message}`
      } as AnalyzeImageResponse, { status: 500 });
    }

    // Extract text annotations
    const textAnnotations: GoogleVisionTextAnnotation[] = visionResult.textAnnotations || [];
    const logoAnnotations = visionResult.logoAnnotations || [];

    // Process extracted texts
    const extractedTexts: ExtractedText[] = textAnnotations.map((annotation, index) => {
      // Skip the first annotation as it's usually the full text
      if (index === 0) {
        return {
          text: annotation.description,
          confidence: 1.0,
        };
      }

      // Calculate bounding box
      const vertices = annotation.boundingPoly?.vertices || [];
      let boundingBox;
      if (vertices.length >= 4) {
        const xs = vertices.map(v => v.x);
        const ys = vertices.map(v => v.y);
        boundingBox = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        };
      }

      return {
        text: annotation.description,
        confidence: 0.8, // Google Vision doesn't provide confidence for individual words
        boundingBox,
      };
    });

    // Extract product information
    const allText = extractedTexts.map(t => t.text).join(' ');
    const productKeywords = extractProductKeywords(allText);
    const brandName = extractBrandName(allText, logoAnnotations);
    const modelNumber = extractModelNumber(allText);
    const barcode = extractBarcode(allText);

    // Calculate overall confidence based on extracted information
    const confidence = calculateConfidence(extractedTexts, productKeywords, brandName, modelNumber);

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      extractedTexts,
      productKeywords,
      brandName,
      modelNumber,
      barcode,
      confidence,
      processingTime,
    } as AnalyzeImageResponse);

  } catch (error) {
    console.error('Analyze image error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      extractedTexts: [],
      productKeywords: [],
      confidence: 0,
      processingTime,
    } as AnalyzeImageResponse, { status: 500 });
  }
}

function extractProductKeywords(text: string): string[] {
  // Basic keyword extraction - remove common stop words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'new', 'brand', 'authentic', 'original', 'genuine', 'used', 'condition', 'excellent',
    'good', 'fair', 'poor', 'size', 'color', 'style', 'model', 'type', 'series'
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word)); // Remove pure numbers

  // Remove duplicates and return top keywords
  return [...new Set(words)].slice(0, 10);
}

function extractBrandName(text: string, logoAnnotations: any[]): string | undefined {
  // Known brand patterns (extend this list)
  const knownBrands = [
    'apple', 'samsung', 'sony', 'nintendo', 'microsoft', 'google', 'amazon',
    'nike', 'adidas', 'canon', 'nikon', 'dell', 'hp', 'lenovo', 'asus',
    'lg', 'panasonic', 'philips', 'bosch', 'dyson', 'kitchenaid'
  ];

  // Check logo annotations first
  if (logoAnnotations.length > 0) {
    return logoAnnotations[0].description;
  }

  // Look for brand names in text
  const lowerText = text.toLowerCase();
  for (const brand of knownBrands) {
    if (lowerText.includes(brand)) {
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
  }

  return undefined;
}

function extractModelNumber(text: string): string | undefined {
  // Look for patterns that might be model numbers
  const modelPatterns = [
    /[A-Z]{1,3}[-\s]?\d{3,6}[A-Z]?/g, // e.g., XR-1000, AB123C
    /\b[A-Z]\d{3,6}\b/g,               // e.g., A1234
    /\b\d{3,6}[A-Z]{1,3}\b/g,          // e.g., 1234XL
  ];

  for (const pattern of modelPatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      return matches[0];
    }
  }

  return undefined;
}

function extractBarcode(text: string): string | undefined {
  // Look for barcode patterns (UPC, EAN, etc.)
  const barcodePatterns = [
    /\b\d{12,13}\b/g, // UPC/EAN
    /\b\d{8}\b/g,     // EAN-8
  ];

  for (const pattern of barcodePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      return matches[0];
    }
  }

  return undefined;
}

function calculateConfidence(
  extractedTexts: ExtractedText[], 
  productKeywords: string[], 
  brandName?: string, 
  modelNumber?: string
): number {
  let confidence = 0;

  // Base confidence from extracted text quality
  if (extractedTexts.length > 0) {
    const avgTextConfidence = extractedTexts.reduce((sum, t) => sum + t.confidence, 0) / extractedTexts.length;
    confidence += avgTextConfidence * 0.4;
  }

  // Bonus for having product keywords
  if (productKeywords.length > 0) {
    confidence += Math.min(productKeywords.length / 10, 0.3);
  }

  // Bonus for brand detection
  if (brandName) {
    confidence += 0.2;
  }

  // Bonus for model number detection
  if (modelNumber) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}
