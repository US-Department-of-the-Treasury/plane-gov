export type TSprintTabOptions = "active" | "all";

export type TSprintLayoutOptions = "list" | "board" | "gantt";

export type TSprintDisplayFilters = {
  active_tab?: TSprintTabOptions;
  layout?: TSprintLayoutOptions;
};

export type TSprintFilters = {
  end_date?: string[] | null;
  start_date?: string[] | null;
  status?: string[] | null;
};

export type TSprintFiltersByState = {
  default: TSprintFilters;
  archived: TSprintFilters;
};

export type TSprintStoredFilters = {
  display_filters?: TSprintDisplayFilters;
  filters?: TSprintFilters;
};
