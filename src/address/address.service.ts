import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import type { CreateAddressDto, UpdateAddressDto } from './dto';
import type { AddressListResponseDto, AddressResponseDto } from './response';
import { MessageResponse } from '@utils';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  async getAddresses(userId: string): Promise<AddressListResponseDto> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return {
      message: { title: 'Success', subTitle: 'Addresses retrieved' },
      addresses,
    };
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<AddressResponseDto> {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: { userId, ...dto, country: dto.country ?? 'India' },
    });

    return {
      message: { title: 'Success', subTitle: 'Address added successfully' },
      address,
    };
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Address not found' },
      });
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });

    return {
      message: { title: 'Success', subTitle: 'Address updated successfully' },
      address,
    };
  }

  async deleteAddress(userId: string, addressId: string): Promise<MessageResponse> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Address not found' },
      });
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    return {
      message: { title: 'Success', subTitle: 'Address deleted successfully' },
    };
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<AddressResponseDto> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Address not found' },
      });
    }

    await this.prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return {
      message: { title: 'Success', subTitle: 'Default address updated' },
      address,
    };
  }
}
