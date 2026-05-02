import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { AuthModule } from '@auth/auth.module';
import { RolesGuard } from '@auth/guards/roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [CategoryController],
  providers: [CategoryService, RolesGuard],
  exports: [CategoryService],
})
export class CategoryModule {}
