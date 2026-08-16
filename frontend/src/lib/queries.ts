import 'server-only';
import { serverFetch, serverFetchOrNull } from './api-server';
import { isAuthenticated } from './session';
import { buildQuery } from './utils';
import type {
  AdminOrder,
  AdminProduct,
  AdminStats,
  CartSummary,
  CategoryNode,
  Order,
  Paginated,
  PaymentMethods,
  ProductDetail,
  ProductFilters,
  ProductSummary,
  Review,
  User,
} from '@/types';

/** Catalogue data is public and identical for everyone, so it is ISR-cached. */
const CATALOGUE_REVALIDATE = 60;

export function getCategories(): Promise<CategoryNode[]> {
  return serverFetch<CategoryNode[]>('/categories', {
    revalidate: 300,
    tags: ['categories'],
  });
}

export function getFeaturedProducts(): Promise<ProductSummary[]> {
  return serverFetch<ProductSummary[]>('/products/featured', {
    revalidate: CATALOGUE_REVALIDATE,
    tags: ['products'],
  });
}

export function getProductFilters(): Promise<ProductFilters> {
  return serverFetch<ProductFilters>('/products/filters', {
    revalidate: 300,
    tags: ['products'],
  });
}

export interface ProductSearchParams {
  q?: string;
  category?: string;
  gender?: string;
  size?: string[];
  color?: string[];
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sort?: string;
  page?: string;
}

export function searchProducts(params: ProductSearchParams): Promise<Paginated<ProductSummary>> {
  return serverFetch<Paginated<ProductSummary>>(`/products${buildQuery({ ...params, pageSize: 12 })}`, {
    revalidate: CATALOGUE_REVALIDATE,
    tags: ['products'],
  });
}

export function getProduct(slug: string): Promise<ProductDetail | null> {
  return serverFetchOrNull<ProductDetail>(`/products/${slug}`, {
    revalidate: CATALOGUE_REVALIDATE,
    tags: ['products', `product:${slug}`],
  });
}

export function getProductReviews(slug: string): Promise<Paginated<Review>> {
  return serverFetch<Paginated<Review>>(`/products/${slug}/reviews?pageSize=10`, {
    revalidate: CATALOGUE_REVALIDATE,
    tags: [`product:${slug}`],
  });
}

/** Returns null for signed-out visitors instead of throwing. */
export async function getCurrentUser(): Promise<User | null> {
  if (!(await isAuthenticated())) return null;
  try {
    return await serverFetch<User>('/auth/me', { auth: true });
  } catch {
    return null;
  }
}

export async function getServerCart(): Promise<CartSummary | null> {
  if (!(await isAuthenticated())) return null;
  try {
    return await serverFetch<CartSummary>('/cart', { auth: true });
  } catch {
    return null;
  }
}

export function getOrders(page = 1): Promise<Paginated<Order>> {
  return serverFetch<Paginated<Order>>(`/orders?page=${page}&pageSize=10`, { auth: true });
}

export function getOrder(id: string): Promise<Order | null> {
  return serverFetchOrNull<Order>(`/orders/${id}`, { auth: true });
}

export function getAddresses() {
  return serverFetch<import('@/types').Address[]>('/users/me/addresses', { auth: true });
}

export function getPaymentMethods(): Promise<PaymentMethods> {
  return serverFetch<PaymentMethods>('/payments/methods', { revalidate: 300, tags: ['payments'] });
}

// ---- admin ------------------------------------------------------------------
// All of these are authenticated reads, so they are never cached.

export function getAdminStats(days = 30): Promise<AdminStats> {
  return serverFetch<AdminStats>(`/admin/stats?days=${days}`, { auth: true });
}

export interface AdminProductQuery {
  q?: string;
  category?: string;
  status?: string;
  page?: string;
}

export function getAdminProducts(query: AdminProductQuery): Promise<Paginated<AdminProduct>> {
  return serverFetch<Paginated<AdminProduct>>(`/admin/products${buildQuery({ ...query, pageSize: 20 })}`, {
    auth: true,
  });
}

export function getAdminProduct(id: string): Promise<AdminProduct | null> {
  return serverFetchOrNull<AdminProduct>(`/admin/products/${id}`, { auth: true });
}

export function getAdminOrders(query: { status?: string; page?: string }): Promise<Paginated<AdminOrder>> {
  return serverFetch<Paginated<AdminOrder>>(`/orders/admin/all${buildQuery({ ...query, pageSize: 20 })}`, {
    auth: true,
  });
}
