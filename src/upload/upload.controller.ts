import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGroups } from '../auth/roles';
import { UserErrorResponseDto } from '../user/response/error.response';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserService } from '../user/user.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserWithoutPassword } from '@common/types';
import { UploadResponseDto } from './upload.response';

const IMAGE_TYPES = /^image\/(jpeg|jpg|png|webp)$/;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function validateImage(file: Express.Multer.File) {
  if (!file) throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'No file provided' } });
  if (!IMAGE_TYPES.test(file.mimetype))
    throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'Only JPEG, PNG and WebP images are allowed' } });
  if (file.size > MAX_SIZE)
    throw new BadRequestException({ message: { title: 'Bad Request', subTitle: 'File must be smaller than 10 MB' } });
}

const fileInterceptorOpts = { storage: memoryStorage() };

@ApiTags('upload')
@Controller({ path: 'upload', version: '1' })
export class UploadController {
  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly userService: UserService,
  ) {}

  // ── Avatar ─────────────────────────────────────────────────────────────────

  @Post('avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', fileInterceptorOpts))
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ type: UploadResponseDto })
  async uploadAvatar(
    @CurrentUser() user: UserWithoutPassword,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    validateImage(file);

    const result = await this.cloudinary.upload(file, 'kyung/avatars', {
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      public_id: `avatar_${user.id}`,
      overwrite: true,
    });

    await this.userService.updateProfile(user.id, { avatarUrl: result.secure_url });

    return { url: result.secure_url, publicId: result.public_id };
  }

  // ── Product image ───────────────────────────────────────────────────────────

  @Post('product-image')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @UseInterceptors(FileInterceptor('file', fileInterceptorOpts))
  @ApiOperation({ summary: 'Upload a product image (Cloudinary, staff who can edit catalog)' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ type: UploadResponseDto })
  @ApiResponse({ status: 401, type: UserErrorResponseDto })
  @ApiResponse({ status: 403, type: UserErrorResponseDto })
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    validateImage(file);

    const result = await this.cloudinary.upload(file, 'kyung/products', {
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  // ── Story image ─────────────────────────────────────────────────────────────

  @Post('story-image')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @UseInterceptors(FileInterceptor('file', fileInterceptorOpts))
  @ApiOperation({ summary: 'Upload a story image' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ type: UploadResponseDto })
  async uploadStoryImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    validateImage(file);

    const result = await this.cloudinary.upload(file, 'kyung/stories', {
      transformation: [{ width: 1080, height: 1920, crop: 'fill' }],
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  // ── Category image ──────────────────────────────────────────────────────────

  @Post('category-image')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.STAFF)
  @UseInterceptors(FileInterceptor('file', fileInterceptorOpts))
  @ApiOperation({ summary: 'Upload a category cover image' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ type: UploadResponseDto })
  async uploadCategoryImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    validateImage(file);

    const result = await this.cloudinary.upload(file, 'kyung/categories', {
      transformation: [{ width: 800, height: 600, crop: 'fill' }],
    });

    return { url: result.secure_url, publicId: result.public_id };
  }

  // ── Review image ────────────────────────────────────────────────────────────

  @Post('review-image')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file', fileInterceptorOpts))
  @ApiOperation({ summary: 'Upload a review image' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ type: UploadResponseDto })
  async uploadReviewImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    validateImage(file);

    const result = await this.cloudinary.upload(file, 'kyung/reviews', {
      transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    });

    return { url: result.secure_url, publicId: result.public_id };
  }
}
