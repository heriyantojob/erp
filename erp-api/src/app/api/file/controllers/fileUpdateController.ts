import { Response, Request, NextFunction } from "express";
import { updateFileService } from "../service/fileService";

export async function updateFile(req: Request, res: Response, next: NextFunction) {
  const { id: idParams } = req.params;
  try {
    await updateFileService(idParams as string, req.body);
    return res.status(200).json({ message: "success update user" });
  } catch (e) {
    return res.status(500).json({ message: "update failed" });
  }
}

