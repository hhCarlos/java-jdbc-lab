/** Supported public names mapped to sprite symbol IDs. Aliases share geometry. */
export const ICON_REGISTRY = {
  'not-found': 'not-found',
  default: 'not-found',
  products: 'products',
  profile: 'profile',
  logout: 'logout',
} as const satisfies Readonly<Record<string, string>>;

export type IconName = keyof typeof ICON_REGISTRY;
export type IconSymbolId = (typeof ICON_REGISTRY)[IconName];

export function resolveIconSymbol(name: string | null | undefined): IconSymbolId {
  return name != null && Object.hasOwn(ICON_REGISTRY, name)
    ? ICON_REGISTRY[name as IconName]
    : ICON_REGISTRY['not-found'];
}
