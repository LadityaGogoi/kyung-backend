import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WishlistService } from './wishlist.service';
import {
  GetWishlistDocs,
  AddToWishlistDocs,
  RemoveFromWishlistDocs,
  ClearWishlistDocs,
} from './docs';
import { AddToWishlistDto } from './dto';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import type { UserWithoutPassword } from '@common/types';

@ApiTags('wishlist')
@Controller({ path: 'wishlist', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @GetWishlistDocs
  getWishlist(@CurrentUser() user: UserWithoutPassword) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post()
  @AddToWishlistDocs
  addItem(@CurrentUser() user: UserWithoutPassword, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.addItem(user.id, dto);
  }

  @Delete(':productId')
  @RemoveFromWishlistDocs
  removeItem(@CurrentUser() user: UserWithoutPassword, @Param('productId') productId: string) {
    return this.wishlistService.removeItem(user.id, productId);
  }

  @Delete()
  @ClearWishlistDocs
  clear(@CurrentUser() user: UserWithoutPassword) {
    return this.wishlistService.clear(user.id);
  }
}
