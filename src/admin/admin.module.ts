import { Module } from '@nestjs/common';
import { CategoryModule } from '../category/category.module';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProductsModule, CategoryModule],
  controllers: [AdminController],
  providers: [AdminService],
  // ProductsService is provided by ProductsModule (imported above)
})
export class AdminModule {}
