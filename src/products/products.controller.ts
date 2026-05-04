import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import {
  AdjustInventoryDto,
  CreateProductDto,
  ListProductsQueryDto,
  ListProductsStaffQueryDto,
  SetProductImagesDto,
  UpdateProductDto,
} from './dto';
import {
  ListProductsDocs,
  GetProductBySlugDocs,
  GetProductByIdDocs,
  ListProductsFlatStaffDocs,
  GetProductStaffByIdDocs,
  CreateProductDocs,
  UpdateProductDocs,
  SetProductImagesDocs,
  AdjustInventoryDocs,
  DeleteProductDocs,
} from './docs';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { RoleGroups } from '@auth/roles';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import type { UserWithoutPassword } from '@common/types';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ListProductsDocs
  list(@Query() query: ListProductsQueryDto) {
    return this.productsService.getProducts(query);
  }

  @Get('flat')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.STAFF)
  @ListProductsFlatStaffDocs
  listFlat(@Query() query: ListProductsStaffQueryDto) {
    return this.productsService.listFlatForStaff(query);
  }

  @Get('my-likes')
  @UseGuards(AuthGuard('jwt'))
  getMyLikes(@CurrentUser() user: UserWithoutPassword) {
    return this.productsService.getMyLikedProductIds(user.id);
  }

  @Get('slug/:slug')
  @GetProductBySlugDocs
  getBySlug(@Param('slug') slug: string) {
    return this.productsService.getProductBySlugPublic(slug);
  }

  @Get('staff/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.STAFF)
  @GetProductStaffByIdDocs
  getStaffById(@Param('id') id: string) {
    return this.productsService.getProductStaffById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @CreateProductDocs
  create(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @UpdateProductDocs
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(id, dto);
  }

  @Patch(':id/images')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @SetProductImagesDocs
  setImages(@Param('id') id: string, @Body() dto: SetProductImagesDto) {
    return this.productsService.setProductImages(id, dto);
  }

  @Patch(':id/inventory')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @AdjustInventoryDocs
  adjustInventory(@Param('id') id: string, @Body() dto: AdjustInventoryDto) {
    return this.productsService.adjustInventory(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @DeleteProductDocs
  remove(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }

  @Get(':id')
  @GetProductByIdDocs
  getById(@Param('id') id: string) {
    return this.productsService.getProductByIdPublic(id);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard('jwt'))
  like(@Param('id') id: string, @CurrentUser() user: UserWithoutPassword) {
    return this.productsService.toggleLike(id, user.id);
  }

  @Get(':id/reviews')
  getReviews(@Param('id') id: string) {
    return this.productsService.getProductReviews(id);
  }
}
