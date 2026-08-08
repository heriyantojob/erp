import { s3GetFile } from '@/lib/storage/s3GetFile';
import slugify from 'slug';
import { fileRepository } from '../repositories/file.repository';
import { CustomError } from '@/lib/custom-error';
import logger from '@/utils/logger';

export interface FileAttachment {
  id: string;
  fileName?: string;
  filePath: string;
  fileExt?: string;
  fileMime?: string;
  fileList?: any;
  fileSize?: number;
  fileWidth?: number;
  fileHeight?: number;
  inPreview: boolean | number;
  inDownload: boolean | number;
  isAdditionalFile?: boolean | number;
  idFile: string;
  createdAt?: Date | string | null;
  updatedAt: string | null;
  deletedAt?: Date | null;
  fileUrl?: string | null;
}

function getUpdatedAt(value: string | null): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
  } catch {
    return null;
  }
}

export async function getFileAttachmentsPreviewDownload(
  idFile: string,
  inPreview: number,
  inDownload: number
): Promise<FileAttachment[] | null> {
  try {
    const attachments = (await fileRepository.attachmentsByFile(
      idFile,
      inPreview,
      inDownload
    )) as FileAttachment[];

    for (const attachment of attachments) {
      try {
        const fileUrl = await s3GetFile(attachment.filePath || '');
        const updateAt = getUpdatedAt(attachment.updatedAt);
        attachment.fileUrl = updateAt ? `${fileUrl}?v=${updateAt}` : fileUrl;
      } catch {
        attachment.fileUrl = attachment.filePath;
      }
    }
    return attachments;
  } catch (error) {
    return null;
  }
}

export async function getFileAttachmentsAll(
  idFile: string,

): Promise<FileAttachment[] | null> {
  try {
    const attachments = (await fileRepository.attachmentsByFileAll(
      idFile,
    
    )) as FileAttachment[];

    for (const attachment of attachments) {
      try {
        const fileUrl = await s3GetFile(attachment.filePath || '');
        const updateAt = getUpdatedAt(attachment.updatedAt);
        attachment.fileUrl = updateAt ? `${fileUrl}?v=${updateAt}` : fileUrl;
      } catch {
        attachment.fileUrl = attachment.filePath;
      }
    }
    return attachments;
  } catch (error) {
    return null;
  }
}

export async function listPublicFilesService(params: {
  page: number;
  perPage: number;
  q?: string;
  type?: string;
  moduleType?: string|null;
}) {
  const total = await fileRepository.countPublic({
    q: params.q,
    type: params.type,
    moduleType: params.moduleType,
  });
  const items = await fileRepository.findPublic({
    page: params.page,
    perPage: params.perPage,
    q: params.q,
    type: params.type,
    moduleType: params.moduleType,
  } as any);
  for (let i = 0; i < items.length; i++) {
    try {
      const item = items[i];
      items[i].fileAttachments  = await getFileAttachmentsAll(item.id);
      // items[i].filePreview = await getFileAttachmentsPreviewDownload(item?.id, 1, 0);
      // items[i].fileDownload = await getFileAttachmentsPreviewDownload(item?.id, 0, 1);
    } catch {}
  }
  return { items, total, totalPages: Math.ceil(total / params.perPage) };
}

export async function listPrivateFilesService(params: {
  userId: string;
  page: number;
  perPage: number;
  q?: string;
  type?: string;
  moduleType?: string|null;
}) {
  const total = await fileRepository.countPrivate({
    userId: params.userId,
    q: params.q,
    type: params.type,
    moduleType: params.moduleType,
  });
  const items = await fileRepository.findPrivate({
    userId: params.userId,
    page: params.page,
    perPage: params.perPage,
    q: params.q,
    type: params.type,
    moduleType: params.moduleType,
  });
  for (let i = 0; i < items.length; i++) {
    try {
      const item = items[i];
         items[i].fileAttachments  = await getFileAttachmentsAll(item.id);
      // items[i].filePreview = await getFileAttachmentsPreviewDownload(item?.id, 1, 0);
      // items[i].fileDownload = await getFileAttachmentsPreviewDownload(item?.id, 0, 1);
    } catch {}
  }
  return { items, total, totalPages: Math.ceil(total / params.perPage) };
}

export async function listAdminFilesService(params: {
  page: number;
  perPage: number;
  q?: string;
  type?: string;
  // 0 = draft, 1 = publish, 2 = review, 3 = reject. Omit = all statuses
  status?: number|null;
  moduleType?: string|null;
}) {
  const total = await fileRepository.countAdmin({
    q: params.q,
    type: params.type,
    status: params.status,
    moduleType: params.moduleType,
  });
  const items = await fileRepository.findAdmin({
    page: params.page,
    perPage: params.perPage,
    q: params.q,
    type: params.type,
    status: params.status,
    moduleType: params.moduleType,
  });
  for (let i = 0; i < items.length; i++) {
    try {
      const item = items[i];
      items[i].filePreview = await getFileAttachmentsPreviewDownload(item?.id, 1, 0);
      items[i].fileDownload = await getFileAttachmentsPreviewDownload(item?.id, 0, 1);
    } catch {}
  }
  return { items, total, totalPages: Math.ceil(total / params.perPage) };
}

export async function viewAdminFileByIdService(id: string) {
  const data = await fileRepository.findByIdAdmin(id);
  if (!data) return null;
  const fileAttachments  = await getFileAttachmentsAll(data.id);
  const filePreview = await getFileAttachmentsPreviewDownload(data.id, 1, 0);
  const fileDownload = await getFileAttachmentsPreviewDownload(data.id, 0, 1);
  return { ...data, fileAttachments };
}

export async function viewPublicFileBySlugService(slug: string) {
  const data = await fileRepository.findBySlugPublic(slug);
  if (!data) return null;
  // const fileAttachments  = await getFileAttachmentsAll(data.id);
  const filePreview = await getFileAttachmentsPreviewDownload(data.id, 1, 0);
  const fileDownload = await getFileAttachmentsPreviewDownload(data.id, 0, 1);
  return { ...data,filePreview, fileDownload };
}

export async function viewPrivateFileByIdService(id: string, userId: string) {
  const data = await fileRepository.findByIdForUser(id, userId);
  if (!data) return null;
  const filePreview = await getFileAttachmentsPreviewDownload(data.id, 1, 0);
  const fileDownload = await getFileAttachmentsPreviewDownload(data.id, 0, 1);
  return { ...data, filePreview, fileDownload };
}

export async function updateFileService(id: string, body: any) {
  const slugLink = body?.link ? slugify(body.link) : null;
  await fileRepository.updateFileById(id, {
    title: body.title,
    description: body?.description ?? null,
    status: body?.status,
    slug: slugLink,
    tags: body?.tags,
  });
}

export async function deleteFileService(id: string, userId: string) {
  
  const file = await fileRepository.findByIdForUser(id, userId);

  if (!file) {
    throw new CustomError('Not Found', 404);
  }
 

  const attachments = await fileRepository.attachmentsByFileAll(id);

  return { file, attachments };
}


export async function deleteFileAdminService(id: string) {
  
  const file = await fileRepository.findById(id);

  if (!file) {
    throw new CustomError('Not Found', 404);
  }
 

  const attachments = await fileRepository.attachmentsByFileAll(id);

  return { file, attachments };
}


