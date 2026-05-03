import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { InitiatePaymentResponseDto, WebhookAckDto } from '../response';
import { UserErrorResponseDto } from '../../user/response/error.response';

export const InitiatePaymentDocs = applyDecorators(
  ApiOperation({ summary: 'Create a Razorpay order for a pending DB order' }),
  ApiBearerAuth('access-token'),
  ApiCreatedResponse({ description: 'Razorpay order created', type: InitiatePaymentResponseDto }),
  ApiResponse({ status: 400, description: 'Order is not PENDING', type: UserErrorResponseDto }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
  ApiResponse({ status: 403, type: UserErrorResponseDto }),
  ApiResponse({ status: 404, description: 'Order not found', type: UserErrorResponseDto }),
);

export const SimulateWebhookDocs = applyDecorators(
  ApiOperation({ summary: '[DEV/STAGING ONLY] Simulate a Razorpay webhook event end-to-end' }),
  ApiBearerAuth('access-token'),
  ApiOkResponse({ description: 'Simulated event processed', type: WebhookAckDto }),
  ApiResponse({ status: 403, description: 'Not available in production' }),
  ApiResponse({ status: 401, type: UserErrorResponseDto }),
);

export const WebhookDocs = applyDecorators(
  ApiOperation({ summary: 'Razorpay webhook receiver (signature-verified)' }),
  ApiHeader({ name: 'x-razorpay-signature', description: 'HMAC-SHA256 signature from Razorpay', required: true }),
  ApiOkResponse({ description: 'Event acknowledged', type: WebhookAckDto }),
  ApiResponse({ status: 400, description: 'Invalid signature' }),
);
