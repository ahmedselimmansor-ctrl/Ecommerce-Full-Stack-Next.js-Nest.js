import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export enum ProductSort {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING = 'rating',
  NAME = 'name',
}

/** `?size=S&size=M` and `?size=S,M` both parse into ['S','M']. */
const toStringArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const cleaned = raw.map((entry) => String(entry).trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
};

export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Free-text search over name and description' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => String(value).trim())
  q?: string;

  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ type: [String], example: ['S', 'M'] })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  size?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Black'] })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  color?: string[];

  @ApiPropertyOptional({ description: 'Minimum price in minor units' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price in minor units' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Only products with stock left' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ enum: ProductSort, default: ProductSort.NEWEST })
  @IsOptional()
  @IsEnum(ProductSort)
  sort?: ProductSort = ProductSort.NEWEST;

  /** Stable cache fingerprint — key order must not change the resulting key. */
  fingerprint(): string {
    const parts = [
      `q=${this.q ?? ''}`,
      `cat=${this.category ?? ''}`,
      `g=${this.gender ?? ''}`,
      `size=${(this.size ?? []).slice().sort().join('|')}`,
      `color=${(this.color ?? []).slice().sort().join('|')}`,
      `min=${this.minPrice ?? ''}`,
      `max=${this.maxPrice ?? ''}`,
      `stock=${this.inStock ? 1 : 0}`,
      `sort=${this.sort ?? ProductSort.NEWEST}`,
      `page=${this.page}`,
      `size=${this.pageSize}`,
    ];
    return Buffer.from(parts.join(';')).toString('base64url');
  }
}
