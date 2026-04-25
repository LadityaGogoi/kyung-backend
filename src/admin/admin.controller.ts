import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OrderStatus, UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import type { UserWithoutPassword } from '@common/types';

@ApiTags('admin')
@Controller({ path: 'admin', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(+page, +limit, search);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ── Products ───────────────────────────────────────────────────────────────

  @Get('products')
  getProducts(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.getProducts(+page, +limit, search);
  }

  @Get('products/:id')
  getProduct(@Param('id') id: string) {
    return this.adminService.getProduct(id);
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.adminService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(id);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  @Get('orders')
  getOrders(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: OrderStatus,
  ) {
    return this.adminService.getOrders(+page, +limit, status);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.adminService.getOrder(id);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() admin: UserWithoutPassword,
  ) {
    return this.adminService.updateOrderStatus(id, dto.status, admin.id);
  }
}
