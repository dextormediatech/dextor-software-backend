import { v2 as cloudinary } from "cloudinary";

const configureCloudinary = () => {
  const rawUrl = process.env.CLOUDINARY_URL?.trim();
  if (!rawUrl) return false;

  // Support both "cloudinary://key:secret@cloud" and "cloudinary:key:secret@cloud"
  const normalized = rawUrl.replace(/^cloudinary:(\/\/)?/, "");
  const match = normalized.match(/^([^:]+):([^@]+)@(.+)$/);

  if (!match) {
    cloudinary.config({ secure: true });
    return true;
  }

  const [, api_key, api_secret, cloud_name] = match;
  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
  return true;
};

export const uploadClientLogo = async (logoInput) => {
  if (!logoInput || typeof logoInput !== "string") return undefined;

  const trimmed = logoInput.trim();
  if (!trimmed) return undefined;

  // Already a hosted URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const configured = configureCloudinary();
  if (!configured) {
    throw new Error("CLOUDINARY_URL is not configured on the server");
  }

  const result = await cloudinary.uploader.upload(trimmed, {
    folder: "dextor_mediatech/clients",
    resource_type: "image",
    transformation: [{ width: 400, height: 400, crop: "limit", quality: "auto" }],
  });

  return result.secure_url;
};
