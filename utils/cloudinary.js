import { v2 as cloudinary } from "cloudinary";

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

export const uploadImage = (file) =>
  new Promise((resolve, reject) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    cloudinary.uploader
      .upload_stream({ folder: "liverr", resource_type: "image" }, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error("Cloudinary did not return a secure image URL."));
          return;
        }
        resolve(result.secure_url);
      })
      .end(file.buffer);
  });
