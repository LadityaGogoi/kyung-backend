import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AddressModule } from './address/address.module';
import { CategoryModule } from './category/category.module';
import { UploadModule } from './upload/upload.module';
import { AdminModule } from './admin/admin.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { PaymentsModule } from './payments/payments.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.ENVIRONMENT !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        level: process.env.ENVIRONMENT === 'production' ? 'info' : 'debug',
        redact: ['req.headers.authorization'],
      },
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    AddressModule,
    CategoryModule,
    UploadModule,
    AdminModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    WishlistModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
