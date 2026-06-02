import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/utils/auth";
import { uploadMedia } from "@/utils/cloudinary";

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Limit to 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 10MB size limit" },
        { status: 400 }
      );
    }

    const resourceType = file.type.startsWith("video/") ? "video" : "image";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await uploadMedia(buffer, resourceType, file.type);

    return NextResponse.json({
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      resourceType,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
