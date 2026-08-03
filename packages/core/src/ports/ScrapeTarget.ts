export interface ScrapeTarget {
  readonly isoCode: string;
  readonly sourceName: string;
  readonly url: string;
  readonly type: "html" | "spa";
  readonly selector: string;
  readonly active: boolean;
}
