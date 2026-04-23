const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 1. Создаем роли
  await prisma.role.createMany({
    data: [
      { id: 1, name: 'Администратор' },
      { id: 2, name: 'Сотрудник' },
      { id: 4, name: 'Руководитель' },
    ],
  })

  // 2. Создаем отдел
  const dept = await prisma.department.create({
    data: { departmentName: 'Администрация' }
  })

  // 3. Создаем пользователя Кирилл и его регистрацию
  // Пароль будет: 123456 (захеширован заранее)
  const user = await prisma.user.create({
    data: {
      fullName: 'Князев Кирилл',
      position: 'Главный админ',
      roleId: 1,
      departmentId: dept.id,
      registration: {
        create: {
          login: 'kirill',
          password: '123456', // Changed to plain text to match actions.ts
        }
      }
    }
  })

  console.log('✅ База готова! Логин: kirill, Пароль: 123456')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })