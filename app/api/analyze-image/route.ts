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
    const config = getConfig(['google']);
    
    if (!config.google.visionApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Google Vision API key not configured',
        extractedTexts: [],
        productKeywords: [],
        detectedLogos: [],
        confidence: 0,
        confidenceLevel: 'low' as const,
        qualityAssessment: {
          textQuality: 'low' as const,
          brandDetected: false,
          modelDetected: false,
          keywordQuality: 'low' as const,
          overallScore: 0,
          issues: ['Google Vision API key not configured'],
          suggestions: ['Configure Google Vision API key in environment variables'],
        },
        fallbackStrategies: [],
        detectedObjects: [],
        detectedLabels: [],
        edgeCases: ['api_key_missing'],
        processingTime: Date.now() - startTime,
      } as AnalyzeImageResponse, { status: 500 });
    }

    const body: AnalyzeImageRequest = await request.json();
    
    if (!body.image) {
      return NextResponse.json({
        success: false,
        error: 'No image data provided',
        extractedTexts: [],
        productKeywords: [],
        detectedLogos: [],
        confidence: 0,
        confidenceLevel: 'low' as const,
        qualityAssessment: {
          textQuality: 'low' as const,
          brandDetected: false,
          modelDetected: false,
          keywordQuality: 'low' as const,
          overallScore: 0,
          issues: ['No image data provided'],
          suggestions: ['Please provide a valid base64 encoded image'],
        },
        fallbackStrategies: [],
        detectedObjects: [],
        detectedLabels: [],
        edgeCases: ['no_image_data'],
        processingTime: Date.now() - startTime,
      } as AnalyzeImageResponse, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Image = body.image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Call Google Vision API with comprehensive feature detection
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
              { type: 'LOGO_DETECTION', maxResults: 20 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              { type: 'LABEL_DETECTION', maxResults: 20 },
              { type: 'PRODUCT_SEARCH', maxResults: 10 }
            ]
          }
        ]
      }
    );

    const visionResult = visionResponse.data.responses[0];
    
    if (visionResult.error) {
      return NextResponse.json({
        success: false,
        error: `Vision API error: ${visionResult.error.message}`,
        extractedTexts: [],
        productKeywords: [],
        detectedLogos: [],
        confidence: 0,
        confidenceLevel: 'low' as const,
        qualityAssessment: {
          textQuality: 'low' as const,
          brandDetected: false,
          modelDetected: false,
          keywordQuality: 'low' as const,
          overallScore: 0,
          issues: [`Vision API error: ${visionResult.error.message}`],
          suggestions: ['Check image format and try again'],
        },
        fallbackStrategies: [],
        detectedObjects: [],
        detectedLabels: [],
        edgeCases: ['vision_api_error'],
        processingTime: Date.now() - startTime,
      } as AnalyzeImageResponse, { status: 500 });
    }

    // Extract all annotations
    const textAnnotations: GoogleVisionTextAnnotation[] = visionResult.textAnnotations || [];
    const logoAnnotations = visionResult.logoAnnotations || [];
    const objectAnnotations = visionResult.localizedObjectAnnotations || [];
    const labelAnnotations = visionResult.labelAnnotations || [];
    const productAnnotations = visionResult.productSearchResults?.results || [];

    // Process extracted texts with enhanced analysis
    const extractedTexts: ExtractedText[] = [];
    
    // Add the full text as first entry (Google Vision aggregated text)
    if (textAnnotations.length > 0) {
      extractedTexts.push({
        text: textAnnotations[0].description,
        confidence: 0.95,
      });
    }

    // Process individual text segments with product-focused filtering
    for (let i = 1; i < textAnnotations.length; i++) {
      const annotation = textAnnotations[i];
      const text = annotation.description.trim();
      
      // Skip very short or irrelevant text
      if (text.length < 2 || /^[^\w\d]*$/.test(text)) continue;
      
      // Calculate bounding box
      const vertices = annotation.boundingPoly?.vertices || [];
      let boundingBox;
      if (vertices.length >= 4) {
        const xs = vertices.map(v => v.x || 0);
        const ys = vertices.map(v => v.y || 0);
        boundingBox = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        };
      }

      // Prioritize text that looks like product information
      const productRelevance = calculateTextRelevance(text);
      
      extractedTexts.push({
        text,
        confidence: 0.8 + (productRelevance * 0.2),
        boundingBox,
      });
    }

    // Extract product information using multiple data sources
    const allText = extractedTexts.map(t => t.text).join(' ');
    const productKeywords = extractProductKeywords(allText, labelAnnotations, objectAnnotations);
    const brandName = extractBrandName(allText, logoAnnotations, labelAnnotations);
    const modelNumber = extractModelNumber(allText);
    const barcode = extractBarcode(allText);
    
    // Enhance with object and label detection
    const detectedObjects = objectAnnotations.map((obj: any) => obj.name).slice(0, 5);
    const detectedLabels = labelAnnotations
      .filter((label: any) => label.score > 0.7)
      .map((label: any) => label.description)
      .slice(0, 10);

    // Calculate overall confidence based on all extracted information
    const confidence = calculateConfidence(
      extractedTexts, 
      productKeywords, 
      brandName, 
      modelNumber, 
      detectedObjects,
      detectedLabels
    );

    const processingTime = Date.now() - startTime;

    // Create detected logos array from logo annotations
    const detectedLogos = logoAnnotations.map((logo: any) => ({
      description: logo.description,
      confidence: logo.score,
      brandName: brandName && logo.description.toLowerCase().includes(brandName.toLowerCase()) ? brandName : undefined,
    }));

    // Calculate confidence level
    const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';

    // Create quality assessment
    const qualityAssessment = {
      textQuality: extractedTexts.length > 5 ? 'high' : extractedTexts.length > 2 ? 'medium' : 'low',
      brandDetected: !!brandName,
      modelDetected: !!modelNumber,
      keywordQuality: productKeywords.length > 5 ? 'high' : productKeywords.length > 2 ? 'medium' : 'low',
      overallScore: confidence,
      issues: [] as string[],
      suggestions: [] as string[],
    };

    // Add quality issues and suggestions
    if (extractedTexts.length === 0) {
      qualityAssessment.issues.push('No text detected in image');
      qualityAssessment.suggestions.push('Ensure the image contains clear, readable text');
    }
    if (!brandName) {
      qualityAssessment.suggestions.push('Try capturing the brand name or logo more clearly');
    }
    if (confidence < 0.5) {
      qualityAssessment.issues.push('Low confidence in text recognition');
      qualityAssessment.suggestions.push('Use better lighting and higher resolution image');
    }

    // Detect edge cases
    const edgeCases = [];
    if (extractedTexts.length === 0) edgeCases.push('no_text_found');
    if (confidence < 0.3) edgeCases.push('poor_image_quality');
    if (productKeywords.length === 0) edgeCases.push('no_product_keywords');

    return NextResponse.json({
      success: true,
      extractedTexts,
      productKeywords,
      brandName,
      modelNumber,
      barcode,
      detectedLogos,
      confidence,
      confidenceLevel,
      qualityAssessment,
      fallbackStrategies: [], // Could be populated by helper functions if needed
      detectedObjects,
      detectedLabels,
      edgeCases,
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
      detectedLogos: [],
      confidence: 0,
      confidenceLevel: 'low' as const,
      qualityAssessment: {
        textQuality: 'low' as const,
        brandDetected: false,
        modelDetected: false,
        keywordQuality: 'low' as const,
        overallScore: 0,
        issues: ['Processing failed'],
        suggestions: ['Please try again with a clearer image'],
      },
      fallbackStrategies: [],
      detectedObjects: [],
      detectedLabels: [],
      edgeCases: [],
      processingTime,
    } as AnalyzeImageResponse, { status: 500 });
  }
}

