import { ClassifyPageReturnType, PageType } from "../types/page";

export const classifyUsingHeuristics = async (
  html: string
): Promise<ClassifyPageReturnType> => {
  // TODO: clean HTML here before use. It centralizes the cleaning process and ensures that if any invoker sends us dirty HTML, it will get cleaned.
  return { pageType: PageType.OTHER };
};
