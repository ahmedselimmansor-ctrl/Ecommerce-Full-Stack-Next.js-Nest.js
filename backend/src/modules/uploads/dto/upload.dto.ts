import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SignedUploadDto {
  @ApiProperty({ example: 'hero.webp' })
  @IsString()
  @MaxLength(160)
  filename!: string;

  @ApiProperty({ example: 'image/webp' })
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
  contentType!: string;

  @ApiPropertyOptional({ default: 'products', enum: ['products', 'categories', 'banners'] })
  @IsOptional()
  @IsIn(['products', 'categories', 'banners'])
  folder?: 'products' | 'categories' | 'banners';

  @ApiPropertyOptional({ description: 'Size in bytes, validated against the 8MB limit' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8 * 1024 * 1024)
  contentLength?: number;
}
