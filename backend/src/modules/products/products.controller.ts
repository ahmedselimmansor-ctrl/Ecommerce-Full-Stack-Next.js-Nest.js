import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateProductDto, UpdateProductDto, UpdateStockDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search, filter and paginate the catalogue' })
  list(@Query() query: ProductQueryDto) {
    return this.products.list(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Products flagged for the homepage' })
  featured() {
    return this.products.featured();
  }

  @Public()
  @Get('filters')
  @ApiOperation({ summary: 'Available sizes, colours and price range' })
  filters() {
    return this.products.filters();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Product detail with variants and related items' })
  findBySlug(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a product with images and variants (admin)' })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Patch(':id/stock')
  @ApiOperation({ summary: 'Set the stock level of a single variant (admin)' })
  setStock(@Param('id') _id: string, @Body() dto: UpdateStockDto) {
    return this.products.setStock(dto.variantId, dto.stock);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a product (admin)' })
  async remove(@Param('id') id: string) {
    await this.products.remove(id);
  }
}
