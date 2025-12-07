import sanitizeHtml from "sanitize-html";

interface CleanHtmlRequest {
  action: "cleanHtml";
  html: string;
  tabId?: number;
}

interface GetCleanedContentRequest {
  action: "getCleanedContent";
  tabId: number;
}

type MessageRequest = CleanHtmlRequest | GetCleanedContentRequest;

// Store cleaned content by tab ID
const cleanedContentCache = new Map<number, string>();

const DISALLOWED_ATTRIBUTES = [
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onfocus",
  "onblur",
];

const MAP_OF_DISALLOWED_ATTRIBUTES = new Map<string, string>(
  DISALLOWED_ATTRIBUTES.map((attr) => [attr, attr])
);

const ALLOWED_ATTRIBUTES = sanitizeHtml.defaults.nonBooleanAttributes.filter(
  (attr) => !MAP_OF_DISALLOWED_ATTRIBUTES.get(attr)
);

// Clean HTML function
function cleanHtml(html: string): string {
  let cleaned = sanitizeHtml(html, {
    allowedTags: [],
    nonTextTags: [
      "script",
      "style",
      "meta",
      "link",
      "noscript",
      "iframe",
      "object",
      "embed",
      "base",
    ],
    nonBooleanAttributes: [...ALLOWED_ATTRIBUTES, "data-id", "href", "target"],
  });

  // Remove newlines
  cleaned = cleaned.replace(/(\r\n|\n|\r)/gm, "");

  // Remove extra spaces
  cleaned = cleaned.replace(/\s{2,}/g, "");

  return cleaned;
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener(
  async (request: MessageRequest, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    console.log("request", request);

    if (!tabId) {
      sendResponse({ success: false, message: "No tab ID available" });
      return true;
    }

    if (request.action === "cleanHtml") {
      const cleaned = cleanHtml(request.html);
      cleanedContentCache.set(tabId, cleaned);
      sendResponse({
        success: true,
        message: "HTML cleaned and cached",
        cleanedContent: cleaned,
      });

      // Keep channel open for async response
      return true;
    }

    if (request.action === "getCleanedContent") {
      const cleaned = cleanedContentCache.get(request.tabId);

      if (!cleaned) {
        sendResponse({
          success: false,
          message: "Cleaned content not found in cache",
        });
        return true;
      }

      sendResponse({
        success: true,
        message: "Cleaned content retrieved from cache",
        cleanedContent: cleaned || "",
      });

      return true;
    }

    return false;
  }
);

// Clean up cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  cleanedContentCache.delete(tabId);
});
