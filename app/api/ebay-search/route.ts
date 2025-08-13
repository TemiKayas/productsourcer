import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getConfig } from '@/lib/env';
import type { 
  EbaySearchRequest, 
  EbaySearchResponse, 
  EbayListing,
  EbayFindingAPIResponse
} from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const config = getConfig();
    const body: EbaySearchRequest = await request.json();
    
    if (!body.keywords || body.keywords.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No search keywords provided'
      } as EbaySearchResponse, { status: 400 });
    }

    // Enhanced search strategies for better results
    const searchStrategies = [
      'exact_brand_model',      // Brand + Model (highest precision)
      'brand_with_keywords',    // Brand + relevant keywords
      'model_with_keywords',    // Model + keywords (for generic brands)
      'keywords_only',          // Just keywords
      'category_search',        // Category-based search
      'partial_match',          // Single most relevant keyword
      'fuzzy_search'           // Relaxed matching
    ];

    let bestResults: EbayListing[] = [];
    let usedStrategy = '';
    let searchKeywords: string[] = [];
    let fallbackResults: { [key: string]: EbayListing[] } = {};

    for (const strategy of searchStrategies) {
      const searchQuery = buildSearchQuery(body, strategy);
      searchKeywords = searchQuery.keywords;
      
      try {
        const listings = await searchEbaySoldListings(
          searchQuery.query, 
          config.ebay.appId, 
          body.limit || 20,
          strategy
        );
        
        // Store results for potential fallback
        fallbackResults[strategy] = listings;
        
        console.log(`Strategy ${strategy}: found ${listings.length} results for query: "${searchQuery.query}"`);
        
        // Quality threshold based on strategy
        const qualityThreshold = getQualityThreshold(strategy);
        
        if (listings.length >= qualityThreshold) {
          bestResults = listings;
          usedStrategy = strategy;
          break;
        }
        
        // Keep best results even if we continue searching
        if (listings.length > bestResults.length) {
          bestResults = listings;
          usedStrategy = strategy;
        }
      } catch (error) {
        console.error(`Search strategy ${strategy} failed:`, error);
        continue;
      }
    }

    // If no strategy found enough results, try combining results
    if (bestResults.length < 3) {
      const combinedResults = combineSearchResults(fallbackResults, body.keywords);
      if (combinedResults.length > bestResults.length) {
        bestResults = combinedResults;
        usedStrategy = 'combined_search';
      }
    }

    if (bestResults.length === 0) {
      return NextResponse.json({
        success: true,
        listings: [],
        averagePrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalFound: 0,
        searchStrategy: 'no_results',
        searchKeywords,
        error: 'No matching listings found'
      } as EbaySearchResponse);
    }

    // Calculate price statistics
    const prices = bestResults.map(listing => listing.price).filter(price => price > 0);
    const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return NextResponse.json({
      success: true,
      listings: bestResults,
      averagePrice: Math.round(averagePrice * 100) / 100,
      minPrice,
      maxPrice,
      totalFound: bestResults.length,
      searchStrategy: usedStrategy,
      searchKeywords,
    } as EbaySearchResponse);

  } catch (error) {
    console.error('eBay search error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      listings: [],
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      totalFound: 0,
      searchStrategy: 'error',
      searchKeywords: [],
    } as EbaySearchResponse, { status: 500 });
  }
}

function getQualityThreshold(strategy: string): number {
  const thresholds: { [key: string]: number } = {
    'exact_brand_model': 2,     // High precision, lower threshold
    'brand_with_keywords': 3,   // Good precision
    'model_with_keywords': 3,   // Good precision
    'keywords_only': 5,         // Lower precision, need more results
    'category_search': 4,       // Medium precision
    'partial_match': 8,         // Very low precision
    'fuzzy_search': 6,          // Low precision
  };
  
  return thresholds[strategy] || 3;
}

