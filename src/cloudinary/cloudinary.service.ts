import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export type CloudinaryFolder = 'kyung/avatars' | 'kyung/products' | 'kyung/reviews' | 'kyung/stories';

@Injectable()
export class CloudinaryService {
  upload(
    file: Express.Multer.File,
    folder: CloudinaryFolder,
    transformations?: Record<string, unknown>,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', ...transformations },
        (error, result) => {
          if (error || !result) {
            reject(
              new InternalServerErrorException({
                message: {
                  title: 'Upload Failed',
                  subTitle: error?.message ?? 'Could not upload image',
                },
              }),
            );
          } else {
            resolve(result);
          }
        },
      );

      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
