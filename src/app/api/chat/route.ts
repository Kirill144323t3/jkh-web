import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const contactId = req.nextUrl.searchParams.get('contactId');

  if (!userId || !contactId) return NextResponse.json([], { status: 400 });

  const uid = parseInt(userId);
  const cid = parseInt(contactId);

  // Mark messages as read
  await prisma.chatMessage.updateMany({
    where: { senderId: cid, receiverId: uid, isRead: false },
    data: { isRead: true },
  });

  const messages = await prisma.chatMessage.findMany({
    where: {
      OR: [
        { senderId: uid, receiverId: cid },
        { senderId: cid, receiverId: uid },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      text: true,
      fileName: true,
      fileType: true,
      isRead: true,
      createdAt: true,
    },
  });

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const senderId = parseInt(formData.get('senderId') as string);
  const receiverId = parseInt(formData.get('receiverId') as string);
  const text = formData.get('text') as string | null;
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

  const message = await prisma.chatMessage.create({
    data: {
      senderId,
      receiverId,
      text: text || null,
      fileName,
      fileData,
      fileType,
    },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      text: true,
      fileName: true,
      fileType: true,
      isRead: true,
      createdAt: true,
    },
  });

  // Create notification for receiver
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { fullName: true } });
  await prisma.notification.create({
    data: {
      userId: receiverId,
      title: 'Новое сообщение',
      message: `${sender?.fullName || 'Пользователь'}: ${text?.slice(0, 50) || (fileName ? `📎 ${fileName}` : 'Файл')}`,
      link: null,
    },
  });

  return NextResponse.json(message);
}
