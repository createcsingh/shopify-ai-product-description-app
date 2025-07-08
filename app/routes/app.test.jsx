export const loader = () => {
  console.log("✅ /test route hit");
  return new Response("Hello from test!");
};