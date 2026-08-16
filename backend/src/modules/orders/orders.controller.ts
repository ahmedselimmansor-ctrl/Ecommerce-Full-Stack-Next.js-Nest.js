import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateOrderDto, OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place an order (prices and stock are re-validated server-side)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.orders.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Order history for the signed-in user' })
  list(@CurrentUser('id') userId: string, @Query() query: OrderQueryDto) {
    return this.orders.listForUser(userId, query);
  }

  @Roles(Role.ADMIN)
  @Get('admin/all')
  @ApiOperation({ summary: 'All orders (admin)' })
  listAll(@Query() query: OrderQueryDto) {
    return this.orders.listAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Single order (owner or admin)' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.findOne(id, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order and restock its items' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.orders.cancel(id, user);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Move an order through the fulfilment pipeline (admin)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto);
  }
}
