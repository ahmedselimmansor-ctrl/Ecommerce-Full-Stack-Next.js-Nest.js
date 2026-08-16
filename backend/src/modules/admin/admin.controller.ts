import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { AdminProductQueryDto, StatsQueryDto } from './dto/admin.dto';

/**
 * Read side of the dashboard. Writes reuse the existing products, categories
 * and orders controllers, which already enforce the ADMIN role — duplicating
 * them here would mean two places to keep validation in sync.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard totals, daily revenue, low stock and best sellers' })
  stats(@Query() query: StatsQueryDto) {
    return this.admin.stats(query.days ?? 30);
  }

  @Get('products')
  @ApiOperation({ summary: 'Catalogue listing including inactive products' })
  listProducts(@Query() query: AdminProductQueryDto) {
    return this.admin.listProducts(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Single product with all images and variants, for the edit form' })
  getProduct(@Param('id') id: string) {
    return this.admin.getProduct(id);
  }
}
