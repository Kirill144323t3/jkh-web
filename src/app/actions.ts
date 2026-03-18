'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

// === ВСПОМОГАТЕЛЬНОЕ ЛОГИРОВАНИЕ ===
async function logAction(userId: number | null, action: string, details?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null
      }
    });
  } catch (e) {
    console.error("Ошибка лога:", e);
  }
}

// === ВХОД И ВЫХОД ===
export async function loginUser(formData: FormData) {
  const login = formData.get('login') as string;
  const password = formData.get('password') as string;

  const reg = await prisma.registration.findUnique({
    where: { login },
    include: { user: true }
  });

  if (!reg || reg.password !== password) {
    redirect('/login?error=1');
  }

  if (reg.isBlocked) {
    redirect('/login?error=blocked');
  }

  const cookieStore = await cookies();
  cookieStore.set('userId', reg.userId.toString(), { maxAge: 60 * 60 * 24 });
  cookieStore.set('roleId', reg.user.roleId.toString(), { maxAge: 60 * 60 * 24 });

  await logAction(reg.userId, 'Вход в систему');

  if (reg.user.roleId === 1) {
    redirect('/?section=documents');
  } else {
    redirect('/dashboard');
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('userId');
  cookieStore.delete('roleId');
  redirect('/login');
}

// === УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ===
export async function createUser(formData: FormData) {
  const fullName = formData.get('fullName') as string;
  const login = formData.get('login') as string;
  const password = formData.get('password') as string;
  const roleId = parseInt(formData.get('roleId') as string);
  const deptId = formData.get('departmentId');
  const departmentId = deptId ? parseInt(deptId as string) : null;

  await prisma.user.create({
    data: {
      fullName,
      position: 'Сотрудник',
      roleId,
      departmentId,
      registration: {
        create: { login, password }
      }
    }
  });
  revalidatePath('/');
}

export async function updateUser(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  const fullName = formData.get('fullName') as string;
  const roleId = parseInt(formData.get('roleId') as string);
  const password = formData.get('password') as string;

  await prisma.user.update({
    where: { id },
    data: { fullName, roleId }
  });

  if (password) {
    await prisma.registration.update({
      where: { userId: id },
      data: { password }
    });
  }
  revalidatePath('/');
}

export async function deleteUser(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  await prisma.user.delete({ where: { id } });
  revalidatePath('/');
}

export async function toggleBlockUser(formData: FormData) {
  const userId = parseInt(formData.get('userId') as string);
  const reg = await prisma.registration.findUnique({ where: { userId } });
  if (reg) {
    await prisma.registration.update({
      where: { userId },
      data: { isBlocked: !reg.isBlocked }
    });
  }
  revalidatePath('/');
}

// === ОТДЕЛЫ ===
export async function createDepartment(formData: FormData) {
  const name = formData.get('departmentName') as string;
  await prisma.department.create({ data: { departmentName: name } });
  revalidatePath('/');
}

export async function deleteDepartment(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  await prisma.department.delete({ where: { id } });
  revalidatePath('/');
}

// === ДОКУМЕНТЫ ===
export async function createDocument(formData: FormData) {
  const cookieStore = await cookies();
  const authorId = parseInt(cookieStore.get('userId')?.value || '1');
  const title = formData.get('title') as string;

  await prisma.document.create({
    data: { title, userId: authorId, statusId: 1 }
  });
  revalidatePath('/');
}

export async function deleteDocument(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  await prisma.document.delete({ where: { id } });
  revalidatePath('/');
}

export async function updateDocumentStatus(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  const statusId = parseInt(formData.get('statusId') as string);

  await prisma.document.update({
    where: { id },
    data: {
      statusId,
      completedAt: statusId === 4 ? new Date() : null
    }
  });
  revalidatePath('/');
}

export async function submitDocumentResult(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  const resultText = formData.get('resultText') as string;

  await prisma.document.update({
    where: { id },
    data: { resultText, statusId: 3 }
  });
  revalidatePath('/');
  redirect('/dashboard');
}

// === ПАРОЛИ (СБРОС) ===
export async function requestPasswordReset(formData: FormData) {
  const login = formData.get('login') as string;
  await prisma.passwordResetRequest.create({
    data: { login, status: 'PENDING' }
  });
  revalidatePath('/login');
}

export async function resolvePasswordReset(formData: FormData) {
  const id = parseInt(formData.get('id') as string);
  const action = formData.get('action') as string;

  if (action === 'APPROVE') {
    const request = await prisma.passwordResetRequest.findUnique({ where: { id } });
    if (request) {
      await prisma.registration.update({
        where: { login: request.login },
        data: { password: '123' }
      });
    }
  }

  await prisma.passwordResetRequest.delete({ where: { id } });
  revalidatePath('/');
}