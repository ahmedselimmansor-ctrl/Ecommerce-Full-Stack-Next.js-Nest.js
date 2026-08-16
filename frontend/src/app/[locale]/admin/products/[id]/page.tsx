import { notFound } from 'next/navigation';
import { getAdminProduct, getCategories } from '@/lib/queries';
import { ProductForm } from '@/components/admin/product-form';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories] = await Promise.all([getAdminProduct(id), getCategories()]);
  if (!product) notFound();

  return <ProductForm categories={categories} product={product} />;
}
