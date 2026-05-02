import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProductsModule],
  controllers: [AdminController],
  providers: [AdminService],
  // ProductsService is provided by ProductsModule (imported above)
})
export class AdminModule {}
