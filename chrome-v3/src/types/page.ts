export enum PageType {
  PRODUCT_LIST_PAGE = "PRODUCT_LIST_PAGE",
  PRODUCT_DETAIL_PAGE = "PRODUCT_DETAIL_PAGE",
  OTHER = "OTHER",
};

export type ClassifyPageReturnType = {
  pageType: PageType;
  score?: number;
};

export interface CleanHtmlRequest {
  action: "cleanHtml";
  html: string;
  tabId?: number;
}

export interface GetCleanedContentRequest {
  action: "getCleanedContent";
  tabId: number;
}

export type MessageRequest = CleanHtmlRequest | GetCleanedContentRequest;
