import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminRequestStatus, OrderStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAdminRequestDto } from './dto/create-admin-request.dto';
import { ResolveAdminRequestDto } from './dto/resolve-admin-request.dto';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { RoleGroups } from '@auth/roles';
import type { UserWithoutPassword } from '@common/types';

@ApiTags('admin')
@Controller({ path: 'admin', version: '1' })
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(...RoleGroups.STAFF)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('revenue')
  getRevenue() {
    return this.adminService.getRevenue();
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

  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Roles(...RoleGroups.CAN_ASSIGN_ROLE)
  @Patch('users/:id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() actor: UserWithoutPassword,
  ) {
    return this.adminService.updateUserRole(actor.role, id, dto.role);
  }

  @Roles(...RoleGroups.CAN_APPROVE)
  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() actor: UserWithoutPassword) {
    return this.adminService.deleteUser(actor.role, id);
  }

  // ── Admin Requests ─────────────────────────────────────────────────────────

  @Get('requests')
  getAdminRequests(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: AdminRequestStatus,
  ) {
    return this.adminService.getAdminRequests(+page, +limit, status);
  }

  @Post('requests')
  createAdminRequest(
    @Body() dto: CreateAdminRequestDto,
    @CurrentUser() actor: UserWithoutPassword,
  ) {
    return this.adminService.createAdminRequest(actor.id, dto.type, {
      targetUserId: dto.targetUserId,
      targetRole: dto.targetRole,
      targetProductId: dto.targetProductId,
      targetOrderId: dto.targetOrderId,
      payload: dto.payload,
      reason: dto.reason,
    });
  }

  @Roles(...RoleGroups.CAN_APPROVE)
  @Patch('requests/:id/resolve')
  resolveAdminRequest(
    @Param('id') id: string,
    @Body() dto: ResolveAdminRequestDto,
    @CurrentUser() actor: UserWithoutPassword,
  ) {
    return this.adminService.resolveAdminRequest(actor.id, actor.role, id, dto.status as 'APPROVED' | 'REJECTED');
  }

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

  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @Patch('orders/:id')
  updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() admin: UserWithoutPassword,
  ) {
    return this.adminService.updateOrder(id, dto, admin.id);
  }

  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @Patch('orders/:id/status')
  updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() admin: UserWithoutPassword,
  ) {
    return this.adminService.updateOrderStatus(id, dto.status, admin.id);
  }
}
