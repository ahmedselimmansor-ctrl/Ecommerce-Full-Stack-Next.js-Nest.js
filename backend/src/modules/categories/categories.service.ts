import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/redis/cache.service';
import { CacheKeys } from '../../common/redis/redis.constants';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

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

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * The navigation tree is read on nearly every page render and changes rarely,
   * so it is cached whole rather than per-node.
   */
  async tree(): Promise<CategoryNode[]> {
    return this.cache.wrap(
      CacheKeys.categoryTree(),
      async () => {
        const categories = await this.prisma.category.findMany({
          orderBy: [{ position: 'asc' }, { name: 'asc' }],
          include: { _count: { select: { products: { where: { isActive: true } } } } },
        });

        const nodes = new Map<string, CategoryNode>();
        for (const category of categories) {
          nodes.set(category.id, {
            id: category.id,
            name: category.name,
            nameAr: category.nameAr,
            slug: category.slug,
            description: category.description,
            descriptionAr: category.descriptionAr,
            imageUrl: category.imageUrl,
            productCount: category._count.products,
            children: [],
          });
        }

        const roots: CategoryNode[] = [];
        for (const category of categories) {
          const node = nodes.get(category.id)!;
          const parent = category.parentId ? nodes.get(category.parentId) : undefined;
          if (parent) parent.children.push(node);
          else roots.push(node);
        }
        return roots;
      },
      600,
    );
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: { orderBy: { position: 'asc' } } },
    });
    if (!category) throw new NotFoundException('Category not found.');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const category = await this.prisma.category.create({ data: dto });
    await this.invalidate();
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.update({ where: { id }, data: dto });
    await this.invalidate();
    return category;
  }

  async remove(id: string): Promise<void> {
    const productCount = await this.prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new NotFoundException('Move or delete the products in this category first.');
    }
    await this.prisma.category.delete({ where: { id } });
    await this.invalidate();
  }

  private async invalidate(): Promise<void> {
    await Promise.all([
      this.cache.del(CacheKeys.categoryTree()),
      this.cache.delByPrefix(CacheKeys.productListPrefix),
    ]);
  }
}
