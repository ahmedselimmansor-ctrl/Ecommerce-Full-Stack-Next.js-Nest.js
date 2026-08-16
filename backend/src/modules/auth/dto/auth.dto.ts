import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export class RegisterDto {
  @ApiProperty({ example: 'nour@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email!: string;

  @ApiProperty({ example: 'Passw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(72, { message: 'Password must be at most 72 characters.' })
  @Matches(PASSWORD_RULE, {
    message: 'Password must contain an uppercase letter, a lowercase letter and a number.',
  })
  password!: string;

  @ApiProperty({ example: 'Nour' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => String(value).trim())
  firstName!: string;

  @ApiProperty({ example: 'Hassan' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => String(value).trim())
  lastName!: string;

  @ApiPropertyOptional({ example: '+201000000000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'nour@example.com' })
  @IsEmail()
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email!: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_RULE, {
    message: 'Password must contain an uppercase letter, a lowercase letter and a number.',
  })
  newPassword!: string;
}
