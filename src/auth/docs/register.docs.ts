import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RegisterDto } from '../dto';
import {
  RegisterResponseDto,
  AuthErrorResponseDto,
} from '../response';

export const RegisterDocs = applyDecorators(
  ApiOperation({ summary: 'Register a new user' }),
  ApiBody({ type: RegisterDto }),
  ApiCreatedResponse({
    description: 'User registered and tokens returned',
    type: RegisterResponseDto,
  }),
  ApiResponse({
    status: 409,
    description: 'Email already registered',
    type: AuthErrorResponseDto,
  }),
  ApiResponse({
    status: 400,
    description: 'Validation error',
  }),
);
