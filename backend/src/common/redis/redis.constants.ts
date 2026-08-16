export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** Central key registry so invalidation and reads can never drift apart. */
export const CacheKeys = {
  productList: (fingerprint: string) => `products:list:${fingerprint}`,
  productListPrefix: 'products:list:',
  productDetail: (slug: string) => `products:detail:${slug}`,
  productDetailPrefix: 'products:detail:',
  categoryTree: () => 'categories:tree',
  featuredProducts: () => 'products:featured',
  refreshToken: (userId: string, tokenId: string) => `auth:refresh:${userId}:${tokenId}`,
  userRefreshPrefix: (userId: string) => `auth:refresh:${userId}:`,
};
