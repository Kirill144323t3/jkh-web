import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const commentId = parseInt(id);

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { fileData: true, fileName: true, fileType: true },
  });

  if (!comment?.fileData) return new NextResponse('Not found', { status: 404 });

  const base64 = comment.fileData.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': comment.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(comment.fileName || 'file')}"`,
    },
  });
}
