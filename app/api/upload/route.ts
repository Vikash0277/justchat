import { NextResponse } from 'next/server';
import cloudinary from 'cloudinary';
import type { NextRequest } from 'next/server';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to delete a resource after a delay
function scheduleDeletion(publicId: string, delayMs: number) {
  setTimeout(async () => {
    try {
      await cloudinary.v2.uploader.destroy(publicId, { resource_type: 'auto' });
      console.log(`Deleted Cloudinary asset ${publicId} after ${delayMs}ms`);
    } catch (err) {
      console.error('Error deleting Cloudinary asset:', err);
    }
  }, delayMs);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Upload to Cloudinary
    const result = await cloudinary.v2.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
      // This callback will be overridden below
    });
    // Using upload_stream with promise wrapper
    const uploadPromise = new Promise<any>((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      stream.end(buffer);
    });
    const uploadResult = await uploadPromise;
    // Schedule deletion after 10 minutes (600,000 ms)
    scheduleDeletion(uploadResult.public_id, 10 * 60 * 1000);
    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      type: uploadResult.resource_type,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
