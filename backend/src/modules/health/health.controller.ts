import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/redis/cache.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Cloud Run startup probe — cheap and dependency-free. */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  health() {
    return { status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() };
  }

  /**
   * Readiness probe. Redis being down is reported but does not fail the check —
   * the API still serves traffic without a cache.
   */
  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe with dependency checks' })
  async ready() {
    const [database, redis] = await Promise.all([this.prisma.isHealthy(), this.cache.isHealthy()]);

    if (!database) {
      throw new ServiceUnavailableException({ status: 'unavailable', database, redis });
    }

    return { status: 'ok', database, redis, timestamp: new Date().toISOString() };
  }
}
