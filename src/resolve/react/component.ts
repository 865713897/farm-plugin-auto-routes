import type { ReactOptions } from '../../types/options.js';

export function generateRouteComponent(relativePath: string, options?: ReactOptions) {
  if (options?.routerApiVersion === 'legacy') {
    return { Component: `__LAZY__React.lazy(() => import('${relativePath}'))__LAZY__` };
  }

  return {
    lazy: `__LAZY__async () => { const mod = await import('${relativePath}'); return { Component: mod.default, loader: mod.loader, action: mod.action, ErrorBoundary: mod.ErrorBoundary, handle: mod.handle, shouldRevalidate: mod.shouldRevalidate } }__LAZY__`,
  };
}