function calculateTextRelevance(text: string): number {
  const productIndicators = [
    // Model/part numbers
    /\b[A-Z]{1,3}[-\s]?\d{3,6}[A-Z]?\b/i,
    /\b[A-Z]\d{3,6}\b/i,
    // Brand patterns
    /\b(apple|samsung|sony|nintendo|microsoft|google|amazon|nike|adidas)\b/i,
    // Product types
    /\b(iphone|ipad|macbook|galaxy|pixel|playstation|xbox|switch)\b/i,
    // Specifications
    /\b(\d+gb|\d+tb|\d+hz|\d+mp|\d+w|\d+v)\b/i,
    // Colors/materials
    /\b(black|white|silver|gold|blue|red|green|aluminum|steel|plastic)\b/i,
  ];

  let relevance = 0;
  for (const pattern of productIndicators) {
    if (pattern.test(text)) {
      relevance += 0.2;
    }
  }
  
  return Math.min(relevance, 1.0);
}

function extractProductKeywords(text: string, labelAnnotations: any[] = [], objectAnnotations: any[] = []): string[] {
  // Enhanced keyword extraction with multiple data sources
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'new', 'brand', 'authentic', 'original', 'genuine', 'used', 'condition', 'excellent',
    'good', 'fair', 'poor', 'size', 'color', 'style', 'model', 'type', 'series', 'item', 'product'
  ]);

  const keywords = new Set<string>();

  // Extract from text
  const textWords = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word)); // Remove pure numbers

  textWords.forEach(word => keywords.add(word));

  // Add relevant labels from Google Vision
  labelAnnotations
    .filter(label => label.score > 0.7)
    .forEach(label => {
      const desc = label.description.toLowerCase();
      if (!stopWords.has(desc) && desc.length > 2) {
        keywords.add(desc);
      }
    });

  // Add detected objects
  objectAnnotations.forEach(obj => {
    const name = obj.name.toLowerCase();
    if (!stopWords.has(name) && name.length > 2) {
      keywords.add(name);
    }
  });

  // Prioritize product-specific keywords
  const productKeywords = Array.from(keywords).sort((a, b) => {
    const aRelevance = calculateTextRelevance(a);
    const bRelevance = calculateTextRelevance(b);
    return bRelevance - aRelevance;
  });

  return productKeywords.slice(0, 12);
}

