import { Request, Response } from "express";
import { viewAdminFileByIdService } from "../service/fileService";

export const viewFileAdmin = async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const idParams = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!idParams || idParams === "undefined" || idParams === "null") {
    return res.status(400).json({ message: "A valid file id is required" });
  }

  try {
    const data = await viewAdminFileByIdService(idParams);
    if (!data) {
      return res.status(404).json({ message: "Not Found" });
    }
    return res.status(200).json({ ...data });

  } catch (error) {
    return res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};
