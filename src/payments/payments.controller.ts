import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import type { UserWithoutPassword } from '@common/types';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto, SimulateWebhookDto } from './dto';
import { InitiatePaymentDocs, SimulateWebhookDocs, WebhookDocs } from './docs';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  @InitiatePaymentDocs
  initiatePayment(
    @CurrentUser() user: UserWithoutPassword,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(user.id, dto);
  }

  @Post('simulate')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @SimulateWebhookDocs
  simulateWebhook(@Body() dto: SimulateWebhookDto) {
    if (this.config.get<string>('ENVIRONMENT') === 'production') {
      throw new ForbiddenException({
        message: { title: 'Forbidden', subTitle: 'Not available in production' },
      });
    }
    return this.paymentsService.simulateWebhook(dto);
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @WebhookDocs
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody!, signature);
  }
}
