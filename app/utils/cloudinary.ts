import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  console.warn(
    "Cloudinary environment variables are missing. Using local filesystem fallback for uploads."
  );
}

export const uploadMedia = async (
  fileBuffer: Buffer,
  resourceType: "image" | "video",
  mimeType: string
): Promise<{ url: string; publicId: string }> => {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: resourceType,
            folder: "justchat",
          },
          (error, result) => {
            if (error) reject(error);
            else {
              resolve({
                url: result!.secure_url,
                publicId: result!.public_id,
              });
            }
          }
        )
        .end(fileBuffer);
    });
  } else {
    // Local filesystem fallback
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = mimeType.split("/")[1] || (resourceType === "video" ? "mp4" : "jpg");
    const filename = `${uuidv4()}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, fileBuffer);

    return {
      url: `/uploads/${filename}`,
      publicId: `local_${filename}`,
    };
  }
};

export const deleteMedia = async (
  publicId: string,
  resourceType: "image" | "video"
): Promise<boolean> => {
  if (isCloudinaryConfigured && !publicId.startsWith("local_")) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });
      return result.result === "ok";
    } catch (error) {
      console.error("Failed to delete media from Cloudinary:", error);
      return false;
    }
  } else {
    // Local fallback deletion
    try {
      const filename = publicId.replace("local_", "");
      const filePath = path.join(process.cwd(), "public", "uploads", filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Locally stored mock file deleted: ${filename}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to delete local mock file:", error);
      return false;
    }
  }
};
