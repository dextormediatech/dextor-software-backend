import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

const ensureCloudinaryConfig = () => {
  let cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  let api_key = process.env.CLOUDINARY_API_KEY?.trim();
  let api_secret = process.env.CLOUDINARY_API_SECRET?.trim();

  if ((!cloud_name || !api_key || !api_secret) && process.env.CLOUDINARY_URL) {
    const normalized = process.env.CLOUDINARY_URL.trim().replace(/^cloudinary:(\/\/)?/, "");
    const match = normalized.match(/^([^:]+):([^@]+)@(.+)$/);
    if (match) {
      api_key = api_key || match[1];
      api_secret = api_secret || match[2];
      cloud_name = cloud_name || match[3];
    }
  }

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary credentials are not configured in environment");
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
};

export const uploadClientLogo = async (logoInput) => {
  if (!logoInput || typeof logoInput !== "string") {
    return undefined;
  }

  const trimmed = logoInput.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  ensureCloudinaryConfig();

  const result = await cloudinary.uploader.upload(trimmed, {
    folder: "dextor_mediatech/clients",
    resource_type: "image",
    transformation: [
      {
        width: 400,
        height: 400,
        crop: "limit",
        quality: "auto",
      },
    ],
  });

  return result.secure_url;
};

export default cloudinary;
