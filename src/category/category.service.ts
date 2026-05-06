import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

export type CategoryTreeNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children: CategoryTreeNode[];
};

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active categories only, arbitrary depth. */
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const rows = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        parentId: true,
        sortOrder: true,
        isActive: true,
      },
    });

    return this.buildTree(rows);
  }

  /** Flat list for admin product forms (active only, matches previous admin API). */
  async listFlatForAdmin() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, parentId: true },
      orderBy: { name: 'asc' },
    });
  }

  /** All categories (including inactive) for the admin categories management tab. */
  async listAllForAdmin() {
    return this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        parentId: true,
        sortOrder: true,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException({
          message: { title: 'Not Found', subTitle: 'Parent category not found' },
        });
      }
    }

    const slug = await this.ensureUniqueSlug(this.slugify(dto.slug ?? dto.name));

    try {
      const category = await this.prisma.category.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          imageUrl: dto.imageUrl,
          parentId: dto.parentId ?? null,
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
      return {
        message: { title: 'Success', subTitle: 'Category created' },
        category,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          message: { title: 'Conflict', subTitle: 'Slug already exists' },
        });
      }
      throw e;
    }
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Category not found' },
      });
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException({
          message: { title: 'Bad Request', subTitle: 'Category cannot be its own parent' },
        });
      }
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException({
          message: { title: 'Not Found', subTitle: 'Parent category not found' },
        });
      }
      const cycle = await this.wouldCreateParentCycle(id, dto.parentId);
      if (cycle) {
        throw new BadRequestException({
          message: { title: 'Bad Request', subTitle: 'Invalid parent (would create a cycle)' },
        });
      }
    }

    let slug: string | undefined;
    if (dto.slug !== undefined) {
      slug = await this.ensureUniqueSlug(this.slugify(dto.slug), id);
    } else if (dto.name !== undefined && dto.slug === undefined) {
      // keep existing slug unless name-only change should not touch slug — keep slug stable
    }

    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (slug !== undefined) data.slug = slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.parentId !== undefined) {
      data.parent = dto.parentId
        ? { connect: { id: dto.parentId } }
        : { disconnect: true };
    }

    try {
      const category = await this.prisma.category.update({ where: { id }, data });
      return {
        message: { title: 'Success', subTitle: 'Category updated' },
        category,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          message: { title: 'Conflict', subTitle: 'Slug already exists' },
        });
      }
      throw e;
    }
  }

  async deleteCategory(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: { title: 'Not Found', subTitle: 'Category not found' },
      });
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: { title: 'Success', subTitle: 'Category deleted' } };
  }

  private buildTree(
    rows: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      imageUrl: string | null;
      parentId: string | null;
      sortOrder: number;
      isActive: boolean;
    }[],
  ): CategoryTreeNode[] {
    const map = new Map<string, CategoryTreeNode>();
    for (const r of rows) {
      map.set(r.id, { ...r, children: [] });
    }
    const roots: CategoryTreeNode[] = [];
    for (const r of rows) {
      const node = map.get(r.id)!;
      if (r.parentId && map.has(r.parentId)) {
        map.get(r.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  private slugify(raw: string): string {
    return raw
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'category';
  }

  /** Resolves slug collisions by appending -1, -2, ... */
  private async ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = base;
    let n = 0;
    for (;;) {
      const found = await this.prisma.category.findUnique({ where: { slug } });
      if (!found || found.id === excludeId) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }

  /** True if assigning parentId as parent of categoryId would create a cycle. */
  private async wouldCreateParentCycle(categoryId: string, parentId: string): Promise<boolean> {
    let idWalk: string | null = parentId;
    while (idWalk) {
      if (idWalk === categoryId) return true;
      const row = await this.prisma.category.findUnique({
        where: { id: idWalk },
        select: { parentId: true },
      });
      idWalk = row?.parentId ?? null;
    }
    return false;
  }
}
