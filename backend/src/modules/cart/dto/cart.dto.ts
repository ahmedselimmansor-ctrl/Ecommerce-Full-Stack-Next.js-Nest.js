import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsString, Max, Min, ValidateNested } from 'class-validator';

export class CartItemInputDto {
  @ApiProperty()
  @IsString()
  variantId!: string;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20, { message: 'Maximum 20 units per variant.' })
  quantity!: number;
}

export class SyncCartDto {
  @ApiProperty({ type: [CartItemInputDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CartItemInputDto)
  items!: CartItemInputDto[];
}

export class UpdateQuantityDto {
  @ApiProperty({ minimum: 0, maximum: 20, description: '0 removes the line' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  quantity!: number;
}