function buildSearchQuery(request: EbaySearchRequest, strategy: string): { query: string; keywords: string[] } {
  const { keywords, brandName, modelNumber } = request;
  
  switch (strategy) {
    case 'exact_brand_model':
      // Most precise: Brand + Model + primary keyword
      const exactParts = [];
      if (brandName) exactParts.push(brandName);
      if (modelNumber) exactParts.push(modelNumber);
      if (keywords.length > 0) exactParts.push(keywords[0]);
      return {
        query: exactParts.join(' '),
        keywords: exactParts
      };
      
    case 'brand_with_keywords':
      // Brand + most relevant keywords (no model to allow variants)
      const brandParts = [];
      if (brandName) brandParts.push(brandName);
      brandParts.push(...keywords.slice(0, 2));
      return {
        query: brandParts.join(' '),
        keywords: brandParts
      };
      
    case 'model_with_keywords':
      // Model + keywords (good for products with generic brands)
      const modelParts = [];
      if (modelNumber) modelParts.push(modelNumber);
      modelParts.push(...keywords.slice(0, 2));
      return {
        query: modelParts.join(' '),
        keywords: modelParts
      };
      
    case 'keywords_only':
      // Top 3 keywords without brand/model constraints
      const keywordParts = keywords.slice(0, 3);
      return {
        query: keywordParts.join(' '),
        keywords: keywordParts
      };
      
    case 'category_search':
      // Use category-like terms for broader search
      const categoryTerms = keywords.filter(kw => 
        ['phone', 'laptop', 'tablet', 'gaming', 'console', 'camera', 'headphones'].includes(kw.toLowerCase())
      );
      const searchTerms = categoryTerms.length > 0 ? categoryTerms : keywords.slice(0, 2);
      if (brandName && categoryTerms.length > 0) {
        searchTerms.unshift(brandName);
      }
      return {
        query: searchTerms.join(' '),
        keywords: searchTerms
      };
      
    case 'partial_match':
      // Single most relevant keyword for very broad search
      return {
        query: keywords[0] || '',
        keywords: [keywords[0] || '']
      };
      
    case 'fuzzy_search':
      // Relaxed search with common variations
      const fuzzyTerms = [];
      if (brandName) {
        // Add brand variations
        fuzzyTerms.push(brandName);
        if (brandName.toLowerCase() === 'apple') fuzzyTerms.push('iphone', 'ipad');
        if (brandName.toLowerCase() === 'samsung') fuzzyTerms.push('galaxy');
      }
      fuzzyTerms.push(...keywords.slice(0, 1));
      return {
        query: fuzzyTerms.join(' '),
        keywords: fuzzyTerms
      };
      
    default:
      return {
        query: keywords.join(' '),
        keywords
      };
  }
}

function combineSearchResults(fallbackResults: { [key: string]: EbayListing[] }, originalKeywords: string[]): EbayListing[] {
  const combinedListings: EbayListing[] = [];
  const seenUrls = new Set<string>();
  
  // Prioritize results by strategy quality
  const strategyPriority = [
    'exact_brand_model',
    'brand_with_keywords', 
    'model_with_keywords',
    'keywords_only',
    'category_search',
    'partial_match',
    'fuzzy_search'
  ];
  
  for (const strategy of strategyPriority) {
    const listings = fallbackResults[strategy] || [];
    for (const listing of listings) {
      if (!seenUrls.has(listing.url) && combinedListings.length < 20) {
        seenUrls.add(listing.url);
        combinedListings.push(listing);
      }
    }
  }
  
  return combinedListings;
}

