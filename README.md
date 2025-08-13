## Environment setup

Create an `.env.local` in the project root (not committed). You can copy from the template below:

```
# eBay Finding API (sold/complete listings)
# Create at developer.ebay.com → Apps → Create a keyset → Production → App ID
EBAY_APP_ID=

# eBay Browse API (active listings) – requires OAuth client credentials
# From developer.ebay.com → Apps → Your keyset → REST (OAuth) credentials
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=

# Default marketplace and currency
MARKETPLACE_ID=EBAY_US
CURRENCY=USD

# Google Cloud Vision (optional, for non-barcode flow)
# In Google Cloud Console: enable Vision API and create an API key OR a service account
GOOGLE_VISION_API_KEY=

# OpenAI (optional, for normalization fallback)
OPENAI_API_KEY=
```

### Where to get keys
- eBay developer account: `https://developer.ebay.com/` → Sign in → Developer Program → Apps → Create a keyset.
  - For sold comps (Finding API): use the App ID from the Production keyset.
  - For active listings (Browse API): use the REST credentials (Client ID/Client Secret). You must request production access to the Browse API if your account is new.
- Google Cloud Vision: `https://console.cloud.google.com/` → Create a project → Enable Vision API → Create credentials (API key or service account JSON).
- OpenAI: `https://platform.openai.com/api-keys` → Create a new secret key (only needed if you enable LLM normalization).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
