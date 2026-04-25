import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import {
  GetUserDocs,
  UpdateProfileDocs,
  GetAddressesDocs,
  CreateAddressDocs,
  UpdateAddressDocs,
  DeleteAddressDocs,
  SetDefaultAddressDocs,
  GetOrdersDocs,
} from './docs';
import {
  UpdateProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
  ChangePasswordDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './dto';
import type { UserWithoutPassword } from '@common/types';
import { CurrentUser } from '@auth/decorators/current-user.decorator';

@ApiTags('user')
@Controller({ path: 'user', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @GetUserDocs
  me(@CurrentUser() user: UserWithoutPassword) {
    return this.userService.getProfile(user.id);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @UpdateProfileDocs
  updateProfile(
    @CurrentUser() user: UserWithoutPassword,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, dto);
  }

  // ── Addresses ──────────────────────────────────────────────────────────────

  @Get('me/addresses')
  @UseGuards(AuthGuard('jwt'))
  @GetAddressesDocs
  getAddresses(@CurrentUser() user: UserWithoutPassword) {
    return this.userService.getAddresses(user.id);
  }

  @Post('me/addresses')
  @UseGuards(AuthGuard('jwt'))
  @CreateAddressDocs
  createAddress(
    @CurrentUser() user: UserWithoutPassword,
    @Body() dto: CreateAddressDto,
  ) {
    return this.userService.createAddress(user.id, dto);
  }

  @Patch('me/addresses/:id')
  @UseGuards(AuthGuard('jwt'))
  @UpdateAddressDocs
  updateAddress(
    @CurrentUser() user: UserWithoutPassword,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.userService.updateAddress(user.id, id, dto);
  }

  @Delete('me/addresses/:id')
  @UseGuards(AuthGuard('jwt'))
  @DeleteAddressDocs
  deleteAddress(
    @CurrentUser() user: UserWithoutPassword,
    @Param('id') id: string,
  ) {
    return this.userService.deleteAddress(user.id, id);
  }

  @Patch('me/addresses/:id/default')
  @UseGuards(AuthGuard('jwt'))
  @SetDefaultAddressDocs
  setDefaultAddress(
    @CurrentUser() user: UserWithoutPassword,
    @Param('id') id: string,
  ) {
    return this.userService.setDefaultAddress(user.id, id);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  @Get('me/orders')
  @UseGuards(AuthGuard('jwt'))
  @GetOrdersDocs
  getOrders(@CurrentUser() user: UserWithoutPassword) {
    return this.userService.getOrders(user.id);
  }

  // ── OTP ────────────────────────────────────────────────────────────────────

  @Post('me/request-otp')
  @UseGuards(AuthGuard('jwt'))
  requestOtp(
    @CurrentUser() user: UserWithoutPassword,
    @Body() dto: RequestOtpDto,
  ) {
    return this.userService.requestOtp(user.id, dto);
  }

  @Post('me/verify-otp')
  @UseGuards(AuthGuard('jwt'))
  verifyOtp(
    @CurrentUser() user: UserWithoutPassword,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.userService.verifyOtp(user.id, dto);
  }

  // ── Security ───────────────────────────────────────────────────────────────

  @Post('me/change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(
    @CurrentUser() user: UserWithoutPassword,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(user.id, dto);
  }
}
