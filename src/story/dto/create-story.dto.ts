import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateStoryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  imageUrl: string;

  @IsString()
  publicId: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;
}
