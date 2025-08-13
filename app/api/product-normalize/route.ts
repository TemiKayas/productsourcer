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
  // Comprehensive brand database matching the analyze-image endpoint
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

function extractModelFromText(text: string): string | undefined {
  // Enhanced model number patterns matching analyze-image endpoint
  const modelPatterns = [
    // Explicit model indicators
    /(?:model|mod\.?|#)\s*([a-z0-9\-\s]+)/i,
    
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
  
  // Clean and return the most specific model number found
  const bestModel = foundModels[0].trim();
  
  // Remove common prefixes that might be captured
  return bestModel.replace(/^(model|mod\.?|#)\s*/i, '');
}

function extractCategoryFromText(text: string): string | undefined {
  const categories = {
    'Electronics': [
      'phone', 'tablet', 'laptop', 'computer', 'tv', 'monitor', 'camera', 'headphone', 'speaker', 
      'gaming', 'console', 'iphone', 'ipad', 'macbook', 'galaxy', 'pixel', 'playstation', 'xbox',
      'switch', 'smartphone', 'smartwatch', 'earbuds', 'bluetooth', 'wireless', 'processor',
      'graphics', 'motherboard', 'ram', 'storage', 'ssd', 'hdd', 'router', 'modem'
    ],
    'Appliances': [
      'blender', 'mixer', 'toaster', 'coffee', 'microwave', 'oven', 'refrigerator', 'dishwasher', 
      'vacuum', 'cleaner', 'air fryer', 'pressure cooker', 'food processor', 'juicer', 'kettle',
      'slow cooker', 'rice cooker', 'stand mixer', 'hand mixer', 'espresso', 'cappuccino'
    ],
    'Clothing': [
      'shirt', 'pants', 'shoes', 'dress', 'jacket', 'coat', 'hat', 'gloves', 'socks', 'underwear',
      'jeans', 'sweater', 'hoodie', 'sneakers', 'boots', 'sandals', 'belt', 'watch', 'jewelry',
      'ring', 'necklace', 'bracelet', 'sunglasses', 'bag', 'purse', 'wallet'
    ],
    'Sports': [
      'bike', 'bicycle', 'ball', 'racket', 'bat', 'glove', 'helmet', 'gear', 'equipment', 'fitness',
      'treadmill', 'dumbbells', 'weights', 'yoga', 'mat', 'basketball', 'football', 'soccer',
      'tennis', 'golf', 'baseball', 'hockey', 'skateboard', 'scooter', 'roller', 'skates'
    ],
    'Books': [
      'book', 'novel', 'textbook', 'manual', 'guide', 'dictionary', 'encyclopedia', 'magazine',
      'journal', 'diary', 'notebook', 'planner', 'calendar', 'cookbook', 'biography', 'fiction'
    ],
    'Toys': [
      'toy', 'game', 'puzzle', 'doll', 'action figure', 'board game', 'card game', 'lego',
      'blocks', 'train', 'car', 'truck', 'airplane', 'robot', 'dinosaur', 'stuffed animal',
      'teddy bear', 'barbie', 'hot wheels', 'nerf', 'water gun'
    ],
    'Home & Garden': [
      'furniture', 'chair', 'table', 'sofa', 'bed', 'mattress', 'pillow', 'blanket', 'curtain',
      'lamp', 'light', 'plant', 'pot', 'garden', 'tools', 'shovel', 'rake', 'hose', 'sprinkler'
    ],
    'Automotive': [
      'car', 'truck', 'motorcycle', 'tire', 'wheel', 'engine', 'battery', 'oil', 'filter',
      'brake', 'suspension', 'exhaust', 'radiator', 'transmission', 'alternator', 'starter'
    ]
  };

  const lowerText = text.toLowerCase();

  // Score each category based on keyword matches
  const categoryScores: { [key: string]: number } = {};
  
  for (const [category, keywords] of Object.entries(categories)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerText)) {
        // Weight longer, more specific keywords higher
        score += keyword.length > 5 ? 2 : 1;
      }
    }
    if (score > 0) {
      categoryScores[category] = score;
    }
  }

  // Return the category with the highest score
  if (Object.keys(categoryScores).length === 0) return undefined;
  
  const bestCategory = Object.entries(categoryScores)
    .sort(([,a], [,b]) => b - a)[0][0];
    
  return bestCategory;
}

function generateProductName(rawTexts: string[], brandName?: string, modelNumber?: string, category?: string): string {
  const parts: string[] = [];
  
  // Start with brand if available
  if (brandName) parts.push(brandName);
  
  // Add model number or descriptive product name
  if (modelNumber) {
    parts.push(modelNumber);
  } else {
    // Extract the most relevant product descriptor
    const descriptiveWords = extractDescriptiveWords(rawTexts.join(' '));
    if (descriptiveWords.length > 0) {
      parts.push(...descriptiveWords.slice(0, 2));
    }
  }
  
  // Add category if it adds value and isn't redundant
  if (category && !parts.some(part => part.toLowerCase().includes(category.toLowerCase()))) {
    const categoryKeywords = ['electronics', 'appliances', 'clothing', 'sports', 'books', 'toys'];
    if (!categoryKeywords.some(keyword => parts.join(' ').toLowerCase().includes(keyword))) {
      parts.push(category);
    }
  }
  
  // Clean up the final product name
  let productName = parts.length > 0 ? parts.join(' ') : rawTexts[0] || 'Unknown Product';
  
  // Remove duplicates and clean up
  const uniqueParts = Array.from(new Set(productName.toLowerCase().split(/\s+/)))
    .map(word => {
      // Find the original case version
      const originalMatch = productName.split(/\s+/).find(p => p.toLowerCase() === word);
      return originalMatch || word;
    });
  
  return uniqueParts.join(' ');
}

function extractDescriptiveWords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'new', 'used', 'authentic', 'original', 'genuine', 'condition', 'excellent', 'good', 'fair', 'poor',
    'size', 'color', 'style', 'type', 'series', 'brand', 'model', 'item', 'product', 'quality',
    'premium', 'standard', 'basic', 'edition', 'version', 'pack', 'set', 'kit', 'bundle'
  ]);

  // Prioritize certain product-relevant words
  const productTerms = new Set([
    'pro', 'max', 'mini', 'plus', 'ultra', 'air', 'lite', 'studio', 'gaming', 'wireless',
    'bluetooth', 'smart', 'digital', 'portable', 'rechargeable', 'waterproof', 'premium'
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word));

  // Sort words by relevance (product terms first, then by length)
  const sortedWords = words.sort((a, b) => {
    const aIsProductTerm = productTerms.has(a) ? 1 : 0;
    const bIsProductTerm = productTerms.has(b) ? 1 : 0;
    
    if (aIsProductTerm !== bIsProductTerm) {
      return bIsProductTerm - aIsProductTerm;
    }
    
    return b.length - a.length;
  });

  // Remove duplicates and return top words
  return Array.from(new Set(sortedWords)).slice(0, 4);
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
