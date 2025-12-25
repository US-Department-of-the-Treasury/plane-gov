// App Rail preferences
export type TAppRailDisplayMode = "icon_only" | "icon_with_label";

export interface TAppRailPreferences {
  displayMode: TAppRailDisplayMode;
}

export const DEFAULT_APP_RAIL_PREFERENCES: TAppRailPreferences = {
  displayMode: "icon_with_label",
};
