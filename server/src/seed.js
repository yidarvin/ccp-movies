import bcrypt from 'bcryptjs'
import prisma from './lib/prisma.js'

export async function seedIfEmpty() {
  const userCount = await prisma.user.count()
  if (userCount > 0) {
    console.log('Users already exist, skipping seed')
    return
  }

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    console.warn('WARN: ADMIN_PASSWORD not set — skipping admin seed. Set it and restart to create the admin user.')
    return
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
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
}

// Allow running directly: node src/seed.js
if (import.meta.url === `file://${process.argv[1]}`) {
  seedIfEmpty()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}