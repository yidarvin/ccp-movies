import bcrypt from 'bcryptjs'
import prisma from './lib/prisma.js'

export async function seedIfEmpty() {
  const userCount = await prisma.user.count()
  if (userCount === 0) {
    const passwordHash = await bcrypt.hash('changeme', 12)
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        passwordHash,
        isAdmin: true,
      },
    })
    console.log(`Seeded admin user: ${admin.username} (id: ${admin.id})`)
  } else {
    console.log('Users already exist, skipping seed')
  }
}

// Allow running directly: node src/seed.js
seedIfEmpty()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())