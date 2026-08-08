import { Request, Response } from 'express';
import { v7 as uuid } from 'uuid';
import slugify from 'slug';
import sharp from 'sharp';
import { tableFiles, tableFileAttachments } from '@/db/table/tableFiles';
import { db } from '@/db/setup';
import s3UploadFile from '@/lib/storage/s3UploadFile';
import s3HeadObjectCommand from '@/lib/storage/s3HeadObjectCommand';
import { normalizeAndValidateTags } from '../utils/tags';
import { fileRepository } from '../repositories/file.repository';
const storagePath = "files/";
function getStorageFolderPath(uid?: string | null) {
  // return uid ? `${storagePath}/${uid}/` : `${storagePath}/`;
  return storagePath;
}



export async function createFileProjectController(req: Request, res: Response) {
  try {
    const auth = res.locals;
    const user = auth?.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const body = req.body || {};
    let tags: string[] = [];
    try {
      tags = normalizeAndValidateTags(body?.tags);
    } catch (e: any) {
      return res.status(400).json({ message: e?.message || 'Invalid tags' });
    }

    const baseFolder = getStorageFolderPath(user.uid);

    const slugLink = body?.slug ? slugify(body.slug) : null;
    if (slugLink) {
      const count = await fileRepository.countBySlug(slugLink);
      if (count > 0) {
        return res.status(400).json({ message: 'The link has been used already.' });
      }
    }

    const idFile = uuid();

    // project json
    const projectID = uuid();
    const projectExt = '.json';
    const projectMime = 'application/json';
    const projectName = `${projectID}${projectExt}`;
    const projectPath = `${baseFolder}${projectName}`;
    const projectBuffer = Buffer.from(JSON.stringify(body?.project ?? {}), 'utf8');

    await s3UploadFile({ fileBuffer: projectBuffer, fileName: projectPath, contentType: projectMime });
    const headProject = await s3HeadObjectCommand({ objectKey: projectPath });
    const fileSizeProject = headProject?.ContentLength ? Number(headProject.ContentLength) : 0;

    // preview jpeg from base64
    const previewID = uuid();
    const previewExt = '.jpeg';
    const previewMime = 'image/jpeg';
    const previewName = `${previewID}${previewExt}`;
    const previewPath = `${baseFolder}${previewName}`;
    const base64 = String(body?.preview || '').replace(/^data:image\/\w+;base64,/, '');
    const base64Buf = Buffer.from(base64, 'base64');
    const previewBuffer = await sharp(base64Buf).resize({ width: 300, fit: 'contain' }).toBuffer();
    const previewMeta = await sharp(previewBuffer).metadata();
    const previewWidth = previewMeta.width || null;
    const previewHeight = previewMeta.height || null;
    await s3UploadFile({ fileBuffer: previewBuffer, fileName: previewPath, contentType: previewMime });
    const headPreview = await s3HeadObjectCommand({ objectKey: previewPath });
    const fileSizePreview = headPreview?.ContentLength ? Number(headPreview.ContentLength) : 0;

    // insert main file
    await db.insert(tableFiles).values({
      id: idFile,
      owner: user.id,
      fileType: 'design',
      moduleType: 'template',
      title: body?.title,
      description: body?.description,
      status: body?.status as any,
      slug: slugLink as any,
      tags: tags as any,
    } as any);

    // attach project (download)
    await db.insert(tableFileAttachments).values({
      id: uuid(),
      idFile: idFile,
      fileName: projectName,
      filePath: projectPath,
      fileExt: projectExt,
      fileSize: fileSizeProject as any,
      fileMime: projectMime,
      inDownload: 1 as any,
      fileQuality: 'Original' as any,
    } as any);

    // attach preview
    await db.insert(tableFileAttachments).values({
      id: uuid(),
      idFile: idFile,
      fileName: previewName,
      filePath: previewPath,
      fileExt: previewExt,
      fileSize: fileSizePreview as any,
      fileMime: previewMime,
      fileHeight: previewHeight as any,
      fileWidth: previewWidth as any,
      inPreview: 1 as any,
      fileQuality: 'SD' as any,
    } as any);

    return res.status(200).json({ message: 'Success Upload', id: idFile });
  } catch (error) {
    return res.status(400).json({ message: 'Failed to upload Project' });
  }
}
