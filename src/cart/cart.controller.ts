import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import type { UserWithoutPassword } from '@common/types';
import { CartService } from './cart.service';
import { UpsertCartItemDto } from './dto';
import {
  GetGuestCartDocs,
  GetUserCartDocs,
  MergeGuestCartDocs,
  UpsertGuestCartItemDocs,
  UpsertUserCartItemDocs,
} from './docs';

@ApiTags('cart')
@Controller({ path: 'cart', version: '1' })
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ── Guest endpoints ────────────────────────────────────────────────────────

  @Get('guest')
  @SkipThrottle()
  @GetGuestCartDocs
  getGuestCart(@Headers('x-guest-session-id') sessionId: string) {
    return this.cartService.getGuestCart(sessionId ?? '');
  }

  @Post('guest')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @UpsertGuestCartItemDocs
  upsertGuestCartItem(
    @Headers('x-guest-session-id') sessionId: string,
    @Body() dto: UpsertCartItemDto,
  ) {
    return this.cartService.upsertGuestCartItem(sessionId, dto);
  }

  // ── Authenticated endpoints ────────────────────────────────────────────────

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @SkipThrottle()
  @GetUserCartDocs
  getUserCart(@CurrentUser() user: UserWithoutPassword) {
    return this.cartService.getUserCart(user.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @UpsertUserCartItemDocs
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
  @MergeGuestCartDocs
  mergeGuestCart(
    @CurrentUser() user: UserWithoutPassword,
    @Headers('x-guest-session-id') sessionId: string,
  ) {
    return this.cartService.mergeGuestCart(user.id, sessionId);
  }
}
