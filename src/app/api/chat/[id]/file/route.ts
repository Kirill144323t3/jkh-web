import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const msgId = parseInt(id);

  const msg = await prisma.chatMessage.findUnique({
    where: { id: msgId },
    select: { fileData: true, fileName: true, fileType: true },
  });

  if (!msg?.fileData) return new NextResponse('Not found', { status: 404 });

  const base64 = msg.fileData.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': msg.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(msg.fileName || 'file')}"`,
    },
  });
}
