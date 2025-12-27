/**
 * Type definitions for app-rail visibility context
 */

export interface IAppRailVisibilityContext {
  /**
   * Whether the app rail is enabled
   */
  isEnabled: boolean;

  /**
   * Whether the app rail should render (same as isEnabled)
   */
  shouldRenderAppRail: boolean;
}
