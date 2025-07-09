export function getEnv() {
  if (typeof process === "undefined") {
    throw new Error("process is undefined. Did you access env vars in a wrong context?");
  }

  const required = [
    "SHOPIFY_API_KEY",
    "SHOPIFY_API_SECRET",
    "GEMINI_API_KEY",
    "SCOPES",
    "SHOPIFY_APP_URL"
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing environment variable: ${key}`);
    }
  }

  return {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY!,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET!,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
    SCOPES: process.env.SCOPES!,
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL!,
    SHOP_CUSTOM_DOMAIN: process.env.SHOP_CUSTOM_DOMAIN || "",
  };
}