function extractBrandName(text: string, logoAnnotations: any[] = [], labelAnnotations: any[] = []): string | undefined {
  // Comprehensive brand database
  const knownBrands = [
    // Tech brands
    'apple', 'samsung', 'sony', 'nintendo', 'microsoft', 'google', 'amazon', 'meta', 'facebook',
    'canon', 'nikon', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'msi', 'razer', 'corsair',
    'lg', 'panasonic', 'philips', 'bosch', 'dyson', 'kitchenaid', 'cuisinart', 'vitamix',
    'bose', 'beats', 'sennheiser', 'jbl', 'skullcandy', 'airpods', 'huawei', 'xiaomi',
    'oneplus', 'motorola', 'oppo', 'vivo', 'realme', 'honor', 'nothing', 'pixel',
    
    // Fashion & sports brands
    'nike', 'adidas', 'puma', 'under armour', 'reebok', 'new balance', 'converse', 'vans',
    'jordan', 'supreme', 'gucci', 'louis vuitton', 'prada', 'versace', 'armani',
    
    // Auto brands
    'toyota', 'honda', 'ford', 'bmw', 'mercedes', 'audi', 'volkswagen', 'nissan',
    
    // Gaming brands
    'playstation', 'xbox', 'switch', 'steam', 'epic', 'ubisoft', 'ea', 'activision'
  ];

  // Check logo annotations first (highest confidence)
  for (const logo of logoAnnotations) {
    if (logo.description && logo.score > 0.5) {
      return formatBrandName(logo.description);
    }
  }

  // Check labels for brand mentions
  for (const label of labelAnnotations) {
    if (label.score > 0.8) {
      const desc = label.description.toLowerCase();
      for (const brand of knownBrands) {
        if (desc.includes(brand)) {
          return formatBrandName(brand);
        }
      }
    }
  }

  // Look for brand names in extracted text with context sensitivity
  const lowerText = text.toLowerCase();
  
  // Sort brands by length (longer first) to avoid partial matches
  const sortedBrands = knownBrands.sort((a, b) => b.length - a.length);
  
  for (const brand of sortedBrands) {
    // Use word boundary regex for exact matches
    const brandRegex = new RegExp(`\\b${brand.replace(/\s/g, '\\s+')}\\b`, 'i');
    if (brandRegex.test(lowerText)) {
      return formatBrandName(brand);
    }
  }

  // Look for product-specific brand indicators
  const productBrandPatterns = [
    { pattern: /\biphone\b/i, brand: 'Apple' },
    { pattern: /\bipad\b/i, brand: 'Apple' },
    { pattern: /\bmacbook\b/i, brand: 'Apple' },
    { pattern: /\bairpods\b/i, brand: 'Apple' },
    { pattern: /\bgalaxy\b/i, brand: 'Samsung' },
    { pattern: /\bpixel\b/i, brand: 'Google' },
    { pattern: /\bsurface\b/i, brand: 'Microsoft' },
    { pattern: /\bplaystation\b/i, brand: 'Sony' },
    { pattern: /\bxbox\b/i, brand: 'Microsoft' },
  ];

  for (const { pattern, brand } of productBrandPatterns) {
    if (pattern.test(lowerText)) {
      return brand;
    }
  }

  return undefined;
}

