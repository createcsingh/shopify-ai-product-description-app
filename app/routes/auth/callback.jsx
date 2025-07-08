import { authenticate, registerWebhooks } from "~/shopify.server";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const { session } = await authenticate.callback(request);

  console.log("🔐 OAuth callback triggered");

  if (!session || !session.shop) {
    console.error("❌ No session or shop in callback.");
    throw new Error("Missing session or shop.");
  }

  console.log("✅ Authenticated:", session.shop);

  const result = await registerWebhooks(session);
  console.log("✅ Webhooks registered:", result);

  return redirect("/app");
};