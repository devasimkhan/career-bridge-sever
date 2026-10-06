// // import multer from "multer"

// // const storage = multer.diskStorage({
// //   destination: (req, file, cb) => {
// //     cb(null, 'uploads')
// //   },
// //   filename: (req, file, cb) => {

// //     const fileName = crypto.randomUUID() + "." + file.originalname.split(".")[1]
// //     cb(null, fileName)
// //   }
// // })

// // const upload = multer({ storage: storage })

// // export default upload
// import multer from "multer";

// const storage = multer.memoryStorage();

// const upload = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024
//   }
// });

// export default upload;

import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});



export default upload;