import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiResponse, ApiOperation } from '@nestjs/swagger';
import { LoginDto } from '../dto';
import {
  LoginResponseDto,
  AuthErrorResponseDto,
} from '../response';

export const LoginDocs = applyDecorators(
  ApiOperation({ summary: 'Login with phone number and password' }),
  ApiBody({ type: LoginDto }),
  ApiOkResponse({
    description: 'Tokens and user returned',
    type: LoginResponseDto,
  }),
  ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    type: AuthErrorResponseDto,
  }),
  ApiResponse({
    status: 400,
    description: 'Validation error',
  }),
);
