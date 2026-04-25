import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageItem } from '@utils';

export class AddressDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional() label: string | null;
  @ApiProperty() street: string;
  @ApiPropertyOptional() street2: string | null;
  @ApiPropertyOptional() landmark?: string | null;
  @ApiProperty() city: string;
  @ApiPropertyOptional() state: string | null;
  @ApiProperty() postalCode: string;
  @ApiProperty() country: string;
  @ApiProperty() isDefault: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class AddressResponseDto {
  @ApiProperty({ type: MessageItem }) message: MessageItem;
  @ApiProperty({ type: AddressDto }) address: AddressDto;
}

export class AddressListResponseDto {
  @ApiProperty({ type: MessageItem }) message: MessageItem;
  @ApiProperty({ type: [AddressDto] }) addresses: AddressDto[];
}
