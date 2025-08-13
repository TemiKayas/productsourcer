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

    // Try multiple search strategies
    const searchStrategies = [
      'exact_match',
      'brand_product',
      'keywords_only',
      'partial_match'
    ];

    let bestResults: EbayListing[] = [];
    let usedStrategy = '';
    let searchKeywords: string[] = [];

    for (const strategy of searchStrategies) {
      const searchQuery = buildSearchQuery(body, strategy);
      searchKeywords = searchQuery.keywords;
      
      try {
        const listings = await searchEbaySoldListings(searchQuery.query, config.ebay.appId, body.limit || 20);
        
        if (listings.length >= 3) { // Minimum viable results
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

function buildSearchQuery(request: EbaySearchRequest, strategy: string): { query: string; keywords: string[] } {
  const { keywords, brandName, modelNumber } = request;
  
  switch (strategy) {
    case 'exact_match':
      // Use all available information
      const exactParts = [];
      if (brandName) exactParts.push(brandName);
      if (modelNumber) exactParts.push(modelNumber);
      exactParts.push(...keywords.slice(0, 3));
      return {
        query: exactParts.join(' '),
        keywords: exactParts
      };
      
    case 'brand_product':
      // Brand + most relevant keywords
      const brandParts = [];
      if (brandName) brandParts.push(brandName);
      brandParts.push(...keywords.slice(0, 2));
      return {
        query: brandParts.join(' '),
        keywords: brandParts
      };
      
    case 'keywords_only':
      // Top keywords without brand
      const keywordParts = keywords.slice(0, 3);
      return {
        query: keywordParts.join(' '),
        keywords: keywordParts
      };
      
    case 'partial_match':
      // Single most relevant keyword
      return {
        query: keywords[0] || '',
        keywords: [keywords[0] || '']
      };
      
    default:
      return {
        query: keywords.join(' '),
        keywords
      };
  }
}

async function searchEbaySoldListings(query: string, appId: string, limit: number): Promise<EbayListing[]> {
  const endpoint = 'https://svcs.ebay.com/services/search/FindingService/v1';
  
  const params = new URLSearchParams({
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
  });

  const response = await axios.get(`${endpoint}?${params.toString()}`);
  const data: EbayFindingAPIResponse = response.data;
  
  const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];
  
  if (!searchResult?.item) {
    return [];
  }

  const items = searchResult.item;
  
  return items.map(item => {
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
}
