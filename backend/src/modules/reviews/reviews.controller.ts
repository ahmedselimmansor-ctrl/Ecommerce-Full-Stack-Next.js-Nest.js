import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateReviewDto, ReviewQueryDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('products/:slug/reviews')
  @ApiOperation({ summary: 'Reviews for a product' })
  list(@Param('slug') slug: string, @Query() query: ReviewQueryDto) {
    return this.reviews.listForProduct(slug, query);
  }

  @ApiBearerAuth()
  @Post('products/:slug/reviews')
  @ApiOperation({ summary: 'Create or update your review for a purchased product' })
  create(@CurrentUser('id') userId: string, @Param('slug') slug: string, @Body() dto: CreateReviewDto) {
    return this.reviews.create(userId, slug, dto);
  }

  @ApiBearerAuth()
  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete your review (or any review, as admin)' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.reviews.remove(id, user);
  }
}
