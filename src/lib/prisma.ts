import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Убираем log: ['query'], чтобы сервер не тратил силы на печать логов
    log: ['error', 'warn'], 
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma