import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthModule } from '@auth/auth.module';
import { RolesGuard } from '@auth/guards/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, RolesGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
