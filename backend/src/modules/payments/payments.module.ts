import { Module } from '@nestjs/common';
import { KashierService } from './kashier.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, KashierService],
  exports: [PaymentsService, KashierService],
})
export class PaymentsModule {}
