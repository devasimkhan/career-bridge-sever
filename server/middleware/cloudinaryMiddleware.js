// import { v2 as cloudinary } from 'cloudinary'
// import fs from "node:fs"
// import dotenv from 'dotenv'
// dotenv.config()


// cloudinary.config({
//   cloud_name :"hjs8nuxn" ,
//     api_key : process.env.CLOUDINARY_API_KEY ,
//     api_secret : process.env.CLOUDINARY_API_SECRET
// })

//  // Profile photo upload — sharp square face-crop (512px) + auto quality,
//  // taaki har jagah (Navbar, chat, cards) bina blur ke dikhe
//  const uploadToCloudinary = async(fileLink)=>{

//  try {
//    const uploadResult = await cloudinary.uploader.upload(
//      fileLink , {
//          resource_type : "image" ,
//          folder : "careerbridge/profiles" ,
//          transformation : [
//            { width : 512 , height : 512 , crop : "fill" , gravity : "face" } ,
//            { quality : "auto" , fetch_format : "auto" }
//          ]
//      }
//    )
//    return uploadResult
//  } catch (error) {
//    console.log(error)
//    throw new Error("Image upload failed. Please try again.")
//  } finally {
//    // Temp file hamesha saaf karo (success ho ya fail)
//    if (fileLink && fs.existsSync(fileLink)) fs.unlinkSync(fileLink)
//  }

//  } 


//  export default uploadToCloudinary
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: "hjs8nuxn",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "careerbridge/profiles",
        transformation: [
          {
            width: 512,
            height: 512,
            crop: "fill",
            gravity: "face"
          },
          {
            quality: "auto",
            fetch_format: "auto"
          }
        ]
      },
      (error, result) => {
        if (error) {
          console.log("Cloudinary Error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export default uploadToCloudinary;