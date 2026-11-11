import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const categories = ["Nasional", "Teknologi", "Ekonomi", "Olahraga", "Opini"]

async function main() {
  for (const [orderIndex, name] of categories.entries()) {
    const slug = name.toLowerCase()
    await prisma.category.upsert({
      where: { slug },
      update: { orderIndex },
      create: { name, slug, orderIndex },
    })
  }
}

main().finally(() => prisma.$disconnect())
