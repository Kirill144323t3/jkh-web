'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

// === ВНУТРЕННЯЯ УТИЛИТА ЛОГИРОВАНИЯ ===
async function logAction(userId: number | null, action: string, details?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: details ? JSON.stringify(details) : null
      }
    });
  } catch (error) {
    console.error("Ошибка записи лога аудита:", error);
  }
}

// === ФУНКЦИИ УПРАВЛЕНИЯ ПОЛЬЗОВАТЕЛЯМИ ===
export async function createUser(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const login = formData.get('login') as string
  const password = formData.get('password') as string 
  const roleId = parseInt(formData.get('roleId') as string)
  const deptId = formData.get('departmentId')
  const departmentId = deptId ? parseInt(deptId as string) : null
  const position = (roleId === 4) ? 'Руководитель' : ((roleId === 1) ? 'Администратор' : 'Сотрудник');

  try {
    const newUser = await prisma.user.create({
      data: {
        fullName, position, roleId, departmentId,
        registration: {
          create: { login, password, passwordExpires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
        }
      }
    })
    
    // ЛОГИРОВАНИЕ
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('userId')?.value
    await logAction(currentUserId ? parseInt(currentUserId) : null, 'Создание пользователя', { targetUserId: newUser.id, fullName, roleId, departmentId })

  } catch (error) { console.error("Ошибка сохранения:", error) }
  revalidatePath('/')
  redirect('/?section=users')
}

export async function updateUser(formData: FormData) {
  const cookieStore = await cookies()
  if (cookieStore.get('roleId')?.value !== '1') return

  const id = parseInt(formData.get('id') as string)
  const fullName = formData.get('fullName') as string
  const roleId = parseInt(formData.get('roleId') as string)
  const deptId = formData.get('departmentId')
  const departmentId = deptId ? parseInt(deptId as string) : null
  const password = formData.get('password') as string
  const position = (roleId === 4) ? 'Руководитель' : ((roleId === 1) ? 'Администратор' : 'Сотрудник');

  try {
    await prisma.user.update({
      where: { id },
      data: { fullName, position, roleId, departmentId }
    })
    if (password && password.trim() !== '') {
      await prisma.registration.update({ where: { userId: id }, data: { password } })
    }

    // ЛОГИРОВАНИЕ
    const currentUserId = cookieStore.get('userId')?.value
    await logAction(currentUserId ? parseInt(currentUserId) : null, 'Редактирование пользователя', { targetUserId: id, fullName, roleId, departmentId })

  } catch (error) { console.error("Ошибка обновления:", error) }
  revalidatePath('/')
  redirect('/?section=users')
}

export async function deleteUser(formData: FormData) {
  const cookieStore = await cookies()
  if (cookieStore.get('roleId')?.value !== '1') return
  const id = parseInt(formData.get('id') as string)
  if (!id) return
  try { 
    await prisma.user.delete({ where: { id } }) 
    
    // ЛОГИРОВАНИЕ
    const currentUserId = cookieStore.get('userId')?.value
    await logAction(currentUserId ? parseInt(currentUserId) : null, 'Удаление пользователя', { targetUserId: id })

  } catch (error) { console.error(error) }
  revalidatePath('/')
}

export async function toggleBlockUser(formData: FormData) {
  const cookieStore = await cookies()
  if (cookieStore.get('roleId')?.value !== '1') return // Только админ

  const id = parseInt(formData.get('id') as string)
  const isCurrentlyBlocked = formData.get('isBlocked') === 'true'

  try {
    // Меняем статус на противоположный и сбрасываем попытки входа
    await prisma.registration.update({
      where: { userId: id },
      data: { isBlocked: !isCurrentlyBlocked, wrongAttempts: 0, blockedUntil: null }
    })

    // ЛОГИРОВАНИЕ
    const currentUserId = cookieStore.get('userId')?.value
    await logAction(currentUserId ? parseInt(currentUserId) : null, !isCurrentlyBlocked ? 'Блокировка пользователя' : 'Разблокировка пользователя', { targetUserId: id })

  } catch (error) { console.error(error) }
  
  revalidatePath('/')
}

// === ФУНКЦИИ УПРАВЛЕНИЯ ОТДЕЛАМИ ===
export async function createDepartment(formData: FormData) {
  const name = formData.get('departmentName') as string
  if (!name) return;
  const newDept = await prisma.department.create({ data: { departmentName: name } })

  // ЛОГИРОВАНИЕ
  const cookieStore = await cookies()
  const currentUserId = cookieStore.get('userId')?.value
  await logAction(currentUserId ? parseInt(currentUserId) : null, 'Создание отдела', { departmentId: newDept.id, name })

  revalidatePath('/')
  redirect('/?section=departments')
}

export async function deleteDepartment(formData: FormData) {
  const cookieStore = await cookies()
  if (cookieStore.get('roleId')?.value !== '1') return
  const id = parseInt(formData.get('id') as string)
  if (!id) return
  try { 
    await prisma.department.delete({ where: { id } }) 

    // ЛОГИРОВАНИЕ
    const currentUserId = cookieStore.get('userId')?.value
    await logAction(currentUserId ? parseInt(currentUserId) : null, 'Удаление отдела', { departmentId: id })

  } catch (error) { console.error(error) }
  revalidatePath('/')
}

// === ФУНКЦИИ ДОКУМЕНТООБОРОТА ===
export async function createDocument(formData: FormData) {
  const cookieStore = await cookies()
  const authorIdString = cookieStore.get('userId')?.value
  if (!authorIdString) redirect('/login')

  const title = formData.get('title') as string
  const taskDescription = formData.get('taskDescription') as string
  const assignedToStr = formData.get('assignedTo') as string
  const assignedTo = assignedToStr ? parseInt(assignedToStr) : null
  
  // Ловим дедлайн и приоритет
  const deadlineStr = formData.get('deadline') as string
  const deadline = deadlineStr ? new Date(deadlineStr) : null
  const priority = (formData.get('priority') as string) || 'medium'

  const file = formData.get('file') as File | null
  
  // Явно указываем типы для TypeScript, чтобы не было ошибки
  let fileName: string | null = null
  let fileData: string | null = null
  let fileType: string | null = null

  // ПРЕВРАЩАЕМ ФАЙЛ В СТРОКУ ДЛЯ БД
  if (file && file.size > 0) {
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      fileData = `data:${file.type};base64,${buffer.toString('base64')}`
      fileName = file.name
      fileType = file.type
    } catch (fsError) {
      console.error("Ошибка кодирования файла:", fsError);
    }
  }

  try {
    const newDoc = await prisma.document.create({
      data: { 
        title, taskDescription, assignedTo, statusId: 1, userId: parseInt(authorIdString),
        fileName, fileData, fileType, deadline, priority
      }
    })

    // ЛОГИРОВАНИЕ
    await logAction(parseInt(authorIdString), 'Создание документа', { documentId: newDoc.id, title, assignedTo, priority })

  } catch (dbError) { 
    console.error("Ошибка базы данных:", dbError);
  }

  const roleId = cookieStore.get('roleId')?.value;
  if (roleId === '1') {
    revalidatePath('/')
    redirect('/?section=documents')
  } else {
    revalidatePath('/dashboard')
    if (assignedTo && assignedTo !== parseInt(authorIdString)) {
      redirect('/dashboard?section=documents&tab=sent')
    } else {
      redirect('/dashboard?section=documents')
    }
  }
}

