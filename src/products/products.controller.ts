import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getProducts(
    @Query('page') page = '1',
    @Query('limit') limit = '24',
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('gender') gender?: Gender,
    @Query('featured') featured?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('sortBy') sortBy?: 'newest' | 'price_asc' | 'price_desc',
  ) {
    return this.productsService.getProducts({
      page: +page,
      limit: +limit,
      search,
      categoryId,
      subcategoryId,
      gender,
      featured: featured === 'true',
      minPrice: minPrice ? +minPrice : undefined,
      maxPrice: maxPrice ? +maxPrice : undefined,
      inStock: inStock === 'true',
      sortBy,
    });
  }

  @Get('categories')
  getCategories() {
    return this.productsService.getCategories();
  }
}
