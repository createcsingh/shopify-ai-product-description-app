import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { DeliveryMethod } from "@shopify/shopify-api";
import { generateDescription } from "./utils/generateDescription";
import { getEnv } from "./utils/env.server";

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  GEMINI_API_KEY,
  SCOPES,
  SHOPIFY_APP_URL,
  SHOP_CUSTOM_DOMAIN,
} = getEnv();

const shopify = shopifyApp({
  apiKey: SHOPIFY_API_KEY,
  apiSecretKey: SHOPIFY_API_SECRET,
  apiGeminiKey: GEMINI_API_KEY,
  apiVersion: ApiVersion.January25,
  scopes: SCOPES.split(","),
  appUrl: SHOPIFY_APP_URL,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,

  webhooks: {
    PRODUCTS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/products/create",
      callback: async (_topic, shop, body, _webhookId, session) => {
        console.log(`Webhook received from ${shop}`);
        try {
          const product = JSON.parse(body);
          const productId = product.id;
          const productTitle = product.title;

          const admin = new shopify.api.clients.Graphql({ session });

          // 🔍 Check auto-generate setting
          const settingsResponse = await admin.query({
            data: {
              query: `
                {
                  shop {
                    metafield(namespace: "product_ai", key: "auto_generate_enabled") {
                      value
                    }
                  }
                }
              `,
            },
          });

          const isEnabled =
            settingsResponse?.body?.data?.shop?.metafield?.value === "true";

          if (!isEnabled) {
            console.log("❌ Auto-generation disabled.");
            return;
          }

          // 🤖 Generate description
          const description = await generateDescription(productTitle, "English");

          // 🛍️ Update product
          const restClient = new shopify.api.rest.RestClient({ session });
          await restClient.put({
            path: `products/${productId}`,
            data: {
              product: {
                id: productId,
                body_html: description,
              },
            },
            type: "application/json",
          });

          console.log("✅ Product description updated.");
        } catch (error) {
          console.error("❌ Webhook error:", error);
        }
      },
    },
  },

  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
