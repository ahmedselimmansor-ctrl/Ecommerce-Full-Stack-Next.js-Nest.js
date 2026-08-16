import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProductImageDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  url!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class ProductVariantDto {
  @ApiProperty({ example: 'BOXYTEE-M-BLA' })
  @IsString()
  @MinLength(3)
  sku!: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  size!: string;

  @ApiProperty({ example: 'Black' })
  @IsString()
  color!: string;

  @ApiPropertyOptional({ example: 'أسود' })
  @IsOptional()
  @IsString()
  colorAr?: string;

  @ApiPropertyOptional({ example: '#111111' })
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiPropertyOptional({ description: 'Overrides the product price when set' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents?: number;

  @ApiProperty({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ description: 'Arabic name shown on /ar pages' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameAr?: string;

  @ApiProperty({ example: 'heavyweight-boxy-tee' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase words separated by hyphens.' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  slug!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ description: 'Arabic description' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ description: 'Price in minor units (e.g. 79000 = 790.00 EGP)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents!: number;

  @ApiPropertyOptional({ description: 'Original price for strike-through display' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  compareAtCents?: number;

  @ApiProperty({ enum: Gender, default: Gender.UNISEX })
  @IsEnum(Gender)
  gender: Gender = Gender.UNISEX;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  materialAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  care?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  careAr?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ type: [ProductImageDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one image is required.' })
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  images!: ProductImageDto[];

  @ApiProperty({ type: [ProductVariantDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one variant is required.' })
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants!: ProductVariantDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class UpdateStockDto {
  @ApiProperty()
  @IsString()
  variantId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;
}
