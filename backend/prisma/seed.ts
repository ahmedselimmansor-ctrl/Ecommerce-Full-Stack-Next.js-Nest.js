// The Prisma CLI loads .env for its own commands, but this script is executed
// directly by ts-node, so it has to load the file itself.
import 'dotenv/config';
import { Gender, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

type ColorSpec = { name: string; nameAr: string; hex: string };

type ProductSeed = {
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  priceCents: number;
  compareAtCents?: number;
  gender: Gender;
  category: string;
  material: string;
  materialAr: string;
  colors: ColorSpec[];
  featured?: boolean;
};

const CATEGORIES = [
  {
    name: 'T-Shirts',
    nameAr: 'تي شيرت',
    slug: 't-shirts',
    description: 'Everyday cotton tees.',
    descriptionAr: 'تي شيرت قطن لكل يوم.',
  },
  {
    name: 'Shirts',
    nameAr: 'قمصان',
    slug: 'shirts',
    description: 'Poplin, oxford and linen shirts.',
    descriptionAr: 'قمصان بوبلين وأكسفورد وكتان.',
  },
  {
    name: 'Hoodies & Sweats',
    nameAr: 'هوديز وسويت شيرت',
    slug: 'hoodies',
    description: 'Heavyweight fleece.',
    descriptionAr: 'خامات ثقيلة ودافئة.',
  },
  {
    name: 'Trousers',
    nameAr: 'بناطيل',
    slug: 'trousers',
    description: 'Chinos, denim and tailored pants.',
    descriptionAr: 'شينو ودنيم وبناطيل كلاسيك.',
  },
  {
    name: 'Dresses',
    nameAr: 'فساتين',
    slug: 'dresses',
    description: 'Day-to-evening silhouettes.',
    descriptionAr: 'قصّات تناسب النهار والسهرة.',
  },
  {
    name: 'Outerwear',
    nameAr: 'جاكيتات',
    slug: 'outerwear',
    description: 'Jackets and coats.',
    descriptionAr: 'جاكيتات ومعاطف.',
  },
];

const BLACK: ColorSpec = { name: 'Black', nameAr: 'أسود', hex: '#111111' };
const WHITE: ColorSpec = { name: 'White', nameAr: 'أبيض', hex: '#F5F5F0' };
const SAND: ColorSpec = { name: 'Sand', nameAr: 'بيچ', hex: '#D8C4A8' };
const OLIVE: ColorSpec = { name: 'Olive', nameAr: 'زيتي', hex: '#5A6247' };
const NAVY: ColorSpec = { name: 'Navy', nameAr: 'كحلي', hex: '#1F2A44' };
const RUST: ColorSpec = { name: 'Rust', nameAr: 'نحاسي', hex: '#9C4A2A' };

const PRODUCTS: ProductSeed[] = [
  {
    name: 'Heavyweight Boxy Tee',
    nameAr: 'تي شيرت بوكسي ثقيل',
    slug: 'heavyweight-boxy-tee',
    description:
      'A 240gsm combed-cotton tee cut with a boxy body and dropped shoulder. Garment-dyed for a lived-in hand feel that softens with every wash.',
    descriptionAr:
      'تي شيرت من القطن الممشّط بوزن ٢٤٠ جرام، بقصّة بوكسي وكتف مسدول. مصبوغ بعد التفصيل عشان يديك ملمس مريح بيزيد نعومة مع كل غسلة.',
    priceCents: 79000,
    compareAtCents: 99000,
    gender: Gender.UNISEX,
    category: 't-shirts',
    material: '100% combed cotton, 240gsm',
    materialAr: '‏١٠٠٪ قطن ممشّط، ٢٤٠ جرام',
    colors: [BLACK, WHITE, SAND],
    featured: true,
  },
  {
    name: 'Pima Crewneck Tee',
    nameAr: 'تي شيرت بيما برقبة دائرية',
    slug: 'pima-crewneck-tee',
    description: 'Long-staple Pima cotton in a clean regular fit with a ribbed collar that holds its shape.',
    descriptionAr: 'قطن بيما طويل التيلة بقصّة عادية مرتّبة، ورقبة مضلّعة بتحافظ على شكلها.',
    priceCents: 62000,
    gender: Gender.MEN,
    category: 't-shirts',
    material: '100% Pima cotton, 180gsm',
    materialAr: '‏١٠٠٪ قطن بيما، ١٨٠ جرام',
    colors: [WHITE, NAVY, OLIVE],
  },
  {
    name: 'Washed Linen Shirt',
    nameAr: 'قميص كتان مغسول',
    slug: 'washed-linen-shirt',
    description: 'European flax, stone-washed until it drapes. Mother-of-pearl buttons and a relaxed camp collar.',
    descriptionAr: 'كتان أوروبي مغسول بالحجر لحد ما بقى ينسدل بنعومة. أزرار صدف ورقبة كامب واسعة.',
    priceCents: 145000,
    gender: Gender.MEN,
    category: 'shirts',
    material: '100% washed linen',
    materialAr: '‏١٠٠٪ كتان مغسول',
    colors: [WHITE, SAND, OLIVE],
    featured: true,
  },
  {
    name: 'Oxford Button-Down',
    nameAr: 'قميص أكسفورد بأزرار',
    slug: 'oxford-button-down',
    description: 'The reference oxford: soft-roll collar, single-needle side seams, and a box pleat at the back.',
    descriptionAr: 'الأكسفورد الكلاسيكي: ياقة ناعمة، حياكة بإبرة واحدة على الجوانب، وكسرة من الخلف.',
    priceCents: 132000,
    gender: Gender.UNISEX,
    category: 'shirts',
    material: '100% cotton oxford',
    materialAr: '‏١٠٠٪ قطن أكسفورد',
    colors: [WHITE, NAVY],
  },
  {
    name: 'Loopback Hoodie',
    nameAr: 'هودي لووب باك',
    slug: 'loopback-hoodie',
    description: 'Loopback French terry with a double-layer hood and ribbed cuffs. Cut slightly cropped.',
    descriptionAr: 'قماش فرنش تيري لووب باك بكابوشة من طبقتين وأساور مضلّعة، بقصّة أقصر شوية.',
    priceCents: 185000,
    compareAtCents: 220000,
    gender: Gender.UNISEX,
    category: 'hoodies',
    material: '80% cotton / 20% recycled polyester',
    materialAr: '‏٨٠٪ قطن / ٢٠٪ بوليستر معاد تدويره',
    colors: [BLACK, SAND, OLIVE],
    featured: true,
  },
  {
    name: 'Crewneck Sweatshirt',
    nameAr: 'سويت شيرت برقبة دائرية',
    slug: 'crewneck-sweatshirt',
    description: 'Brushed-back fleece with set-in sleeves and a V-insert at the collar.',
    descriptionAr: 'صوف مبطّن من الداخل بأكمام مركّبة وقطعة V عند الرقبة.',
    priceCents: 158000,
    gender: Gender.UNISEX,
    category: 'hoodies',
    material: '100% cotton fleece, 380gsm',
    materialAr: '‏١٠٠٪ قطن فليس، ٣٨٠ جرام',
    colors: [NAVY, WHITE, RUST],
  },
  {
    name: 'Pleated Wide Trouser',
    nameAr: 'بنطلون واسع بكسرات',
    slug: 'pleated-wide-trouser',
    description: 'Double-pleat front, high rise, and a wide straight leg that breaks cleanly over the shoe.',
    descriptionAr: 'كسرتين من الأمام، خصر عالي، ورجل واسعة مستقيمة بتنزل بشكل مرتّب على الحذاء.',
    priceCents: 215000,
    gender: Gender.WOMEN,
    category: 'trousers',
    material: '68% viscose / 32% linen',
    materialAr: '‏٦٨٪ فيسكوز / ٣٢٪ كتان',
    colors: [BLACK, SAND],
    featured: true,
  },
  {
    name: 'Garment-Dyed Chino',
    nameAr: 'بنطلون شينو مصبوغ',
    slug: 'garment-dyed-chino',
    description: 'Mid-weight cotton twill, slim-straight, with a hidden stretch panel at the waistband.',
    descriptionAr: 'قطن تويل متوسط الوزن بقصّة سليم مستقيمة، وجزء مطاطي مخفي عند الوسط.',
    priceCents: 168000,
    gender: Gender.MEN,
    category: 'trousers',
    material: '98% cotton / 2% elastane',
    materialAr: '‏٩٨٪ قطن / ٢٪ إيلاستين',
    colors: [SAND, OLIVE, NAVY],
  },
  {
    name: 'Bias-Cut Slip Dress',
    nameAr: 'فستان سليب بقصّة مائلة',
    slug: 'bias-cut-slip-dress',
    description: 'Cut on the bias so it moves with you. Adjustable straps and a French-seamed finish throughout.',
    descriptionAr: 'مقصوص بشكل مائل عشان يتحرك معاكي. حمالات قابلة للتعديل وحياكة فرنسية في كل التفاصيل.',
    priceCents: 245000,
    gender: Gender.WOMEN,
    category: 'dresses',
    material: '100% viscose satin',
    materialAr: '‏١٠٠٪ ساتان فيسكوز',
    colors: [BLACK, RUST],
    featured: true,
  },
  {
    name: 'Poplin Midi Dress',
    nameAr: 'فستان ميدي بوبلين',
    slug: 'poplin-midi-dress',
    description: 'Crisp cotton poplin with a shirred waist and side pockets. Falls just below the calf.',
    descriptionAr: 'بوبلين قطن مقرمش بوسط مكرمش وجيوب جانبية، وطوله تحت نص الساق.',
    priceCents: 198000,
    gender: Gender.WOMEN,
    category: 'dresses',
    material: '100% cotton poplin',
    materialAr: '‏١٠٠٪ قطن بوبلين',
    colors: [WHITE, NAVY],
  },
  {
    name: 'Cotton Chore Jacket',
    nameAr: 'جاكيت شور قطن',
    slug: 'cotton-chore-jacket',
    description: 'Three patch pockets, corozo buttons and a workwear cut roomy enough to layer a knit under.',
    descriptionAr: 'تلات جيوب خارجية وأزرار كوروزو طبيعية وقصّة عملية واسعة تسمح بلبس بلوفر تحتها.',
    priceCents: 285000,
    compareAtCents: 340000,
    gender: Gender.UNISEX,
    category: 'outerwear',
    material: '100% cotton canvas',
    materialAr: '‏١٠٠٪ قماش كانفاس قطن',
    colors: [OLIVE, BLACK, SAND],
    featured: true,
  },
  {
    name: 'Quilted Liner Jacket',
    nameAr: 'جاكيت مبطّن كويلتد',
    slug: 'quilted-liner-jacket',
    description: 'Diamond-quilted shell with a recycled fill, snap front and knit collar. Packs down small.',
    descriptionAr: 'تبطين ماسي بحشو معاد تدويره، أزرار كبس من الأمام وياقة تريكو، وبيتطوى في حجم صغير.',
    priceCents: 320000,
    gender: Gender.UNISEX,
    category: 'outerwear',
    material: 'Recycled polyester shell and fill',
    materialAr: 'بوليستر معاد تدويره من الخارج والحشو',
    colors: [BLACK, OLIVE],
  },
];

/**
 * Real garment photography from Unsplash.
 *
 * The Unsplash License permits commercial use without attribution, which is why
 * these are safe to ship. Do not swap them for images lifted from a retailer's
 * site — those are copyrighted product photography.
 *
 * Only the photo id is stored; the transformation (crop, size, format) is a
 * query string, so the same source photo serves the 3:4 product crop, the
 * square category tile and the wide hero without three separate assets.
 */
type Shot = { id: string; alt: string };

function unsplash(id: string, width: number, height: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

const PRODUCT_SHOT = { width: 900, height: 1200 };
const CATEGORY_SHOT = { width: 800, height: 800 };

/** Wide editorial shot for the homepage banner. */
const HERO_IMAGE = unsplash('1490481651871-ab68de25d43d', 1920, 1080);

const CATEGORY_IMAGES: Record<string, string> = {
  't-shirts': '1562157873-818bc0726f68',
  shirts: '1713881842156-3d9ef36418cc',
  hoodies: '1620799140188-3b2a02fd9a77',
  trousers: '1560243563-062bfc001d68',
  dresses: '1591047139829-d91aecb6caea',
  outerwear: '1551488831-00ddcb6c6bd3',
};

/** Three shots per product, chosen to match the actual garment and colourway. */
const PRODUCT_IMAGES: Record<string, Shot[]> = {
  'heavyweight-boxy-tee': [
    { id: '1583743814966-8936f5b7be1a', alt: 'Black crew-neck cotton t-shirt' },
    { id: '1581655353564-df123a1eb820', alt: 'White crew-neck cotton t-shirt' },
    { id: '1618354691373-d851c5c3a990', alt: 'Black t-shirt laid flat' },
  ],
  'pima-crewneck-tee': [
    { id: '1581655353564-df123a1eb820', alt: 'White crew-neck t-shirt' },
    { id: '1523381294911-8d3cead13475', alt: 'Blue crew-neck tops' },
    { id: '1521572163474-6864f9cf17ab', alt: 'White crew-neck t-shirt worn' },
  ],
  'washed-linen-shirt': [
    { id: '1713881587420-113c1c43e28a', alt: 'White linen shirt hanging' },
    { id: '1591357037205-166318b51afd', alt: 'White button-up shirt worn' },
    { id: '1713881676551-b16f22ce4719', alt: 'White shirt on a line' },
  ],
  'oxford-button-down': [
    { id: '1617117475026-2eb3e68b63cf', alt: 'Blue and white button-up shirt' },
    { id: '1740711152088-88a009e877bb', alt: 'Blue shirt hanging on a wall' },
    { id: '1627686011747-74adda3d2343', alt: 'White dress shirt worn' },
  ],
  'loopback-hoodie': [
    { id: '1556821840-3a63f95609a7', alt: 'Grey pullover hoodie' },
    { id: '1680292783974-a9a336c10366', alt: 'Black hoodie' },
    { id: '1615397587950-3cbb55f95b77', alt: 'White pullover hoodie' },
  ],
  'crewneck-sweatshirt': [
    { id: '1601063476271-a159c71ab0b3', alt: 'White sweatshirt worn' },
    { id: '1611817757591-c3f345024273', alt: 'Grey sweatshirt worn' },
    { id: '1564557287817-3785e38ec1f5', alt: 'Grey sweatshirt detail' },
  ],
  'pleated-wide-trouser': [
    { id: '1493357335960-4583bfa6f8d9', alt: 'Grey tailored trousers' },
    { id: '1584865288642-42078afe6942', alt: 'Black wide-leg trousers' },
    { id: '1594633312681-425c7b97ccd1', alt: 'Trousers and shoes' },
  ],
  'garment-dyed-chino': [
    { id: '1624378439575-d8705ad7ae80', alt: 'Folded trousers on white' },
    { id: '1718252540617-6ecda2b56b57', alt: 'Trousers on a white background' },
    { id: '1604176354204-9268737828e4', alt: 'Trouser fabric detail' },
  ],
  'bias-cut-slip-dress': [
    { id: '1618932260643-eee4a2f652a6', alt: 'Black slip dress' },
    { id: '1550639525-c97d455acf70', alt: 'Black dress worn' },
    { id: '1595777457583-95e059d581b8', alt: 'Sleeveless dress worn' },
  ],
  'poplin-midi-dress': [
    { id: '1623609163859-ca93c959b98a', alt: 'Sleeveless midi dress' },
    { id: '1612336307429-8a898d10e223', alt: 'Long-sleeve dress worn' },
    { id: '1434389677669-e08b4cac3105', alt: 'Dress on a hanger' },
  ],
  'cotton-chore-jacket': [
    { id: '1611312449408-fcece27cdbb7', alt: 'Button-up chore jacket' },
    { id: '1543076447-215ad9ba6923', alt: 'Jacket hanging on a door' },
    { id: '1627637454030-5ddd536e06e5', alt: 'Coat worn outdoors' },
  ],
  'quilted-liner-jacket': [
    { id: '1706765779494-2705542ebe74', alt: 'Quilted padded jacket' },
    { id: '1557418669-db3f781a58c0', alt: 'Padded jacket worn' },
    { id: '1551028719-00167b16eac5', alt: 'Zip-up jacket laid flat' },
  ],
};

function productImages(slug: string): { url: string; alt: string; position: number }[] {
  const shots = PRODUCT_IMAGES[slug];
  if (!shots) throw new Error(`No imagery configured for product "${slug}"`);

  return shots.map((shot, position) => ({
    url: unsplash(shot.id, PRODUCT_SHOT.width, PRODUCT_SHOT.height),
    alt: shot.alt,
    position,
  }));
}

function categoryImage(slug: string): string {
  const id = CATEGORY_IMAGES[slug];
  if (!id) throw new Error(`No imagery configured for category "${slug}"`);
  return unsplash(id, CATEGORY_SHOT.width, CATEGORY_SHOT.height);
}

function sku(slug: string, size: string, color: string): string {
  const base = slug.replace(/[^a-z0-9]/g, '').slice(0, 10).toUpperCase();
  return `${base}-${size}-${color.slice(0, 3).toUpperCase()}`;
}

/** Pseudo-random but stable stock, so seeds are reproducible across runs. */
function stockFor(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return hash % 40;
}

async function main() {
  console.log('Seeding database...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@atelier.test';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const customerEmail = process.env.SEED_CUSTOMER_EMAIL ?? 'customer@atelier.test';
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? 'Customer123!';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      firstName: 'Site',
      lastName: 'Admin',
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: customerEmail },
    update: {},
    create: {
      email: customerEmail,
      passwordHash: await bcrypt.hash(customerPassword, 10),
      firstName: 'Nour',
      lastName: 'Hassan',
      phone: '+201000000000',
      role: Role.CUSTOMER,
    },
  });

  const categoryIds = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        nameAr: category.nameAr,
        description: category.description,
        descriptionAr: category.descriptionAr,
        position: index,
        // Re-applied on every seed so an existing database picks up new imagery.
        imageUrl: categoryImage(category.slug),
      },
      create: { ...category, position: index, imageUrl: categoryImage(category.slug) },
    });
    categoryIds.set(category.slug, row.id);
  }

  for (const product of PRODUCTS) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Unknown category ${product.category}`);

    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        nameAr: product.nameAr,
        description: product.description,
        descriptionAr: product.descriptionAr,
        priceCents: product.priceCents,
        compareAtCents: product.compareAtCents ?? null,
        gender: product.gender,
        material: product.material,
        materialAr: product.materialAr,
        isFeatured: product.featured ?? false,
        categoryId,
      },
      create: {
        name: product.name,
        nameAr: product.nameAr,
        slug: product.slug,
        description: product.description,
        descriptionAr: product.descriptionAr,
        priceCents: product.priceCents,
        compareAtCents: product.compareAtCents ?? null,
        gender: product.gender,
        material: product.material,
        materialAr: product.materialAr,
        care: 'Machine wash cold, tumble dry low, warm iron if needed.',
        careAr: 'غسيل بارد في الغسالة، تجفيف على حرارة منخفضة، وكي دافئ عند اللزوم.',
        isFeatured: product.featured ?? false,
        categoryId,
      },
    });

    // Replaced wholesale so re-seeding an existing database swaps the imagery
    // rather than appending a second set.
    await prisma.productImage.deleteMany({ where: { productId: created.id } });
    await prisma.productImage.createMany({
      data: productImages(product.slug).map((image) => ({ ...image, productId: created.id })),
    });

    for (const color of product.colors) {
      for (const size of SIZES) {
        const variantSku = sku(product.slug, size, color.name);
        await prisma.productVariant.upsert({
          where: { productId_size_color: { productId: created.id, size, color: color.name } },
          update: { stock: stockFor(variantSku), colorHex: color.hex, colorAr: color.nameAr },
          create: {
            productId: created.id,
            sku: variantSku,
            size,
            color: color.name,
            colorAr: color.nameAr,
            colorHex: color.hex,
            stock: stockFor(variantSku),
          },
        });
      }
    }
  }

  console.log(`Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products.`);
  console.log(`Admin login:    ${adminEmail} / ${adminPassword}`);
  console.log(`Customer login: ${customerEmail} / ${customerPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
