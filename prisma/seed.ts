import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES: { name: string; slug: string; subcategories: { name: string; slug: string }[] }[] = [
  {
    name: 'Clothing',
    slug: 'clothing',
    subcategories: [
      { name: 'Tops & T-Shirts', slug: 'tops-tshirts' },
      { name: 'Bottoms & Trousers', slug: 'bottoms-trousers' },
      { name: 'Dresses & Skirts', slug: 'dresses-skirts' },
      { name: 'Onesies & Rompers', slug: 'onesies-rompers' },
      { name: 'Ethnic Wear', slug: 'ethnic-wear' },
      { name: 'Winter Wear', slug: 'winter-wear' },
      { name: 'Sleepwear & Nightwear', slug: 'sleepwear-nightwear' },
      { name: 'Swimwear', slug: 'swimwear' },
    ],
  },
  {
    name: 'Footwear',
    slug: 'footwear',
    subcategories: [
      { name: 'Sneakers & Casual', slug: 'sneakers-casual' },
      { name: 'Sandals & Slippers', slug: 'sandals-slippers' },
      { name: 'School Shoes', slug: 'school-shoes' },
      { name: 'Boots', slug: 'boots' },
      { name: 'First Walkers', slug: 'first-walkers' },
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    subcategories: [
      { name: 'Hair Accessories', slug: 'hair-accessories' },
      { name: 'Bags & Backpacks', slug: 'bags-backpacks' },
      { name: 'Belts & Suspenders', slug: 'belts-suspenders' },
      { name: 'Sunglasses', slug: 'sunglasses' },
      { name: 'Caps & Hats', slug: 'caps-hats' },
      { name: 'Socks & Stockings', slug: 'socks-stockings' },
    ],
  },
  {
    name: 'Toys & Play',
    slug: 'toys-play',
    subcategories: [
      { name: 'Soft Toys & Plush', slug: 'soft-toys-plush' },
      { name: 'Learning & Educational', slug: 'learning-educational' },
      { name: 'Outdoor & Sports', slug: 'outdoor-sports' },
      { name: 'Building & Blocks', slug: 'building-blocks' },
      { name: 'Arts & Crafts', slug: 'arts-crafts' },
    ],
  },
  {
    name: 'Baby Essentials',
    slug: 'baby-essentials',
    subcategories: [
      { name: 'Diapers & Changing', slug: 'diapers-changing' },
      { name: 'Feeding & Nursing', slug: 'feeding-nursing' },
      { name: 'Skincare & Bath', slug: 'skincare-bath' },
      { name: 'Nursery & Sleep', slug: 'nursery-sleep' },
    ],
  },
  {
    name: 'School Supplies',
    slug: 'school-supplies',
    subcategories: [
      { name: 'Stationery', slug: 'stationery' },
      { name: 'Lunch Boxes & Bottles', slug: 'lunch-boxes-bottles' },
      { name: 'School Bags', slug: 'school-bags' },
    ],
  },
  {
    name: 'Books & Media',
    slug: 'books-media',
    subcategories: [
      { name: 'Story Books', slug: 'story-books' },
      { name: 'Activity Books', slug: 'activity-books' },
      { name: 'Audio & Music', slug: 'audio-music' },
    ],
  },
];

async function main() {
  console.log('Seeding categories…');

  for (const cat of CATEGORIES) {
    const parent = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { name: cat.name, slug: cat.slug, isActive: true },
    });

    for (let i = 0; i < cat.subcategories.length; i++) {
      const sub = cat.subcategories[i];
      await prisma.category.upsert({
        where: { slug: sub.slug },
        update: { name: sub.name },
        create: { name: sub.name, slug: sub.slug, parentId: parent.id, sortOrder: i, isActive: true },
      });
    }

    console.log(`  ✓ ${cat.name} (${cat.subcategories.length} subcategories)`);
  }

  console.log('Done.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
