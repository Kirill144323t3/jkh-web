import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const roleId = cookieStore.get('roleId')?.value;

  // Только для администратора
  if (roleId !== '1') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Собираем все данные из базы
    const backupData = {
      timestamp: new Date().toISOString(),
      data: {
        roles: await prisma.role.findMany(),
        departments: await prisma.department.findMany(),
        users: await prisma.user.findMany(),
        registrations: await prisma.registration.findMany(),
        documentStatuses: await prisma.documentStatus.findMany(),
        documents: await prisma.document.findMany(),
        auditLogs: await prisma.auditLog.findMany(),
      }
    };

    // Формируем JSON
    const jsonString = JSON.stringify(backupData, null, 2);

    // Формируем красивое имя файла: backup-2023-10-25T14-30-00.json
    const date = new Date().toISOString().replace(/[:.]/g, '-').split('T');
    const fileName = `backup-${date[0]}T${date[1].substring(0, 8)}.json`;

    // Возвращаем ответ как файл для скачивания
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Ошибка при создании резервной копии:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
