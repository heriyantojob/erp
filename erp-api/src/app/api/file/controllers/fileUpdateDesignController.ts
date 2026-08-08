import { Response, Request, NextFunction } from "express";
export async function updateFileDesign(req: Request, res: Response, next: NextFunction) {  // Changed from addFileTemplate
    const { id: idParams } = req.params;
    
    return res.status(400).json({
        message:idParams,
        body:req.body,
    });
}