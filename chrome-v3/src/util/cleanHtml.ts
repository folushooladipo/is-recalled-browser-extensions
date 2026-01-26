import sanitizeHtml from "sanitize-html";

const DISALLOWED_ATTRIBUTES = [
  // Events
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onfocus",
  "onblur",

  // Links
  "href", // ??
  "target",

  // Others
  "data-id",
];

const MAP_OF_DISALLOWED_ATTRIBUTES = new Map<string, string>(
  DISALLOWED_ATTRIBUTES.map((attr) => [attr, attr]),
);

const ALLOWED_ATTRIBUTES = sanitizeHtml.defaults.nonBooleanAttributes.filter(
  (attr: string) => !MAP_OF_DISALLOWED_ATTRIBUTES.get(attr),
);

export const cleanHtml = (html: string): string => {
  let cleaned = sanitizeHtml(html, {
    allowedTags: [
      "a",
      "b",
      "blockquote",
      "br",
      "cite",
      "code",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "ul",
      "video",
    ],
    disallowedTagsMode: "completelyDiscard",
    nonTextTags: [
      "base",
      "embed",
      "iframe",
      "link",
      "meta",
      "noscript",
      "object",
      "script",
      "style",
    ],
    nonBooleanAttributes: [...ALLOWED_ATTRIBUTES],
  });

  cleaned = cleaned.replace(/(\r\n|\n|\r)/gm, "");

  cleaned = cleaned.replace(/\s{2,}/g, "");

  return cleaned;
}
