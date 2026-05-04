import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { RolesGuard } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { RoleGroups } from '@auth/roles';

@ApiTags('stories')
@Controller({ path: 'stories', version: '1' })
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get()
  listActive() {
    return this.storyService.listActive();
  }

  @Get('all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.STAFF)
  listAll() {
    return this.storyService.listAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  create(@Body() dto: CreateStoryDto) {
    return this.storyService.create(dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(...RoleGroups.CAN_DIRECT_EDIT)
  remove(@Param('id') id: string) {
    return this.storyService.remove(id);
  }
}
