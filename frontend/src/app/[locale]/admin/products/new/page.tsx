import { getCategories } from '@/lib/queries';
import { ProductForm } from '@/components/admin/product-form';

export default async function NewProductPage() {
  const categories = await getCategories();
  return <ProductForm categories={categories} />;
}
