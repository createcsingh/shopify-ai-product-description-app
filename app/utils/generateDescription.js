// utils/generateDescription.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateDescription(productTitle, language = "English") {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Write a plain-text product description in ${language} for a product titled "${productTitle}". Avoid markdown or formatting. Include no headings or placeholders.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return text;
}