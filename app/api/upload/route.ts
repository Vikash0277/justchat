import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import type { NextRequest } from 'next/server';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to delete a resource after a delay
function scheduleDeletion(publicId: string, delayMs: number) {
  setTimeout(async () => {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
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
    // Convert file to a base64 data URI – Cloudinary can upload this directly
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;
    const uploadResult: any = await cloudinary.uploader.upload(dataUri, { resource_type: 'auto' });
    // Validate response
    if (!uploadResult?.secure_url) {
      console.error('Unexpected Cloudinary response', uploadResult);
      return NextResponse.json({ error: 'Upload failed – invalid Cloudinary response' }, { status: 502 });
    }
    // Schedule deletion after 10 minutes (600,000 ms)
    scheduleDeletion(uploadResult.public_id, 10 * 60 * 1000);
    return NextResponse.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      type: uploadResult.resource_type,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
