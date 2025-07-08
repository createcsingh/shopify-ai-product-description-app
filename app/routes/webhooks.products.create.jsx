import { shopify } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    // This automatically handles validation, logging, etc.
    return await shopify.webhooks.process(request);
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
};

export const loader = async () => {
  // Prevents accidental GET access
  return new Response("Not Found", { status: 404 });
};