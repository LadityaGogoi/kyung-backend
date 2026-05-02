import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import {
  CreateOrderDocs,
  ListMyOrdersDocs,
  ListOrdersAdminDocs,
  GetOrderDocs,
  UpdateOrderStatusDocs,
  CancelOrderDocs,
} from './docs';
import { CreateOrderDto, ListOrdersAdminQueryDto, ListOrdersQueryDto, UpdateOrderStatusDto } from './dto';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { RoleGroups } from '@auth/roles';
import type { UserWithoutPassword } from '@common/types';

@ApiTags('orders')
@Controller({ path: 'orders', version: '1' })
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @CreateOrderDocs
  createOrder(@CurrentUser() user: UserWithoutPassword, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get()
  @ListMyOrdersDocs
  listMyOrders(@CurrentUser() user: UserWithoutPassword, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.listMyOrders(user.id, query);
  }

  // Declare literal routes before :id to avoid ambiguity
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(...RoleGroups.STAFF)
  @ListOrdersAdminDocs
  listOrdersAdmin(@Query() query: ListOrdersAdminQueryDto) {
    return this.ordersService.listOrdersAdmin(query);
  }

  @Get(':id')
  @GetOrderDocs
  getOrder(@CurrentUser() user: UserWithoutPassword, @Param('id') id: string) {
    const scopeToUser = this.ordersService.isStaff(user.role) ? null : user.id;
    return this.ordersService.getOrderById(id, scopeToUser);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @UpdateOrderStatusDocs
  updateStatus(
    @CurrentUser() user: UserWithoutPassword,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto, user.id);
  }

  @Post(':id/cancel')
  @CancelOrderDocs
  cancelOrder(@CurrentUser() user: UserWithoutPassword, @Param('id') id: string) {
    return this.ordersService.cancelOrder(id, user.id);
  }
}