function formatBrandName(brand: string): string {
  // Handle special cases
  const specialCases: { [key: string]: string } = {
    'louis vuitton': 'Louis Vuitton',
    'under armour': 'Under Armour',
    'new balance': 'New Balance',
  };

  const normalized = brand.toLowerCase().trim();
  
  if (specialCases[normalized]) {
    return specialCases[normalized];
  }

  // Capitalize first letter of each word
  return normalized.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractModelNumber(text: string): string | undefined {
  // Enhanced model number patterns for different product types
  const modelPatterns = [
    // Apple product patterns
    /\b(A\d{4})\b/g,                          // e.g., A1234 (Apple model numbers)
    /\b(iPhone\s?\d{1,2}(\s?Pro)?(\s?Max)?)\b/gi, // e.g., iPhone 14 Pro Max
    /\b(iPad\s?(Pro|Air|Mini)?(\s?\d+)?)\b/gi,     // e.g., iPad Pro 12.9
    /\b(MacBook\s?(Pro|Air)?(\s?\d+)?)\b/gi,       // e.g., MacBook Pro 16
    
    // Samsung Galaxy patterns
    /\b(Galaxy\s?[A-Z]\d{1,3}(\s?\+?)?)\b/gi,      // e.g., Galaxy S23+
    /\b(SM-[A-Z]\d{3,4}[A-Z]?)\b/g,               // e.g., SM-G998B
    
    // General tech model patterns
    /\b([A-Z]{1,3}[-\s]?\d{3,6}[A-Z]?)\b/g,       // e.g., XR-1000, AB123C
    /\b([A-Z]\d{3,6}[A-Z]?)\b/g,                  // e.g., A1234B
    /\b(\d{3,6}[A-Z]{1,3})\b/g,                   // e.g., 1234XL
    
    // Product version patterns
    /\b(v\d+(\.\d+)?)\b/gi,                       // e.g., v2.1
    /\b(gen\s?\d+)\b/gi,                          // e.g., Gen 3
    /\b(generation\s?\d+)\b/gi,                   // e.g., Generation 2
    
    // Gaming console patterns
    /\b(PS[1-5])\b/gi,                            // PlayStation
    /\b(Xbox\s?(One|Series\s?[SX])?)\b/gi,        // Xbox variants
    /\b(Switch\s?(Lite|OLED)?)\b/gi,              // Nintendo Switch
  ];

  const foundModels: string[] = [];
  
  for (const pattern of modelPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      foundModels.push(...matches);
    }
  }

  if (foundModels.length === 0) return undefined;

  // Sort by length (longer model numbers are usually more specific)
  foundModels.sort((a, b) => b.length - a.length);
  
  // Return the most specific model number found
  return foundModels[0].trim();
}

function extractBarcode(text: string): string | undefined {
  // Enhanced barcode patterns with validation
  const barcodePatterns = [
    /\b(\d{12,14})\b/g,    // UPC-A (12), EAN-13 (13), EAN-14 (14)
    /\b(\d{8})\b/g,        // EAN-8
    /\b([0-9]{10,13})\b/g, // ISBN patterns
  ];

  const foundBarcodes: string[] = [];

  for (const pattern of barcodePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      foundBarcodes.push(...matches);
    }
  }

  if (foundBarcodes.length === 0) return undefined;

  // Validate and prioritize common barcode lengths
  const validBarcodes = foundBarcodes.filter(barcode => {
    const length = barcode.length;
    return length === 8 || length === 12 || length === 13 || length === 14;
  });

  if (validBarcodes.length === 0) return foundBarcodes[0];

  // Prioritize by common formats: EAN-13 > UPC-A > EAN-8
  const prioritized = validBarcodes.sort((a, b) => {
    const priorities = { 13: 3, 12: 2, 8: 1, 14: 0 };
    const aPriority = priorities[a.length as keyof typeof priorities] || 0;
    const bPriority = priorities[b.length as keyof typeof priorities] || 0;
    return bPriority - aPriority;
  });

  return prioritized[0];
}

function calculateConfidence(
  extractedTexts: ExtractedText[], 
  productKeywords: string[], 
  brandName?: string, 
  modelNumber?: string,
  detectedObjects: string[] = [],
  detectedLabels: string[] = []
): number {
  let confidence = 0;

  // Base confidence from extracted text quality and quantity
  if (extractedTexts.length > 0) {
    const avgTextConfidence = extractedTexts.reduce((sum, t) => sum + t.confidence, 0) / extractedTexts.length;
    const textQuantityBonus = Math.min(extractedTexts.length / 20, 0.1); // Bonus for more text found
    confidence += (avgTextConfidence * 0.3) + textQuantityBonus;
  }

  // Enhanced keyword scoring
  if (productKeywords.length > 0) {
    const keywordQuality = productKeywords.reduce((sum, keyword) => {
      return sum + calculateTextRelevance(keyword);
    }, 0) / productKeywords.length;
    
    confidence += Math.min((productKeywords.length / 10) * (0.2 + keywordQuality * 0.1), 0.25);
  }

  // Brand detection bonus (higher for logo vs text detection)
  if (brandName) {
    confidence += 0.2;
  }

  // Model number detection bonus
  if (modelNumber) {
    confidence += 0.15;
  }

  // Object detection bonus (confirms product category)
  if (detectedObjects.length > 0) {
    const relevantObjects = detectedObjects.filter(obj => 
      /phone|tablet|laptop|computer|gaming|device|electronics|appliance/i.test(obj)
    );
    if (relevantObjects.length > 0) {
      confidence += 0.1;
    }
  }

  // Label detection bonus (provides context)
  if (detectedLabels.length > 0) {
    confidence += Math.min(detectedLabels.length / 20, 0.05);
  }

  // Ensure confidence is realistic and within bounds
  return Math.min(Math.max(confidence, 0.1), 0.95);
}