export async function updateDocumentStatus(formData: FormData) {
  const id = parseInt(formData.get('id') as string)
  const statusId = parseInt(formData.get('statusId') as string)
  if (!id || !statusId) return

  const updateData: any = { statusId };
  if (statusId === 4) {
    updateData.completedAt = new Date();
  } else {
    updateData.completedAt = null;
  }

  try { 
    await prisma.document.update({ where: { id }, data: updateData }) 

    // ЛОГИРОВАНИЕ
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('userId')?.value
    await logAction(currentUserId ? parseInt(currentUserId) : null, 'Изменение статуса документа', { documentId: id, newStatusId: statusId })

  } catch (error) { console.error(error) }
  revalidatePath('/dashboard')
}

export async function submitDocumentResult(formData: FormData) {
  const id = parseInt(formData.get('id') as string)
  if (!id) return

  const resultText = formData.get('resultText') as string || null
  const file = formData.get('file') as File | null
  
  // Явно указываем типы для TypeScript
  let resultFileName: string | null = null
  let resultFileData: string | null = null
  let resultFileType: string | null = null

  if (file && file.size > 0) {
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      resultFileData = `data:${file.type};base64,${buffer.toString('base64')}`
      resultFileName = file.name
      resultFileType = file.type
    } catch (fsError) {
      console.error("Ошибка кодирования файла результата:", fsError);
    }
  }

  try { 
    await prisma.document.update({ 
      where: { id }, 
      data: { 
        statusId: 3, 
        resultText, 
        resultFileName, 
        resultFileData,
        resultFileType
      } 
    }) 

    // ЛОГИРОВАНИЕ
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('userId')?.value
    await logAction(currentUserId ? parseInt(currentUserId) : null, 'Сдача результата по документу', { documentId: id, hasFile: !!file })

  } catch (error) { console.error(error) }
  
  revalidatePath('/')
  revalidatePath('/dashboard')
}

