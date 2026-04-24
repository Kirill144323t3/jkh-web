import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const userIdStr = cookieStore.get('userId')?.value;
  if (!userIdStr) return NextResponse.json({ contacts: [], totalUnread: 0 }, { status: 401 });

  const uid = parseInt(userIdStr);

  // Get all users except current
  const allUsers = await prisma.user.findMany({
    where: { id: { not: uid } },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });

  // Get last messages and unread counts for each contact
  const contacts = await Promise.all(
    allUsers.map(async (user) => {
      const lastMsg = await prisma.chatMessage.findFirst({
        where: {
          OR: [
            { senderId: uid, receiverId: user.id },
            { senderId: user.id, receiverId: uid },
          ],
        },
        orderBy: { createdAt: 'desc' },
        select: { text: true, fileName: true, createdAt: true, senderId: true },
      });

      const unreadCount = await prisma.chatMessage.count({
        where: { senderId: user.id, receiverId: uid, isRead: false },
      });

      let lastMessage: string | null = null;
      if (lastMsg) {
        if (lastMsg.text) {
          lastMessage = lastMsg.senderId === uid ? `Вы: ${lastMsg.text.slice(0, 40)}` : lastMsg.text.slice(0, 40);
        } else if (lastMsg.fileName) {
          lastMessage = lastMsg.senderId === uid ? `Вы: 📎 ${lastMsg.fileName}` : `📎 ${lastMsg.fileName}`;
        }
      }

      return {
        id: user.id,
        fullName: user.fullName,
        lastMessage,
        lastMessageTime: lastMsg?.createdAt?.toISOString() || null,
        unreadCount,
      };
    })
  );

  // Sort: contacts with messages first, then by last message time
  contacts.sort((a, b) => {
    if (a.lastMessageTime && !b.lastMessageTime) return -1;
    if (!a.lastMessageTime && b.lastMessageTime) return 1;
    if (a.lastMessageTime && b.lastMessageTime) {
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    }
    return a.fullName.localeCompare(b.fullName);
  });

  const totalUnread = contacts.reduce((sum, c) => sum + c.unreadCount, 0);

  return NextResponse.json({ contacts, totalUnread });
}
