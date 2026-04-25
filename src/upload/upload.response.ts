import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ description: 'Cloudinary secure URL' })
  url: string;

  @ApiProperty({ description: 'Cloudinary public ID (used for deletion/transformation)' })
  publicId: string;
}
