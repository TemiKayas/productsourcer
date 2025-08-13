# ProductSource API Documentation

This document describes the API endpoints for the ProductSource application's "Google Lens" functionality.

## Overview

The ProductSource API provides a complete product recognition and pricing pipeline that consists of:

1. **Image Analysis** - Extract text and product information from images using Google Vision API
2. **Product Normalization** - Clean and structure extracted text into searchable product information  
3. **eBay Price Lookup** - Search eBay's sold listings to get market pricing data

## API Endpoints

### POST `/api/analyze-image`

Analyzes an uploaded image to extract product information using Google Vision API.

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..." // base64 encoded image
}
```

**Response:**
```json
{
  "success": true,
  "extractedTexts": [
    {
      "text": "iPhone 14 Pro",
      "confidence": 0.95,
      "boundingBox": {
        "x": 100,
        "y": 50,
        "width": 200,
        "height": 30
      }
    }
  ],
  "productKeywords": ["iphone", "14", "pro", "apple"],
  "brandName": "Apple",
  "modelNumber": "A2894",
  "barcode": "194253524472",
  "confidence": 0.85,
  "processingTime": 1200
}
```

### POST `/api/product-normalize`

Normalizes raw extracted text into structured product information.

**Request Body:**
```json
{
  "rawText": ["iPhone 14 Pro", "128GB", "Space Black", "Apple"],
  "context": "product_name"
}
```

**Response:**
```json
{
  "success": true,
  "normalized": {
    "productName": "Apple iPhone 14 Pro",
    "brandName": "Apple",
    "modelNumber": "14",
    "category": "Electronics",
    "searchKeywords": ["apple", "iphone", "14", "pro", "128gb"],
    "confidence": 0.8
  },
  "originalTexts": ["iPhone 14 Pro", "128GB", "Space Black", "Apple"],
  "processingMethod": "rules"
}
```

### POST `/api/ebay-search`

Searches eBay sold listings for pricing information.

**Request Body:**
```json
{
  "keywords": ["apple", "iphone", "14", "pro"],
  "brandName": "Apple",
  "modelNumber": "14",
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "listings": [
    {
      "title": "Apple iPhone 14 Pro 128GB Space Black Unlocked",
      "price": 899.99,
      "currency": "USD",
      "condition": "Used",
      "endDate": "2024-01-15T10:30:00Z",
      "url": "https://www.ebay.com/itm/123456789",
      "imageUrl": "https://i.ebayimg.com/images/g/abc/s-l500.jpg",
      "soldDate": "2024-01-15T10:30:00Z",
      "listingType": "auction"
    }
  ],
  "averagePrice": 899.99,
  "minPrice": 750.00,
  "maxPrice": 999.99,
  "totalFound": 15,
  "searchStrategy": "exact_match",
  "searchKeywords": ["apple", "iphone", "14", "pro"]
}
```

### POST `/api/analyze-complete`

Complete end-to-end analysis that combines all three steps above.

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..." // base64 encoded image
}
```

**Response:**
```json
{
  "success": true,
  "productInfo": {
    "extractedTexts": ["iPhone 14 Pro", "128GB", "Apple"],
    "normalized": {
      "productName": "Apple iPhone 14 Pro",
      "brandName": "Apple",
      "modelNumber": "14",
      "category": "Electronics",
      "searchKeywords": ["apple", "iphone", "14", "pro"],
      "confidence": 0.8
    },
    "confidence": 0.82
  },
  "pricing": {
    "listings": [...],
    "averagePrice": 899.99,
    "minPrice": 750.00,
    "maxPrice": 999.99,
    "totalFound": 15
  },
  "searchStrategy": "exact_match",
  "processingTime": 3500
}
```

## Environment Variables

Make sure to set up the following environment variables in `.env.local`:

```bash
# eBay API credentials
EBAY_APP_ID=your_ebay_app_id
EBAY_CLIENT_ID=your_ebay_client_id  
EBAY_CLIENT_SECRET=your_ebay_client_secret
MARKETPLACE_ID=EBAY_US
CURRENCY=USD

# Google Vision API
GOOGLE_VISION_API_KEY=your_google_vision_api_key

# OpenAI (optional, for advanced text normalization)
OPENAI_API_KEY=your_openai_api_key
```

## Error Handling

All endpoints return a consistent error format:

```json
{
  "success": false,
  "error": "Descriptive error message",
  // ... other fields with default/empty values
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `500` - Internal Server Error (API failures, configuration issues)

## Rate Limits

- Google Vision API: 1,800 requests per minute
- eBay Finding API: 5,000 requests per day (default)
- Consider implementing client-side rate limiting for production use

## Testing

You can test the APIs using curl:

```bash
# Test image analysis
curl -X POST http://localhost:3000/api/analyze-image \
  -H "Content-Type: application/json" \
  -d '{"image":"data:image/jpeg;base64,..."}'

# Test complete analysis
curl -X POST http://localhost:3000/api/analyze-complete \
  -H "Content-Type: application/json" \
  -d '{"image":"data:image/jpeg;base64,..."}'
```

## Next Steps

1. Set up your API keys in `.env.local`
2. Test the endpoints with sample images
3. Integrate with the frontend PhotoUpload component
4. Add error handling and loading states to the UI
5. Implement retry logic for failed API calls
