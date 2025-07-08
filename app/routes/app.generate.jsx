import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  IndexTable,
  Text,
  useIndexResourceState,
  Card,
  Page,
  Button,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { generateDescription } from "../utils/generateDescription";

// -----------------------------
// Loader: Fetch products
// -----------------------------
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(`
    {
      products(first: 10) {
        edges {
          node {
            id
            title
            descriptionHtml
          }
        }
      }
    }
  `);

  const jsonData = await response.json();
  return jsonData.data.products.edges;
};

// -----------------------------
// Action: Update product via Gemini
// -----------------------------
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId");
  const productTitle = formData.get("productTitle");
  const language = formData.get("language") || "English";

  const generated = await generateDescription(productTitle, language);

  await admin.graphql(`
    mutation {
      productUpdate(input: {
        id: "${productId}",
        descriptionHtml: "${generated.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"
      }) {
        product { id }
      }
    }
  `);

  return null;
};

// -----------------------------
// Component: ProductRow
// -----------------------------
function ProductRow({ node, index, selectedResources, shopify, language }) {
  const fetcher = useFetcher();

  const plainDesc = node.descriptionHtml.replace(/<[^>]*>?/gm, "");
  const trimmedDesc =
    plainDesc.length > 100 ? plainDesc.slice(0, 100) + "..." : plainDesc;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data !== undefined) {
      shopify.toast?.show("AI description updated!");
    }
  }, [fetcher.state, fetcher.data, shopify]);

  return (
    <IndexTable.Row
      id={node.id}
      key={node.id}
      selected={selectedResources.includes(node.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {node.title}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{trimmedDesc}</IndexTable.Cell>
      <IndexTable.Cell>
        <fetcher.Form method="post">
          <input type="hidden" name="productId" value={node.id} />
          <input type="hidden" name="productTitle" value={node.title} />
          <input type="hidden" name="language" value={language} /> {/* 👈 hidden field */}
          <Button
            submit
            size="slim"
            loading={fetcher.state !== "idle"}
            onClick={(e) => e.stopPropagation()}
          >
            Generate
          </Button>
        </fetcher.Form>
      </IndexTable.Cell>
    </IndexTable.Row>
  );
}

// -----------------------------
// Component: GeneratePage
// -----------------------------
export default function GeneratePage() {
  const products = useLoaderData();
  const shopify = useAppBridge();

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products.map(({ node }) => node.id));

  const [language, setLanguage] = useState("English");

  if (!products || products.length === 0) {
    return (
      <Page title="AI Description Generator">
        <Text>No products found.</Text>
      </Page>
    );
  }

  const rows = products.map(({ node }, index) => (
    <ProductRow
      key={node.id}
      node={node}
      index={index}
      selectedResources={selectedResources}
      shopify={shopify}
      language={language}
    />
  ));

  return (
    <Page title="AI Description Generator">
      <div style={{ maxWidth: "200px", marginBottom: "1rem" }}>
        <label htmlFor="languageSelect">
          <Text variant="bodyMd" fontWeight="bold" as="span">
            Select Language
          </Text>
        </label>
        <select
          id="languageSelect"
          name="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ marginTop: "0.25rem", width: "100%", padding: "0.25rem" }}
        >
          <option value="English">English</option>
          <option value="Hindi">Hindi</option>
          <option value="Spanish">Spanish</option>
          <option value="French">French</option>
          <option value="German">German</option>
        </select>
      </div>

      <Card>
        <IndexTable
          resourceName={{ singular: "product", plural: "products" }}
          itemCount={products.length}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: "Title" },
            { title: "Description" },
            { title: "Actions" },
          ]}
        >
          {rows}
        </IndexTable>
      </Card>
    </Page>
  );
}