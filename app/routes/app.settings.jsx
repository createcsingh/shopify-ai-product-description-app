import { useEffect, useState } from "react";
import {
  useActionData,
  Form,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import {
  Card,
  Page,
  Layout,
  SettingToggle,
  Toast,
  Frame,
  FormLayout,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Metafield namespace & key
const metafieldNamespace = "product_ai";
const metafieldKey = "auto_generate_enabled";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`{
    shop {
      metafield(namespace: "${metafieldNamespace}", key: "${metafieldKey}") {
        value
      }
    }
  }`);

  const data = await response.json();
  const currentValue = data?.data?.shop?.metafield?.value === "true";

  return { enabled: currentValue, shopifyAppUrl: process.env.SHOPIFY_APP_URL };
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const enabled = formData.get("auto_generate_enabled") === "true";

  const { admin } = await authenticate.admin(request);

  const shopResponse = await admin.graphql(`{ shop { id } }`);
  const shopData = await shopResponse.json();
  const shopId = shopData?.data?.shop?.id;

  if (!shopId) {
    return { success: false, error: "Shop ID not found." };
  }

  const setResponse = await admin.graphql(`mutation {
    metafieldsSet(metafields: [{
      namespace: "${metafieldNamespace}",
      key: "${metafieldKey}",
      type: "boolean",
      value: "${enabled}",
      ownerId: "${shopId}"
    }]) {
      metafields { id value }
      userErrors { field message }
    }
  }`);

  const setData = await setResponse.json();
  const metafieldsSet = setData?.data?.metafieldsSet;

  if (!metafieldsSet || metafieldsSet.userErrors.length > 0) {
    return {
      success: false,
      error:
        metafieldsSet?.userErrors?.[0]?.message ||
        "Failed to update metafield.",
    };
  }

  return { success: true, enabled };
};

export default function SettingsPage() {
  const data = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  const [enabled, setEnabled] = useState(actionData?.enabled ?? data.enabled);
  const [toastActive, setToastActive] = useState(false);

  useEffect(() => {
    if (actionData?.enabled !== undefined) {
      setEnabled(actionData.enabled);
    }
    if (actionData?.success) {
      setToastActive(true);
    }
  }, [actionData]);

  const toggleToast = () => setToastActive(false);

  const isSubmitting = navigation.state === "submitting";

  return (
    <Frame>
      <Page title="Settings">
        <Layout>
          <Layout.Section>
            <Card sectioned>
              <Form method="post" onSubmit={() => setEnabled(!enabled)}>
                <FormLayout>
                  <SettingToggle
                    action={{
                      content: enabled ? "Disable" : "Enable",
                      submit: true,
                    }}
                    enabled={enabled}
                  >
                    Auto-generate product descriptions when new products are
                    added.
                  </SettingToggle>
                  <input
                    type="hidden"
                    name="auto_generate_enabled"
                    value={!enabled}
                  />
                </FormLayout>
              </Form>
            </Card>

            {/* 👇 Manual Webhook Setup Instructions */}
            <Card title="Webhook Setup (Manual)" sectioned style={{ marginTop: '2rem' }}>
              <p>
                To enable automatic product description generation, please
                create the following webhook:
              </p>
              <ul>
                <li>
                  <strong>Event:</strong> Product creation
                </li>
                <li>
                  <strong>URL:</strong>{" "}
                  <code>{data.shopifyAppUrl}/webhooks/products/create</code>
                </li>
                <li>
                  <strong>Format:</strong> JSON
                </li>
              </ul>
              <p>
                👉 Go to{" "}
                <a
                  href="https://admin.shopify.com/store/myteststore06/settings/notifications"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Shopify Admin → Settings → Notifications → Webhooks
                </a>{" "}
                and click <strong>"Create webhook"</strong> to complete the
                setup.
              </p>
            </Card>
          </Layout.Section>
        </Layout>

        {toastActive && (
          <Toast
            content="Settings updated successfully"
            onDismiss={toggleToast}
          />
        )}

        {actionData?.error && (
          <Toast content={actionData.error} error onDismiss={toggleToast} />
        )}
      </Page>
    </Frame>
  );
}
