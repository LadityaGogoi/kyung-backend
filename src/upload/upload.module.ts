import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { UploadController } from './upload.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [CloudinaryModule, UserModule, AuthModule],
  controllers: [UploadController],
  providers: [RolesGuard],
})
export class UploadModule {}
