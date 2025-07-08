import { authenticate, registerWebhooks } from "../shopify.server";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session || !session.shop) {
    console.error("❌ No session or shop found");
    throw new Error("Missing session or shop info.");
  }

  console.log("🔧 Registering webhooks for shop:", session.shop);
  const result = await registerWebhooks(session);
  console.log("✅ Webhook registration result:", result);

  return redirect("/app");
};