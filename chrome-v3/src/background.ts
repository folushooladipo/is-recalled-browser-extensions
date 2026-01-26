import { MessageRequest } from "./types/page";
import { cleanHtml } from "./util/cleanHtml";

const cleanedContentCache = new Map<number, string>();

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

      if (cleaned) {
        console.log("HTML cleaned and cached by service worker");
      }

      sendResponse({
        success: true,
        message: "HTML cleaned and cached",
        cleanedContent: cleaned,
      });

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
