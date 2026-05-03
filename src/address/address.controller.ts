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
import { AddressService } from './address.service';
import {
  GetAddressesDocs,
  CreateAddressDocs,
  UpdateAddressDocs,
  DeleteAddressDocs,
  SetDefaultAddressDocs,
} from './docs';
import { CreateAddressDto, UpdateAddressDto } from './dto';
import type { UserWithoutPassword } from '@common/types';
import { CurrentUser } from '@auth/decorators/current-user.decorator';

@ApiTags('address')
@Controller({ path: 'address', version: '1' })
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @GetAddressesDocs
  getAddresses(@CurrentUser() user: UserWithoutPassword) {
    return this.addressService.getAddresses(user.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @CreateAddressDocs
  createAddress(
    @CurrentUser() user: UserWithoutPassword,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.createAddress(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @UpdateAddressDocs
  updateAddress(
    @CurrentUser() user: UserWithoutPassword,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @DeleteAddressDocs
  deleteAddress(@CurrentUser() user: UserWithoutPassword, @Param('id') id: string) {
    return this.addressService.deleteAddress(user.id, id);
  }

  @Patch(':id/default')
  @UseGuards(AuthGuard('jwt'))
  @SetDefaultAddressDocs
  setDefaultAddress(@CurrentUser() user: UserWithoutPassword, @Param('id') id: string) {
    return this.addressService.setDefaultAddress(user.id, id);
  }
}
