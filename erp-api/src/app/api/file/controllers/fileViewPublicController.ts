import { Request, Response } from "express";
import { viewPublicFileBySlugService } from "../service/fileService";

export const viewFilePublic = async (req: Request, res: Response) => {
  const rawSlug = req.params.slug;
  const slugParam = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  if (!slugParam) {
    return res.status(400).json({ message: "Slug is required" });
  }

  try {
    const data = await viewPublicFileBySlugService(slugParam);
    if (!data) {
      return res.status(404).json({ message: "Not Found" });
    }
    return res.status(200).json({ ...data });

    // Process the resulting data
    
 
    
  
  } catch (error) {
   
    return res.status(500).json({ message: "Internal server error. Please try again later." });
  }
};
