const VALID_TABS = new Set([
  '/(tabs)',
  '/(tabs)/kesfet',
  '/(tabs)/listings',
  '/(tabs)/packages',
  '/(tabs)/messages',
  '/(tabs)/club',
  '/(tabs)/profile',
]);

let tabHistory: string[] = ['/(tabs)'];
let customTabBackHandler: (() => boolean) | null = null;

export function setCustomTabBackHandler(handler: (() => boolean) | null): void {
  customTabBackHandler = handler;
}

export function normalizeTabRoute(pathname: string): string | null {
  if (!pathname) return null;
  if (
    pathname === '/' ||
    pathname === '/index' ||
    pathname === '/(tabs)' ||
    pathname === '/(tabs)/index'
  ) {
    return '/(tabs)';
  }
  const clean = pathname.startsWith('/(tabs)/')
    ? pathname
    : `/(tabs)${pathname.startsWith('/') ? pathname : `/${pathname}`}`;

  if (VALID_TABS.has(clean)) {
    return clean;
  }
  return null;
}

export function recordTabVisit(pathname: string, hasParentStackScreen: boolean): void {
  if (hasParentStackScreen) {
    return;
  }
  const normalized = normalizeTabRoute(pathname);
  if (!normalized) return;

  if (normalized === '/(tabs)') {
    tabHistory = ['/(tabs)'];
    return;
  }

  const last = tabHistory[tabHistory.length - 1];
  if (last !== normalized) {
    tabHistory.push(normalized);
  }
}

export function goBackFromTab(router: {
  canGoBack: () => boolean;
  back: () => void;
  navigate: (href: any) => void;
}): void {
  if (customTabBackHandler && customTabBackHandler()) {
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  if (tabHistory.length > 1) {
    tabHistory.pop();
    const target = tabHistory[tabHistory.length - 1] || '/(tabs)';
    router.navigate(target as any);
  } else {
    tabHistory = ['/(tabs)'];
    router.navigate('/(tabs)' as any);
  }
}
