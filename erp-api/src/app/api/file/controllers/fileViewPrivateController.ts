import { Request, Response } from "express";
import { viewPrivateFileByIdService } from "../service/fileService";

export const viewFilePrivate = async (req: Request, res: Response) => {
  const { id: idParams } = req.params; // Assumes the `id` is passed as a URL parameter.
  let userAuth = res.locals;
  const userId = userAuth.user.id;

  if (!userAuth?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const data = await viewPrivateFileByIdService(
      idParams as string,
      userId as string,
    );
    if (!data) {
      return res.status(404).json({ message: "Not Found" });
    }
    return res.status(200).json({ ...data });
  } catch (error) {
    //console.error("Error querying database:", error);
    return res
      .status(500)
      .json({ message: "Internal server error. Please try again later." });
  }
};
