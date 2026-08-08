import { Request, Response } from 'express';
import s3DeleteMultiple from '@/lib/storage/s3DeleteMultiple';
import { deleteFileAdminService, deleteFileService } from '../service/fileService';
import { fileRepository } from '../repositories/file.repository';
import logger from '@/utils/logger';

export async function deleteFile(req: Request, res: Response) {  // Changed function name
    try {
        // Check authentication and user authorization
        let userAuth = res.locals;
        if (!userAuth?.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
  
        const id = req.params.id as string;
        const userId = userAuth.user.id as string;
 
      
        const { attachments } = await deleteFileService(id, userId);

        const filesDelete: string[] = [];
        for (const attachment of attachments) {
          try { filesDelete.push(attachment.filePath as string); } catch {}
        }
        try {
            await s3DeleteMultiple({ filesDelete }); 
        } catch (error) {
            
        }
        
        await fileRepository.deleteAttachmentsByFile(id);
        await fileRepository.deleteFileById(id);
  
        return res.status(200).json({ message: 'Success Delete' });
    } catch (e) {
        return res.status(500).json({ message: 'Server Error' });
    }
}
export async function deleteFileAdmin(req: Request, res: Response) {  // Changed function name
    try {
        // Check authentication and user authorization
        let userAuth = res.locals;
        if (!userAuth?.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
  
        const id = req.params.id as string;
        const userId = userAuth.user.id as string;
 
      
        const { attachments } = await deleteFileAdminService(id);

        const filesDelete: string[] = [];
        for (const attachment of attachments) {
          try { filesDelete.push(attachment.filePath as string); } catch {}
        }
        try {
            await s3DeleteMultiple({ filesDelete }); 
        } catch (error) {
            
        }
        
        await fileRepository.deleteAttachmentsByFile(id);
        await fileRepository.deleteFileById(id);
  
        return res.status(200).json({ message: 'Success Delete' });
    } catch (e) {
        return res.status(500).json({ message: 'Server Error' });
    }
}

