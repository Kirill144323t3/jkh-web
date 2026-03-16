const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Create 3 departments
  const depts = await Promise.all([
    prisma.department.create({ data: { departmentName: 'Отдел Ремонта' } }),
    prisma.department.create({ data: { departmentName: 'Отдел Обслуживания' } }),
    prisma.department.create({ data: { departmentName: 'ИТ Отдел' } }),
  ])

  console.log('Departments created.')

  // Password for everyone
  const targetPassword = '123qwe'
  const expiresDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

  // Roles expected: 1 - Admin, 3 - Сотрудник, 4 - Руководитель

  // Create users for Dept 1
  await prisma.user.create({
    data: {
      fullName: 'Иванов Иван Иванович (Рук. Ремонта)', position: 'Руководитель', roleId: 4, departmentId: depts[0].id,
      registration: { create: { login: 'ivanov_ruk', password: targetPassword, passwordExpires: expiresDate } }
    }
  })
  await prisma.user.create({
    data: {
      fullName: 'Петров Петр Петрович', position: 'Сотрудник', roleId: 3, departmentId: depts[0].id,
      registration: { create: { login: 'petrov_rab', password: targetPassword, passwordExpires: expiresDate } }
    }
  })
  await prisma.user.create({
    data: {
      fullName: 'Сидоров Сидор Сидорович', position: 'Сотрудник', roleId: 3, departmentId: depts[0].id,
      registration: { create: { login: 'sidorov_rab', password: targetPassword, passwordExpires: expiresDate } }
    }
  })

  // Create users for Dept 2
  await prisma.user.create({
    data: {
      fullName: 'Смирнова Анна (Рук. Обслуживания)', position: 'Руководитель', roleId: 4, departmentId: depts[1].id,
      registration: { create: { login: 'smirnova_ruk', password: targetPassword, passwordExpires: expiresDate } }
    }
  })
  await prisma.user.create({
    data: {
      fullName: 'Новиков Алексей', position: 'Сотрудник', roleId: 3, departmentId: depts[1].id,
      registration: { create: { login: 'novikov_rab', password: targetPassword, passwordExpires: expiresDate } }
    }
  })

  // Create users for Dept 3
  await prisma.user.create({
    data: {
      fullName: 'Технов Илья (Рук. ИТ)', position: 'Руководитель', roleId: 4, departmentId: depts[2].id,
      registration: { create: { login: 'tehnov_ruk', password: targetPassword, passwordExpires: expiresDate } }
    }
  })
  
  console.log('Users created with password "123qwe".')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
