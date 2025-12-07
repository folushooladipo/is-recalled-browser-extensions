/**
 * Transformers.js-based page analyzer
 * Privacy-focused, runs entirely locally
 *
 * To use:
 * 1. npm install @huggingface/transformers
 * 2. Replace content.ts logic with this approach
 */

import {
  Chat,
  pipeline,
  TextGenerationOutput,
} from "@huggingface/transformers";

function isChat(item: any): item is Chat {
  return (
    Array.isArray(item) &&
    item.every((item) => "role" in item && "content" in item)
  );
}

// Note: This is an example implementation
// Transformers.js models are loaded on-demand and cached

interface PageAnalysisResult {
  pageType: "PRODUCT_LIST" | "PRODUCT_DETAIL" | "OTHER";
  products: Array<{
    productName: string;
    clientProductId: string;
    isPrimary?: boolean;
  }>;
}

/**
 * Extract text content from HTML
 */
function extractTextContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove script and style elements
  const scripts = doc.querySelectorAll(
    "script, style, nav, footer, meta, link, noscript, iframe, object, embed, base"
  );
  scripts.forEach((el) => el.remove());

  // Get text content
  return doc.body?.textContent || "";
}

/**
 * Analyze page using Transformers.js
 *
 * Note: This requires installing @huggingface/transformers
 * The models will be downloaded and cached on first use
 */
export async function analyzePageWithTransformers(
  htmlContent: string,
  url: string
): Promise<PageAnalysisResult> {
  const textContent = extractTextContent(htmlContent);

  // Truncate to reasonable length for local processing
  const truncatedContent = textContent.substring(0, 2000);

  try {
    // Option 1: Use a text generation model for both classification and extraction
    const generator = await pipeline(
      "text-generation",
      "Xenova/Qwen2-0.5B-Instruct", // Small, fast model
      {
        // Use local files if available, otherwise download
        // quantized: true, // Use quantized model for better performance
      }
    );

    const prompt = `Analyze this webpage content and determine:
1. Is this a product list page, product detail page, or neither?
2. If it's a product page, extract all product names.

Content: ${truncatedContent}

Respond in JSON format:
{
  "pageType": "PRODUCT_LIST" | "PRODUCT_DETAIL" | "OTHER",
  "products": [{"productName": "...", "clientProductId": "..."}]
}`;

    const output = await generator(prompt, {
      max_new_tokens: 500,
      temperature: 0.1,
    });

    // Parse the generated text to extract JSON
    const firstOutput = (
      Array.isArray(output) && isChat(output[0]) ? output[0][0] : output[0]
    ) as TextGenerationOutput;
    const responseText = JSON.stringify(firstOutput);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as PageAnalysisResult;
    }

    // Fallback
    return {
      pageType: "OTHER",
      products: [],
    };
  } catch (error) {
    console.error("Transformers.js analysis error:", error);
    return {
      pageType: "OTHER",
      products: [],
    };
  }
}

/**
 * Alternative: Use separate models for classification and extraction
 */
export async function analyzePageWithSeparateModels(
  htmlContent: string
): Promise<PageAnalysisResult> {
  const textContent = extractTextContent(htmlContent).substring(0, 512);

  // Step 1: Classify page type
  const classifier = await pipeline(
    "text-classification",
    "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
  );

  const classificationPrompt = `Is this webpage content about products? 
Content: ${textContent}`;

  const classification = await classifier(classificationPrompt);
  console.log("classification", classification);

  // Step 2: If product-related, extract products
  // if (classification[0].label === "POSITIVE") {
  //   // Use NER or text generation for extraction
  //   const extractor = await pipeline(
  //     "token-classification",
  //     "Xenova/bert-base-NER" // Named Entity Recognition
  //   );

  //   const entities = await extractor(textContent);
  //   // Process entities to extract products...
  // }

  return {
    pageType: "OTHER",
    products: [],
  };
}

/**
 * Main function to analyze current page
 */
export async function analyzeCurrentPage(): Promise<void> {
  const url = window.location.href;

  // Get cleaned HTML from service worker
  chrome.runtime.sendMessage(
    {
      action: "getCleanedContent",
      tabId: (await chrome.tabs.getCurrent())?.id,
    },
    async (response) => {
      if (response && response.success && response.cleanedContent) {
        const analysis = await analyzePageWithTransformers(
          response.cleanedContent,
          url
        );

        if (analysis.pageType !== "OTHER" && analysis.products.length > 0) {
          // Send to backend
          await sendToBackend({
            url,
            pageType: analysis.pageType,
            products: analysis.products,
          });
        }
      }
    }
  );
}

async function sendToBackend(data: any): Promise<void> {
  // Same as remote version
  console.log("Sending to backend:", data);
}
