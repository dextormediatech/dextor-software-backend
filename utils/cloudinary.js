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

export const uploadQuotationPdf = async (pdfBase64, fileName = "quotation", folderName = "dextor_mediatech/quotations") => {
  if (!pdfBase64 || typeof pdfBase64 !== "string") {
    return undefined;
  }

  const trimmed = pdfBase64.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    return { secure_url: trimmed };
  }

  ensureCloudinaryConfig();

  const dataUri = trimmed.startsWith("data:")
    ? trimmed
    : `data:application/pdf;base64,${trimmed}`;

  const safeName = String(fileName)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60);

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: folderName,
    resource_type: "raw",
    public_id: `${safeName}_${Date.now()}.pdf`,
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  };
};

export default cloudinary;
