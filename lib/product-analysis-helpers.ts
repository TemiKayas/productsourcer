// Product Analysis Helper Functions
// Provides fallback strategies and edge case handling for Google Lens-like functionality

export interface ProductAnalysisQuality {
  textQuality: number;
  brandConfidence: number;
  modelConfidence: number;
  overallScore: number;
  recommendations: string[];
}

export interface FallbackStrategy {
  name: string;
  description: string;
  keywords: string[];
  confidence: number;
}

/**
 * Assesses the quality of product analysis results
 */
export function assessAnalysisQuality(
  extractedTexts: string[],
  brandName?: string,
  modelNumber?: string,
  keywords: string[] = []
): ProductAnalysisQuality {
  const recommendations: string[] = [];
  
  // Text quality assessment
  let textQuality = 0;
  if (extractedTexts.length > 0) {
    const avgLength = extractedTexts.reduce((sum, text) => sum + text.length, 0) / extractedTexts.length;
    textQuality = Math.min(avgLength / 20, 1.0); // Normalize based on average text length
    
    if (avgLength < 10) {
      recommendations.push('Image may have poor text quality - try a clearer image');
    }
  } else {
    recommendations.push('No text found in image - ensure product labels/text are visible');
  }
  
  // Brand confidence
  const brandConfidence = brandName ? 0.8 : 0.2;
  if (!brandName) {
    recommendations.push('Brand not detected - try focusing on brand logos or names');
  }
  
  // Model confidence
  const modelConfidence = modelNumber ? 0.7 : 0.3;
  if (!modelNumber) {
    recommendations.push('Model number not detected - try including product model/part numbers');
  }
  
  // Keyword quality
  const keywordQuality = Math.min(keywords.length / 5, 1.0);
  if (keywords.length < 3) {
    recommendations.push('Limited product keywords found - try including more product details in the image');
  }
  
  const overallScore = (textQuality * 0.3) + (brandConfidence * 0.3) + (modelConfidence * 0.2) + (keywordQuality * 0.2);
  
  return {
    textQuality,
    brandConfidence,
    modelConfidence,
    overallScore,
    recommendations
  };
}

/**
 * Generates fallback search strategies when primary analysis fails
 */
