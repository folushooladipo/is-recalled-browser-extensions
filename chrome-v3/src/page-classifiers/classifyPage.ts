import { PageType } from "../types/page";
import { classifyUsingHeuristics } from "./classifyUsingHeuristics";
import { classifyWithML } from "./classifyWithML";

const { OTHER } = PageType;

export const classifyPage = async (pageHTML: string, screenshot: Blob) => {
  const pageTypeFromHeuristics = await classifyUsingHeuristics(pageHTML);

  if (OTHER !== pageTypeFromHeuristics.pageType) {
    return {
      ...pageTypeFromHeuristics,
      source: "heuristics",
    };
  }

  const pageTypeFromML = await classifyWithML(screenshot);

  if (OTHER !== pageTypeFromML.pageType) {
    return {
      pageType: pageTypeFromML,
      source: "ml",
    };
  }

  return { pageType: OTHER, source: "unknown" };
};
