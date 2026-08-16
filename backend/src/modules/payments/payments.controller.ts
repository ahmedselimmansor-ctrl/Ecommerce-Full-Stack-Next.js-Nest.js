import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { KashierService, type KashierWebhookBody } from './kashier.service';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly kashier: KashierService,
  ) {}

  @Public()
  @Get('methods')
  @ApiOperation({ summary: 'Which payment methods this environment can offer' })
  methods() {
    return {
      cashOnDelivery: true,
      card: this.kashier.isEnabled,
      provider: this.kashier.isEnabled ? 'kashier' : null,
    };
  }

  @ApiBearerAuth()
  @Post('kashier/session/:orderId')
  @ApiOperation({ summary: 'Create a Kashier hosted-payment-page session for an order' })
  createSession(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('locale') locale?: string,
  ) {
    return this.payments.createKashierSession(orderId, user, locale === 'ar' ? 'ar' : 'en');
  }

  /**
   * Server-to-server callback. Public by necessity and unthrottled, because
   * Kashier retries on any non-2xx and rate limiting would turn a traffic spike
   * into lost payments. Authenticity comes from the HMAC signature, not the
   * network path.
   */
  @Public()
  @SkipThrottle()
  @Post('kashier/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kashier payment webhook (HMAC verified)' })
  webhook(@Body() body: KashierWebhookBody, @Headers('x-kashier-signature') signature?: string) {
    return this.payments.handleKashierWebhook(body, signature);
  }

  @ApiBearerAuth()
  @Get('kashier/reconcile')
  @ApiOperation({ summary: 'Read back order state after the gateway redirect' })
  reconcile(@Query() query: Record<string, string>, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.reconcileFromRedirect(query, user);
  }
}
