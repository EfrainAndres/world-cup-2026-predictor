export interface NavItem {
  readonly label: string;
  readonly href: string;
}

// Single source of truth for all navigation destinations.
// Both desktop and mobile navigation are derived from these arrays.

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Matches", href: "/matches" },
  { label: "Groups", href: "/groups" },
  { label: "Predictions", href: "/predictions" },
  { label: "Tournament", href: "/tournament" },
  { label: "Model", href: "/model" },
];

export const SECONDARY_NAV_ITEMS: readonly NavItem[] = [
  { label: "Prediction History", href: "/prediction-history" },
];

// Mobile bottom navigation — 4 direct items plus a synthetic "More" button (5 total).
export const MOBILE_BOTTOM_ITEMS: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Matches", href: "/matches" },
  { label: "Predict", href: "/predictions" },
  { label: "Groups", href: "/groups" },
];

// Destinations exposed under the mobile "More" button.
export const MOBILE_MORE_ITEMS: readonly NavItem[] = [
  { label: "Tournament", href: "/tournament" },
  { label: "Model", href: "/model" },
  { label: "Prediction History", href: "/prediction-history" },
];

/**
 * Returns true when `pathname` matches the `href` destination.
 *
 * "/" requires an exact match. All other hrefs match the exact path
 * or any strict nested path (e.g. "/groups/A" activates "/groups").
 * Prefix overlap without a path separator is not a match
 * (e.g. "/prediction-history" does NOT activate "/predictions").
 */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
