import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const directDatabaseUrl = process.env.DATABASE_URL_DIRECT
const accelerateDatabaseUrl = process.env.DATABASE_URL

if (!directDatabaseUrl && !accelerateDatabaseUrl) {
  throw new Error('DATABASE_URL_DIRECT or DATABASE_URL is not defined')
}

const prisma = directDatabaseUrl
  ? new PrismaClient({ adapter: new PrismaPg(directDatabaseUrl) })
  : new PrismaClient({ accelerateUrl: accelerateDatabaseUrl! })

type CliArgs = {
  name?: string
  email?: string
  password?: string
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const parsed: CliArgs = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    if (arg === '--name' && next) {
      parsed.name = next
      i++
      continue
    }

    if (arg === '--email' && next) {
      parsed.email = next
      i++
      continue
    }

    if (arg === '--password' && next) {
      parsed.password = next
      i++
      continue
    }
  }

  return parsed
}

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email)
}

async function main() {
  const cli = parseArgs()

  const name = cli.name ?? process.env.ADMIN_NAME
  const email = cli.email ?? process.env.ADMIN_EMAIL
  const password = cli.password ?? process.env.ADMIN_PASSWORD

  if (!name || !email || !password) {
    throw new Error(
      'Missing required data. Use --name --email --password or ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD env vars.'
    )
  }

  if (!isValidEmail(email)) {
    throw new Error('Invalid email format')
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long')
  }

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { displayName: 'Administrator' },
    create: {
      name: 'admin',
      displayName: 'Administrator',
    },
  })

  const hashedPassword = await bcrypt.hash(password, 10)

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name,
        password: hashedPassword,
        roleId: adminRole.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            name: true,
            displayName: true,
          },
        },
      },
    })

    console.log('✅ Existing user updated as admin')
    console.log(updated)
    return
  }

  const created = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      roleId: adminRole.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: {
        select: {
          name: true,
          displayName: true,
        },
      },
      createdAt: true,
    },
  })

  console.log('✅ Admin user created successfully')
  console.log(created)
}

main()
  .catch((error) => {
    console.error('❌ createAdmin failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
