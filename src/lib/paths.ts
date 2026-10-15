/** Resolve an internal route or public asset under the deployment base. */
export function sitePath(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

/** Remove the deployment base before choosing a language for this route. */
export function routePath(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (pathname === base) return '/';
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}