async function searchEbaySoldListings(query: string, appId: string, limit: number, strategy?: string): Promise<EbayListing[]> {
  const endpoint = 'https://svcs.ebay.com/services/search/FindingService/v1';
  
  // Build base parameters
  const baseParams = {
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'keywords': query,
    'paginationInput.entriesPerPage': Math.min(limit, 100).toString(),
    'sortOrder': 'EndTimeSoonest',
    // Only get sold/completed items
    'itemFilter(0).name': 'SoldItemsOnly',
    'itemFilter(0).value': 'true',
    // Items sold in last 90 days
    'itemFilter(1).name': 'EndTimeFrom',
    'itemFilter(1).value': new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    // Exclude auctions that ended without sale
    'itemFilter(2).name': 'MinPrice',
    'itemFilter(2).value': '1.00',
  };

  // Add strategy-specific filters
  let filterIndex = 3;
  const additionalParams: { [key: string]: string } = {};

  if (strategy === 'exact_brand_model' || strategy === 'brand_with_keywords') {
    // Stricter matching for brand-specific searches
    additionalParams[`itemFilter(${filterIndex}).name`] = 'MaxPrice';
    additionalParams[`itemFilter(${filterIndex}).value`] = '10000.00'; // Reasonable upper limit
    filterIndex++;
  }

  if (strategy === 'partial_match' || strategy === 'fuzzy_search') {
    // Broader time range for less specific searches
    additionalParams['itemFilter(1).value'] = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Combine all parameters
  const allParams = { ...baseParams, ...additionalParams };
  const params = new URLSearchParams(allParams);

  const response = await axios.get(`${endpoint}?${params.toString()}`);
  const data: EbayFindingAPIResponse = response.data;
  
  const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];
  
  if (!searchResult?.item) {
    return [];
  }

  const items = searchResult.item;
  
  const listings = items.map(item => {
    const title = item.title?.[0] || '';
    const priceInfo = item.sellingStatus?.[0]?.convertedCurrentPrice?.[0];
    const price = priceInfo ? parseFloat(priceInfo.__value__) : 0;
    const currency = priceInfo?.['@currencyId'] || 'USD';
    const condition = item.condition?.[0]?.conditionDisplayName?.[0] || 'Unknown';
    const endDate = item.listingInfo?.[0]?.endTime?.[0] || '';
    const url = item.viewItemURL?.[0] || '';
    const imageUrl = item.galleryURL?.[0];
    const listingType = item.listingInfo?.[0]?.listingType?.[0] as 'auction' | 'fixed' || 'auction';
    
    const shippingInfo = item.shippingInfo?.[0]?.shippingServiceCost?.[0];
    const shippingCost = shippingInfo ? parseFloat(shippingInfo.__value__) : undefined;

    return {
      title,
      price,
      currency,
      condition,
      endDate,
      url,
      imageUrl,
      shippingCost,
      soldDate: endDate,
      listingType,
    } as EbayListing;
  }).filter(listing => listing.price > 0); // Only return items with valid prices

  // Apply strategy-specific filtering and sorting
  return filterAndSortListings(listings, strategy, query);
}

function filterAndSortListings(listings: EbayListing[], strategy?: string, query?: string): EbayListing[] {
  if (!strategy || !query) return listings;

  const queryWords = query.toLowerCase().split(/\s+/);
  
  // Score each listing based on relevance to the search
  const scoredListings = listings.map(listing => {
    let relevanceScore = 0;
    const titleLower = listing.title.toLowerCase();
    
    // Exact word matches in title
    for (const word of queryWords) {
      if (word.length > 2) {
        if (titleLower.includes(word)) {
          relevanceScore += word.length; // Longer words are more significant
        }
        // Partial matches for model numbers and brands
        if (word.match(/^[a-z]+\d+|^\d+[a-z]+/i) && titleLower.includes(word)) {
          relevanceScore += word.length * 2; // Model numbers are very relevant
        }
      }
    }
    
    // Bonus for good condition
    if (listing.condition.toLowerCase().includes('new')) {
      relevanceScore += 5;
    } else if (listing.condition.toLowerCase().includes('excellent')) {
      relevanceScore += 3;
    }
    
    // Penalty for very old listings (more than 60 days)
    const listingAge = Date.now() - new Date(listing.endDate).getTime();
    const daysOld = listingAge / (1000 * 60 * 60 * 24);
    if (daysOld > 60) {
      relevanceScore -= Math.min(daysOld - 60, 10);
    }
    
    return { ...listing, relevanceScore };
  });
  
  // Filter out listings with very low relevance for precise strategies
  let filteredListings = scoredListings;
  if (strategy === 'exact_brand_model' || strategy === 'brand_with_keywords') {
    filteredListings = scoredListings.filter(listing => listing.relevanceScore > 3);
  }
  
  // Sort by relevance score, then by recency
  return filteredListings
    .sort((a, b) => {
      if (Math.abs(a.relevanceScore - b.relevanceScore) < 2) {
        // If scores are close, prefer more recent sales
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      }
      return b.relevanceScore - a.relevanceScore;
    })
    .map(({ relevanceScore, ...listing }) => listing); // Remove score from final result
}
