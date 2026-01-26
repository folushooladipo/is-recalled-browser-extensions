import { pipeline } from "@huggingface/transformers";
import { ClassifyPageReturnType, PageType } from "../types/page";

const { PRODUCT_LIST_PAGE, PRODUCT_DETAIL_PAGE, OTHER } = PageType;

// TODO: for screenshot, I can use string, RawImage, Blob etc as seen in the definition of ZeroShotImageClassificationPipelineCallback here: /Users/folushooladipo/devdir/yinka-and-i/is-recalled-browser-extensions/chrome-v3/node_modules/@huggingface/transformers/src/pipelines.js
export const classifyWithML = async (
  screenshot: Blob
): Promise<ClassifyPageReturnType> => {
  const classifier = await pipeline(
    "zero-shot-image-classification",
    // "Xenova/clip-vit-base-patch32"
    "Xenova/clip-vit-base-patch16"
  );

  const result = await classifier(screenshot, [
    PRODUCT_LIST_PAGE,
    PRODUCT_DETAIL_PAGE,
    OTHER,
  ]);

  const isNestedResult =
    Array.isArray(result) && result.every((item) => Array.isArray(item));

  const flatResult = isNestedResult ? result.flat() : result;

  const sortedResult = flatResult.sort(
    (firstItem, secondItem) => secondItem.score - firstItem.score
  );

  const { label, score } = sortedResult[0];

  if (PRODUCT_LIST_PAGE === label.toLowerCase()) {
    return {
      pageType: PRODUCT_LIST_PAGE,
      score,
    };
  }

  if (PRODUCT_DETAIL_PAGE === label.toLowerCase()) {
    return {
      pageType: PRODUCT_DETAIL_PAGE,
      score,
    };
  }

  return {
    pageType: OTHER,
    score,
  };
};
