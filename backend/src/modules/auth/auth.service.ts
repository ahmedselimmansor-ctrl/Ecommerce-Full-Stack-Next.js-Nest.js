import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/redis/cache.service';
import { CacheKeys } from '../../common/redis/redis.constants';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

const BCRYPT_ROUNDS = 12;

/** Convert `15m` / `7d` / `3600` into seconds. */
function ttlToSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])?$/.exec(ttl.trim());
  if (!match) return 900;
  const value = Number(match[1]);
  switch (match[2]) {
    case 'd':
      return value * 86_400;
    case 'h':
      return value * 3_600;
    case 'm':
      return value * 60;
    default:
      return value;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly cache: CacheService,
  ) {
    this.accessTtlSeconds = ttlToSeconds(this.config.getOrThrow<string>('jwt.accessTtl'));
    this.refreshTtlSeconds = ttlToSeconds(this.config.getOrThrow<string>('jwt.refreshTtl'));
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
      },
    });

    return { user: this.toPublicUser(user), tokens: await this.issueTokens(user) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Always run a hash comparison so response timing does not leak whether the
    // email exists.
    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : await bcrypt.compare(dto.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin');

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated.');
    }

    return { user: this.toPublicUser(user), tokens: await this.issueTokens(user) };
  }

  /**
   * Rotating refresh: the presented token is invalidated the moment a new pair
   * is minted, so a stolen refresh token is usable at most once.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const key = CacheKeys.refreshToken(payload.sub, payload.jti);
    const storedHash = await this.cache.getRaw(key);
    if (!storedHash || storedHash !== this.hashToken(refreshToken)) {
      // Unknown or already-rotated token: drop every session for this user.
      await this.cache.delByPrefix(CacheKeys.userRefreshPrefix(payload.sub));
      throw new UnauthorizedException('Session is no longer valid. Please sign in again.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is no longer active.');
    }

    await this.cache.del(key);
    return this.issueTokens(user);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; jti: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });
      await this.cache.del(CacheKeys.refreshToken(payload.sub, payload.jti));
    } catch {
      // A malformed or expired token is already unusable — nothing to revoke.
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.cache.delByPrefix(CacheKeys.userRefreshPrefix(userId));
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toPublicUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) },
    });

    // A password change ends every existing session.
    await this.logoutAll(userId);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const jti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, email: user.email, role: user.role },
        { secret: this.config.getOrThrow<string>('jwt.accessSecret'), expiresIn: this.accessTtlSeconds },
      ),
      this.jwt.signAsync(
        { sub: user.id, jti },
        { secret: this.config.getOrThrow<string>('jwt.refreshSecret'), expiresIn: this.refreshTtlSeconds },
      ),
    ]);

    // Only the hash is stored, so a Redis dump cannot be replayed as a session.
    await this.cache.setRaw(
      CacheKeys.refreshToken(user.id, jti),
      this.hashToken(refreshToken),
      this.refreshTtlSeconds,
    );

    return { accessToken, refreshToken, expiresIn: this.accessTtlSeconds };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
