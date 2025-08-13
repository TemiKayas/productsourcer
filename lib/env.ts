// Environment variable validation and configuration

interface Config {
  ebay: {
    appId: string;
    clientId: string;
    clientSecret: string;
    marketplaceId: string;
    currency: string;
  };
  google: {
    visionApiKey?: string;
  };
  openai: {
    apiKey?: string;
  };
}

function validateEnvVar(name: string, value: string | undefined, required: boolean = true): string {
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value || '';
}

export function getConfig(): Config {
  return {
    ebay: {
      appId: validateEnvVar('EBAY_APP_ID', process.env.EBAY_APP_ID),
      clientId: validateEnvVar('EBAY_CLIENT_ID', process.env.EBAY_CLIENT_ID),
      clientSecret: validateEnvVar('EBAY_CLIENT_SECRET', process.env.EBAY_CLIENT_SECRET),
      marketplaceId: process.env.MARKETPLACE_ID || 'EBAY_US',
      currency: process.env.CURRENCY || 'USD',
    },
    google: {
      visionApiKey: validateEnvVar('GOOGLE_VISION_API_KEY', process.env.GOOGLE_VISION_API_KEY, false),
    },
    openai: {
      apiKey: validateEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY, false),
    },
  };
}

export function validateConfig(): { isValid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  
  try {
    getConfig();
    return { isValid: true, missingVars: [] };
  } catch (error) {
    if (error instanceof Error) {
      const match = error.message.match(/Missing required environment variable: (.+)/);
      if (match) {
        missingVars.push(match[1]);
      }
    }
    return { isValid: false, missingVars };
  }
}
