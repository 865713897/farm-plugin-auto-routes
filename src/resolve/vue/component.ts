export function generateRouteComponent(relativePath: string) {
  return { component: `__LAZY__() => import('${relativePath}')__LAZY__` };
}
