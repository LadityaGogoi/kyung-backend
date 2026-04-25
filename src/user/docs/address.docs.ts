import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AddressListResponseDto, AddressResponseDto, UserErrorResponseDto } from '../response';
import { MessageResponse } from '@utils';

export const GetAddressesDocs = applyDecorators(
  ApiOperation({ summary: 'List all addresses for current user' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Address list', type: AddressListResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);

export const CreateAddressDocs = applyDecorators(
  ApiOperation({ summary: 'Add a new address' }),
  ApiBearerAuth('access-token'),
  ApiCreatedResponse({ description: 'Address created', type: AddressResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);

export const UpdateAddressDocs = applyDecorators(
  ApiOperation({ summary: 'Update an address' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Address ID' }),
  ApiOkResponse({ description: 'Address updated', type: AddressResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);

export const DeleteAddressDocs = applyDecorators(
  ApiOperation({ summary: 'Delete an address' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Address ID' }),
  ApiOkResponse({ description: 'Address deleted', type: MessageResponse }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);

export const SetDefaultAddressDocs = applyDecorators(
  ApiOperation({ summary: 'Set an address as default' }),
  ApiBearerAuth('access-token'),
  ApiParam({ name: 'id', description: 'Address ID' }),
  ApiOkResponse({ description: 'Default address updated', type: AddressResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, type: UserErrorResponseDto }),
);