export async function deleteDocument(formData: FormData) {
  const cookieStore = await cookies()
  const roleId = cookieStore.get('roleId')?.value
  if (roleId !== '1' && roleId !== '4') return

  const id = parseInt(formData.get('id') as string)
  if (!id) return

  try {
    const docToDelete = await prisma.document.findUnique({ where: { id } })
    await prisma.document.delete({ where: { id } })

    // ЛОГИРОВАНИЕ
    await logAction(cookieStore.get('userId') ? parseInt(cookieStore.get('userId')!.value) : null, 'Удаление документа', { documentId: id, title: docToDelete?.title })

  } catch (error) {
    console.error(error)
  }

  revalidatePath('/')
  revalidatePath('/dashboard')
}

// === ФУНКЦИИ АВТОРИЗАЦИИ ===
export async function loginUser(formData: FormData) {
  const login = formData.get('login') as string
  const password = formData.get('password') as string
  const reg = await prisma.registration.findUnique({ where: { login }, include: { user: true } })
  
  if (!reg) redirect('/login?error=1')
  if (reg.isBlocked) redirect('/login?error=blocked') // Защита от заблокированных
  if (reg.password !== password) redirect('/login?error=1')

  const cookieStore = await cookies()
  cookieStore.set('userId', reg.userId.toString(), { maxAge: 60 * 60 * 24 })
  cookieStore.set('roleId', reg.user.roleId.toString(), { maxAge: 60 * 60 * 24 })

  // ЛОГИРОВАНИЕ
  await logAction(reg.userId, 'Вход в систему')

  if (reg.user.roleId === 1) redirect('/?section=documents')
  else redirect('/dashboard')
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('userId')
  cookieStore.delete('roleId')
  redirect('/login')
}

export async function requestPasswordReset(formData: FormData) {
  const login = formData.get('login') as string
  if (!login) redirect('/login?reset=true&error=1')

  const reg = await prisma.registration.findUnique({ where: { login } })

  try {
    await prisma.passwordResetRequest.create({
      data: {
        login,
        userId: reg?.userId || null,
        status: 'PENDING'
      }
    })

    await logAction(reg?.userId || null, 'Запрос на сброс пароля', { login })

  } catch (error) {
    console.error("Ошибка запроса сброса пароля:", error)
    redirect('/login?reset=true&error=db_error')
  }

  redirect('/login?success=reset')
}

export async function resolvePasswordReset(formData: FormData) {
  const cookieStore = await cookies()
  if (cookieStore.get('roleId')?.value !== '1') return

  const requestId = parseInt(formData.get('requestId') as string)
  if (!requestId) return

  try {
    await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: { status: 'RESOLVED' }
    })

    await logAction(parseInt(cookieStore.get('userId')!.value), 'Обработка запроса на сброс пароля', { requestId })

  } catch (error) {
    console.error("Ошибка при разрешении запроса:", error)
  }

  revalidatePath('/')
}