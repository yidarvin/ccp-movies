import bcrypt from 'bcryptjs'
import prisma from './lib/prisma.js'

async function main() {
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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
