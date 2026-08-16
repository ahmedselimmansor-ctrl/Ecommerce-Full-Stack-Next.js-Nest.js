import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { CartItemInputDto, SyncCartDto, UpdateQuantityDto } from './dto/cart.dto';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Server-side cart with live prices and stock' })
  get(@CurrentUser('id') userId: string) {
    return this.cart.get(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Replace the cart contents' })
  sync(@CurrentUser('id') userId: string, @Body() dto: SyncCartDto) {
    return this.cart.sync(userId, dto.items);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge a guest cart into the account cart after sign-in' })
  merge(@CurrentUser('id') userId: string, @Body() dto: SyncCartDto) {
    return this.cart.merge(userId, dto.items);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a variant to the cart' })
  addItem(@CurrentUser('id') userId: string, @Body() dto: CartItemInputDto) {
    return this.cart.addItem(userId, dto);
  }

  @Patch('items/:variantId')
  @ApiOperation({ summary: 'Set the quantity of a line (0 removes it)' })
  setQuantity(
    @CurrentUser('id') userId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateQuantityDto,
  ) {
    return this.cart.setQuantity(userId, variantId, dto.quantity);
  }

  @Delete()
  @ApiOperation({ summary: 'Empty the cart' })
  clear(@CurrentUser('id') userId: string) {
    return this.cart.clear(userId);
  }
}
