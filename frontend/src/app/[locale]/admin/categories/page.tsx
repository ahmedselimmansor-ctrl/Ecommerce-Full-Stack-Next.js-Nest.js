import { getCategories } from '@/lib/queries';
import { CategoryManager } from '@/components/admin/category-manager';

export default async function AdminCategoriesPage() {
  const categories = await getCategories();
  return <CategoryManager categories={categories} />;
}
