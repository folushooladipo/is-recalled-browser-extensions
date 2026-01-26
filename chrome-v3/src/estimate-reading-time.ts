// https://developer.chrome.com/ is a SPA (Single Page Application) so can
// update the address bar and render new content without reloading. Our content
// script won't be reinjected when this happens, so we need to watch for
// changes to the content.
function renderReadingTime(article: HTMLElement | null) {
  // If we weren't provided an article, we don't need to render anything.
  if (!article) {
    return;
  }

  const text = article.textContent;
  const wordMatchRegExp = /[^\s]+/g; // Regular expression
  const words = text.matchAll(wordMatchRegExp);
  // matchAll returns an iterator, convert to array to get word count
  const wordCount = [...words].length;
  const readingTime = Math.round(wordCount / 200);
  const badge = document.createElement("p");
  // Use the same styling as the publish information in an article's header
  badge.classList.add("color-secondary-text", "type--caption");
  badge.textContent = `⏱️ ${readingTime} min read`;
  //   badge.style.color = "red";
  badge.style.fontSize = "16px";
  badge.style.fontStyle = "italic";

  // Support for API reference docs
  const heading = article.querySelector("h1");
  // Support for article docs with date
  const date = article.querySelector("time")?.parentElement;
  if (!date && !heading) {
    return;
  }

  (date ?? heading)?.insertAdjacentElement("afterend", badge);
}

renderReadingTime(document.querySelector("article"));

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    // If a new article was added.
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement && node.tagName === "ARTICLE") {
        // Render the reading time for this particular article.
        renderReadingTime(node);
      }
    }
  }
});
const bodyNode = document.querySelector("body");
if (bodyNode) {
  observer.observe(bodyNode, {
    childList: true,
    subtree: true,
  });
}
