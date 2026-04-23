import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userIdStr = cookieStore.get('userId')?.value;
  if (!userIdStr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = parseInt(userIdStr);
  const formData = await req.formData();
  const documentId = parseInt(formData.get('documentId') as string);
  const text = formData.get('text') as string;
  const file = formData.get('file') as File | null;

  let fileName: string | null = null;
  let fileData: string | null = null;
  let fileType: string | null = null;

  if (file && file.size > 0 && file.size <= 5 * 1024 * 1024) {
    fileName = file.name;
    fileType = file.type || 'application/octet-stream';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fileData = `data:${fileType};base64,${buffer.toString('base64')}`;
  }

  const comment = await prisma.comment.create({
    data: { text, documentId, userId, fileName, fileData, fileType },
    include: { user: { select: { id: true, fullName: true } } },
  });

  // Create notification for document author/assignee
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true, assignedTo: true, title: true },
  });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });

  if (doc) {
    const notifyIds = [doc.userId, doc.assignedTo].filter(id => id && id !== userId) as number[];
    const uniqueIds = [...new Set(notifyIds)];
    for (const nid of uniqueIds) {
      await prisma.notification.create({
        data: {
          userId: nid,
          title: 'Новый комментарий',
          message: `${user?.fullName || 'Пользователь'} прокомментировал «${doc.title.slice(0, 30)}»`,
        },
      });
    }
  }

  return NextResponse.json({
    id: comment.id,
    text: comment.text,
    fileName: comment.fileName,
    fileType: comment.fileType,
    createdAt: comment.createdAt.toISOString(),
    user: comment.user,
  });
}
