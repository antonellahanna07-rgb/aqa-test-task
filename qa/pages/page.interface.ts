/**
 * Minimal contract every page object must honor.
 *
 * Using an interface (rather than baking these methods into BasePage via
 * inheritance only) lets us swap implementations or write decorators
 * without changing callers — the Liskov/Interface-Segregation idea.
 */
export interface IPage {
  /** Navigate the browser to this page's canonical URL. */
  goto(): Promise<void>;
  /** Resolve when the page's distinguishing UI is visible. */
  waitUntilLoaded(): Promise<void>;
  /** True when the distinguishing UI is currently visible. */
  isLoaded(): Promise<boolean>;
}
