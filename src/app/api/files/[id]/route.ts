// @ts-nocheck 
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const docId = parseInt(id);
  const type = request.nextUrl.searchParams.get('type') || 'original';

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: type === 'result'
      ? { resultFileData: true, resultFileName: true, resultFileType: true }
      : { fileData: true, fileName: true, fileType: true }
  });

  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const fileData = type === 'result' ? doc.resultFileData : doc.fileData;
  const fileName = type === 'result' ? doc.resultFileName : doc.fileName;
  const fileType = type === 'result' ? doc.resultFileType : doc.fileType;

  if (!fileData) {
    return NextResponse.json({ error: 'No file' }, { status: 404 });
  }

  // fileData is stored as "data:<mime>;base64,<data>"
  const base64Match = fileData.match(/^data:([^;]+);base64,(.+)$/);
  if (!base64Match) {
    return NextResponse.json({ error: 'Invalid file format' }, { status: 500 });
  }

  const mimeType = base64Match[1];
  const base64Data = base64Match[2];
  const buffer = Buffer.from(base64Data, 'base64');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': fileType || mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName || 'file')}"`,
      'Content-Length': buffer.length.toString(),
    },
  });
}
