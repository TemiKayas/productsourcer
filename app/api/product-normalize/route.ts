import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/env';
import type { 
  ProductNormalizeRequest, 
  ProductNormalizeResponse, 
  NormalizedProduct 
} from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const body: ProductNormalizeRequest = await request.json();
    
    if (!body.rawText || body.rawText.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No text provided for normalization'
      } as ProductNormalizeResponse, { status: 400 });
    }

    // Try rule-based normalization first (fast and reliable)
    const ruleBasedResult = normalizeWithRules(body.rawText, body.context);
    
    // If rule-based normalization is confident enough, return it
    if (ruleBasedResult.confidence >= 0.7) {
      return NextResponse.json({
        success: true,
        normalized: ruleBasedResult,
        originalTexts: body.rawText,
        processingMethod: 'rules',
      } as ProductNormalizeResponse);
    }

    // Try AI-based normalization as fallback (if OpenAI key is available)
    const config = getConfig();
    if (config.openai.apiKey) {
      try {
        const aiResult = await normalizeWithAI(body.rawText, body.context, config.openai.apiKey);
        return NextResponse.json({
          success: true,
          normalized: aiResult,
          originalTexts: body.rawText,
          processingMethod: 'ai',
        } as ProductNormalizeResponse);
      } catch (aiError) {
        console.error('AI normalization failed, falling back to rules:', aiError);
      }
    }

    // Return rule-based result as fallback
    return NextResponse.json({
      success: true,
      normalized: ruleBasedResult,
      originalTexts: body.rawText,
      processingMethod: 'rules',
    } as ProductNormalizeResponse);

  } catch (error) {
    console.error('Product normalization error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      originalTexts: [],
      processingMethod: 'error',
    } as ProductNormalizeResponse, { status: 500 });
  }
}

function normalizeWithRules(rawTexts: string[], context?: string): NormalizedProduct {
  const combinedText = rawTexts.join(' ').toLowerCase();
  
  // Extract brand name
  const brandName = extractBrandFromText(combinedText);
  
  // Extract model number
  const modelNumber = extractModelFromText(combinedText);
  
  // Extract product category
  const category = extractCategoryFromText(combinedText);
  
  // Generate product name
  const productName = generateProductName(rawTexts, brandName, modelNumber, category);
  
  // Generate search keywords
  const searchKeywords = generateSearchKeywords(rawTexts, brandName, modelNumber, category);
  
  // Calculate confidence based on extracted information
  const confidence = calculateNormalizationConfidence(brandName, modelNumber, category, searchKeywords);
  
  return {
    productName,
    brandName,
    modelNumber,
    category,
    searchKeywords,
    confidence,
  };
}

function extractBrandFromText(text: string): string | undefined {
  const knownBrands = [
    'apple', 'samsung', 'sony', 'nintendo', 'microsoft', 'google', 'amazon',
    'nike', 'adidas', 'canon', 'nikon', 'dell', 'hp', 'lenovo', 'asus',
    'lg', 'panasonic', 'philips', 'bosch', 'dyson', 'kitchenaid', 'cuisinart',
    'vitamix', 'ninja', 'instant pot', 'keurig', 'breville', 'dualit',
    'bose', 'beats', 'sennheiser', 'jbl', 'skullcandy', 'airpods',
    'iphone', 'ipad', 'macbook', 'airbook', 'surface', 'galaxy', 'pixel',
    'playstation', 'xbox', 'switch', 'wii', 'gameboy', 'ds'
  ];

  for (const brand of knownBrands) {
    if (text.includes(brand)) {
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
  }

  return undefined;
}

function extractModelFromText(text: string): string | undefined {
  // Model number patterns
  const patterns = [
    /(?:model|mod\.?|#)\s*([a-z0-9\-]+)/i,
    /\b([a-z]{1,3}[-\s]?\d{3,6}[a-z]?)\b/i,
    /\b([a-z]\d{3,6})\b/i,
    /\b(\d{3,6}[a-z]{1,3})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return undefined;
}

function extractCategoryFromText(text: string): string | undefined {
  const categories = {
    'Electronics': ['phone', 'tablet', 'laptop', 'computer', 'tv', 'monitor', 'camera', 'headphone', 'speaker', 'gaming', 'console'],
    'Appliances': ['blender', 'mixer', 'toaster', 'coffee', 'microwave', 'oven', 'refrigerator', 'dishwasher', 'vacuum', 'cleaner'],
    'Clothing': ['shirt', 'pants', 'shoes', 'dress', 'jacket', 'coat', 'hat', 'gloves', 'socks', 'underwear'],
    'Sports': ['bike', 'bicycle', 'ball', 'racket', 'bat', 'glove', 'helmet', 'gear', 'equipment', 'fitness'],
    'Books': ['book', 'novel', 'textbook', 'manual', 'guide', 'dictionary', 'encyclopedia'],
    'Toys': ['toy', 'game', 'puzzle', 'doll', 'action figure', 'board game', 'card game'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }

  return undefined;
}

function generateProductName(rawTexts: string[], brandName?: string, modelNumber?: string, category?: string): string {
  const parts: string[] = [];
  
  if (brandName) parts.push(brandName);
  if (modelNumber) parts.push(modelNumber);
  
  // Add descriptive words from raw text
  const descriptiveWords = extractDescriptiveWords(rawTexts.join(' '));
  parts.push(...descriptiveWords.slice(0, 2));
  
  if (category && !parts.some(part => part.toLowerCase().includes(category.toLowerCase()))) {
    parts.push(category);
  }
  
  return parts.length > 0 ? parts.join(' ') : rawTexts[0] || 'Unknown Product';
}

function extractDescriptiveWords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'new', 'used', 'authentic', 'original', 'genuine', 'condition', 'excellent', 'good', 'fair', 'poor',
    'size', 'color', 'style', 'type', 'series', 'brand', 'model', 'item', 'product'
  ]);

  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word))
    .slice(0, 5);
}

function generateSearchKeywords(rawTexts: string[], brandName?: string, modelNumber?: string, category?: string): string[] {
  const keywords = new Set<string>();
  
  if (brandName) keywords.add(brandName.toLowerCase());
  if (modelNumber) keywords.add(modelNumber.toLowerCase());
  if (category) keywords.add(category.toLowerCase());
  
  // Add descriptive words
  const descriptiveWords = extractDescriptiveWords(rawTexts.join(' '));
  descriptiveWords.forEach(word => keywords.add(word));
  
  // Add significant words from raw text
  rawTexts.forEach(text => {
    const words = extractDescriptiveWords(text);
    words.forEach(word => keywords.add(word));
  });
  
  return Array.from(keywords).slice(0, 8);
}

function calculateNormalizationConfidence(brandName?: string, modelNumber?: string, category?: string, searchKeywords: string[] = []): number {
  let confidence = 0.3; // Base confidence
  
  if (brandName) confidence += 0.3;
  if (modelNumber) confidence += 0.2;
  if (category) confidence += 0.1;
  
  // Bonus for having meaningful keywords
  confidence += Math.min(searchKeywords.length / 10, 0.1);
  
  return Math.min(confidence, 1.0);
}

async function normalizeWithAI(rawTexts: string[], context: string | undefined, apiKey: string): Promise<NormalizedProduct> {
  // This would integrate with OpenAI API for more sophisticated normalization
  // For now, we'll throw an error to indicate it's not implemented
  throw new Error('AI normalization not implemented yet');
}
