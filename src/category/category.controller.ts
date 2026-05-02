import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CategoryService } from './category.service';
import {
  GetCategoryTreeDocs,
  ListCategoriesFlatAdminDocs,
  CreateCategoryDocs,
  UpdateCategoryDocs,
  DeleteCategoryDocs,
} from './docs';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { RoleGroups } from '@auth/roles';

@ApiTags('categories')
@Controller({ path: 'categories', version: '1' })
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('tree')
  @GetCategoryTreeDocs
  getTree() {
    return this.categoryService.getCategoryTree();
  }

  @Get('flat')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.STAFF)
  @ListCategoriesFlatAdminDocs
  listFlat() {
    return this.categoryService.listFlatForAdmin();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @CreateCategoryDocs
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.createCategory(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @UpdateCategoryDocs
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  @DeleteCategoryDocs
  remove(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}
