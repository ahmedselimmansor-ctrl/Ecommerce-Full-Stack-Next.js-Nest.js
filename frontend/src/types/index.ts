export type Gender = 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS';
export type Role = 'CUSTOMER' | 'ADMIN';
export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'CARD';
export type PaymentStatus = 'UNPAID' | 'AWAITING_PAYMENT' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CategoryNode {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  description: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  productCount: number;
  children: CategoryNode[];
}

export interface ColorOption {
  name: string;
  nameAr?: string | null;
  hex: string | null;
}

export interface ProductImage {
  id?: string;
  url: string;
  alt: string | null;
  position?: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorAr: string | null;
  colorHex: string | null;
  priceCents: number | null;
  stock: number;
}

/** Shape returned by the list endpoints (product card). */
export interface ProductSummary {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string;
  priceCents: number;
  compareAtCents: number | null;
  currency: string;
  gender: Gender;
  ratingAvg: number;
  ratingCount: number;
  isFeatured: boolean;
  createdAt: string;
  category: { id: string; name: string; nameAr: string | null; slug: string };
  images: ProductImage[];
  sizes: string[];
  colors: ColorOption[];
  inStock: boolean;
}

/** Shape returned by GET /products/:slug. */
export interface ProductDetail extends Omit<ProductSummary, 'sizes' | 'colors' | 'images'> {
  description: string;
  descriptionAr: string | null;
  material: string | null;
  materialAr: string | null;
  care: string | null;
  careAr: string | null;
  isActive: boolean;
  categoryId: string;
  images: ProductImage[];
  variants: ProductVariant[];
  inStock: boolean;
  related: ProductSummary[];
}

export interface ProductFilters {
  sizes: string[];
  colors: ColorOption[];
  priceRange: { minCents: number; maxCents: number };
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  author: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
}

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  nameAr: string | null;
  sku: string;
  size: string;
  color: string;
  colorAr: string | null;
  colorHex: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  availableStock: number;
  lineTotalCents: number;
}

export interface CartSummary {
  items: CartLine[];
  currency: string;
  itemCount: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  freeShippingThresholdCents: number;
  hasIssues: boolean;
}

export interface OrderItem {
  id: string;
  productName: string;
  productNameAr: string | null;
  productSlug: string;
  sku: string;
  size: string;
  color: string;
  colorAr: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentProvider: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  shipFullName: string;
  shipPhone: string;
  shipLine1: string;
  shipLine2: string | null;
  shipCity: string;
  shipState: string;
  shipPostalCode: string | null;
  shipCountry: string;
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

// ---- admin ------------------------------------------------------------------

export interface AdminProduct extends ProductDetail {
  totalStock: number;
  variantCount: number;
  isFeatured: boolean;
}

export interface AdminStats {
  revenueCents: number;
  orderCount: number;
  averageOrderCents: number;
  pendingOrders: number;
  awaitingPayment: number;
  customerCount: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockVariants: number;
  lowStockVariants: {
    id: string;
    sku: string;
    size: string;
    color: string;
    stock: number;
    productName: string;
  }[];
  revenueByDay: { date: string; revenueCents: number; orders: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  topProducts: { productSlug: string; productName: string; unitsSold: number; revenueCents: number }[];
}

export interface AdminOrder extends Order {
  user: { id: string; email: string; firstName: string; lastName: string };
}

// ---- payments ---------------------------------------------------------------

export interface PaymentMethods {
  cashOnDelivery: boolean;
  card: boolean;
  provider: string | null;
}

export interface KashierSession {
  checkoutUrl: string;
  params: Record<string, string>;
  merchantOrderId: string;
  amount: string;
  currency: string;
  hash: string;
  mode: string;
}

export interface PaymentReconciliation {
  order: Order;
  signatureValid: boolean;
  gatewayStatus: string | null;
}
