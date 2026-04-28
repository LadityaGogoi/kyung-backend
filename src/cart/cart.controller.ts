import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import type { UserWithoutPassword } from '@common/types';
import { CartService } from './cart.service';
import { UpsertCartItemDto } from './dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ── Guest endpoints ────────────────────────────────────────────────────────

  @Get('guest')
  @SkipThrottle()
  getGuestCart(@Headers('x-guest-session-id') sessionId: string) {
    return this.cartService.getGuestCart(sessionId ?? '');
  }

  @Post('guest')
  @HttpCode(HttpStatus.OK)
  upsertGuestCartItem(
    @Headers('x-guest-session-id') sessionId: string,
    @Body() dto: UpsertCartItemDto,
  ) {
    return this.cartService.upsertGuestCartItem(sessionId, dto);
  }

  // ── Authenticated endpoints ────────────────────────────────────────────────

  @Get()
  @UseGuards(AuthGuard('jwt'))
  getUserCart(@CurrentUser() user: UserWithoutPassword) {
    return this.cartService.getUserCart(user.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  upsertUserCartItem(
    @CurrentUser() user: UserWithoutPassword,
    @Body() dto: UpsertCartItemDto,
  ) {
    return this.cartService.upsertUserCartItem(user.id, dto);
  }

  // ── Merge guest cart on login ──────────────────────────────────────────────

  @Post('merge')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  mergeGuestCart(
    @CurrentUser() user: UserWithoutPassword,
    @Headers('x-guest-session-id') sessionId: string,
  ) {
    return this.cartService.mergeGuestCart(user.id, sessionId);
  }
}