export function generateFallbackStrategies(
  extractedTexts: string[],
  detectedLabels: string[] = [],
  detectedObjects: string[] = []
): FallbackStrategy[] {
  const strategies: FallbackStrategy[] = [];
  
  // Strategy 1: Use image labels as product keywords
  if (detectedLabels.length > 0) {
    const labelKeywords = detectedLabels
      .filter(label => !isGenericLabel(label))
      .slice(0, 3);
      
    strategies.push({
      name: 'label_based_search',
      description: 'Search based on detected image labels',
      keywords: labelKeywords,
      confidence: 0.6
    });
  }
  
  // Strategy 2: Use detected objects for category search
  if (detectedObjects.length > 0) {
    const objectKeywords = detectedObjects
      .filter(obj => isProductCategory(obj))
      .slice(0, 2);
      
    strategies.push({
      name: 'category_based_search',
      description: 'Search based on detected product category',
      keywords: objectKeywords,
      confidence: 0.5
    });
  }
  
  // Strategy 3: Extract partial words from text
  if (extractedTexts.length > 0) {
    const partialKeywords = extractPartialKeywords(extractedTexts.join(' '));
    
    if (partialKeywords.length > 0) {
      strategies.push({
        name: 'partial_text_search',
        description: 'Search using partial text matches',
        keywords: partialKeywords,
        confidence: 0.4
      });
    }
  }
  
  // Strategy 4: Generic product type search
  const genericKeywords = inferGenericProductType(extractedTexts, detectedLabels, detectedObjects);
  if (genericKeywords.length > 0) {
    strategies.push({
      name: 'generic_product_search',
      description: 'Search using inferred product type',
      keywords: genericKeywords,
      confidence: 0.3
    });
  }
  
  return strategies.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Handles common edge cases in product recognition
 */
export function handleEdgeCases(
  extractedTexts: string[],
  imageMetadata?: { width?: number; height?: number; fileSize?: number }
): { isEdgeCase: boolean; edgeType: string; suggestion: string } {
  
  // Edge case 1: Image too small or low resolution
  if (imageMetadata?.width && imageMetadata.width < 300) {
    return {
      isEdgeCase: true,
      edgeType: 'low_resolution',
      suggestion: 'Image resolution is too low. Try using a higher resolution image (at least 300x300 pixels).'
    };
  }
  
  // Edge case 2: Foreign language text
  if (extractedTexts.some(text => containsForeignCharacters(text))) {
    return {
      isEdgeCase: true,
      edgeType: 'foreign_language',
      suggestion: 'Foreign language text detected. Product recognition works best with English text.'
    };
  }
  
  // Edge case 3: Handwritten text
  if (extractedTexts.some(text => looksLikeHandwriting(text))) {
    return {
      isEdgeCase: true,
      edgeType: 'handwritten_text',
      suggestion: 'Handwritten text detected. Try focusing on printed text, labels, or packaging.'
    };
  }
  
  // Edge case 4: Multiple products in image
  if (extractedTexts.length > 10 && hasMultipleProductIndicators(extractedTexts)) {
    return {
      isEdgeCase: true,
      edgeType: 'multiple_products',
      suggestion: 'Multiple products detected. Try focusing on a single product for better accuracy.'
    };
  }
  
  // Edge case 5: Very little text
  if (extractedTexts.join('').length < 10) {
    return {
      isEdgeCase: true,
      edgeType: 'insufficient_text',
      suggestion: 'Very little text found. Ensure product labels, brand names, or model numbers are clearly visible.'
    };
  }
  
  return { isEdgeCase: false, edgeType: '', suggestion: '' };
}

/**
 * Suggests image improvements for better recognition
 */
export function suggestImageImprovements(quality: ProductAnalysisQuality): string[] {
  const suggestions: string[] = [];
  
  if (quality.textQuality < 0.5) {
    suggestions.push('Take a closer photo of product text and labels');
    suggestions.push('Ensure good lighting to improve text clarity');
    suggestions.push('Avoid blurry or out-of-focus images');
  }
  
  if (quality.brandConfidence < 0.5) {
    suggestions.push('Include brand logos or brand names in the image');
    suggestions.push('Focus on product packaging or official labels');
  }
  
  if (quality.modelConfidence < 0.5) {
    suggestions.push('Include model numbers, part numbers, or product codes');
    suggestions.push('Look for technical specifications or product details');
  }
  
  if (quality.overallScore < 0.4) {
    suggestions.push('Try a different angle that shows more product information');
    suggestions.push('Use better lighting to enhance text visibility');
    suggestions.push('Remove any objects that might be obscuring product details');
  }
  
  return suggestions;
}

// Helper functions
function isGenericLabel(label: string): boolean {
  const genericLabels = ['product', 'item', 'object', 'thing', 'stuff', 'image', 'photo'];
  return genericLabels.includes(label.toLowerCase());
}

function isProductCategory(obj: string): boolean {
  const productCategories = [
    'phone', 'laptop', 'tablet', 'computer', 'gaming', 'console', 'camera',
    'headphones', 'speaker', 'watch', 'electronics', 'appliance', 'tool'
  ];
  return productCategories.some(cat => obj.toLowerCase().includes(cat));
}

function extractPartialKeywords(text: string): string[] {
  // Extract words that look like they could be part of product names
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !isStopWord(word));
  
  return words.slice(0, 3);
}

function inferGenericProductType(
  texts: string[],
  labels: string[],
  objects: string[]
): string[] {
  const allContent = [...texts, ...labels, ...objects].join(' ').toLowerCase();
  
  const productTypes = [
    { keywords: ['phone', 'mobile', 'cellular'], type: 'smartphone' },
    { keywords: ['laptop', 'computer', 'pc'], type: 'computer' },
    { keywords: ['tablet', 'ipad'], type: 'tablet' },
    { keywords: ['game', 'gaming', 'console'], type: 'gaming console' },
    { keywords: ['camera', 'photo'], type: 'camera' },
    { keywords: ['headphone', 'earphone', 'audio'], type: 'audio device' },
    { keywords: ['watch', 'timepiece'], type: 'watch' },
  ];
  
  for (const { keywords, type } of productTypes) {
    if (keywords.some(keyword => allContent.includes(keyword))) {
      return [type];
    }
  }
  
  return [];
}

function containsForeignCharacters(text: string): boolean {
  // Simple check for non-Latin characters
  return /[^\u0000-\u007F\u00C0-\u00FF]/.test(text);
}

function looksLikeHandwriting(text: string): boolean {
  // Heuristic: handwriting often has inconsistent spacing and mixed case
  const hasInconsistentSpacing = /\w\s{2,}\w/.test(text);
  const hasMixedCase = /[a-z][A-Z]|[A-Z][a-z][A-Z]/.test(text);
  const hasUnusualCharacters = /[^\w\s\-.,!?]/.test(text);
  
  return hasInconsistentSpacing || hasMixedCase || hasUnusualCharacters;
}

function hasMultipleProductIndicators(texts: string[]): boolean {
  const productIndicators = texts.filter(text => 
    /\$\d+|\d+\.\d{2}|model|price|brand/.test(text.toLowerCase())
  );
  
  return productIndicators.length > 3;
}

function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
  ]);
  
  return stopWords.has(word.toLowerCase());
}
