export type TEpicOrderByOptions =
  | "name"
  | "-name"
  | "progress"
  | "-progress"
  | "issues_length"
  | "-issues_length"
  | "target_date"
  | "-target_date"
  | "created_at"
  | "-created_at"
  | "sort_order";

export type TEpicLayoutOptions = "list" | "board" | "gantt";

export type TEpicDisplayFilters = {
  favorites?: boolean;
  layout?: TEpicLayoutOptions;
  order_by?: TEpicOrderByOptions;
};

export type TEpicFilters = {
  lead?: string[] | null;
  members?: string[] | null;
  start_date?: string[] | null;
  status?: string[] | null;
  target_date?: string[] | null;
};

export type TEpicFiltersByState = {
  default: TEpicFilters;
  archived: TEpicFilters;
};

export type TEpicStoredFilters = {
  display_filters?: TEpicDisplayFilters;
  filters?: TEpicFilters;
};
