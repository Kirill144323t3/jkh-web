import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json([], { status: 400 });

  const notifications = await prisma.notification.findMany({
    where: { userId: parseInt(userId) },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (body.markAll && body.userId) {
    await prisma.notification.updateMany({
      where: { userId: body.userId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await prisma.notification.update({
      where: { id: body.id },
      data: { isRead: body.isRead ?? true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
