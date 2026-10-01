import User from "../models/userModels.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import uploadToCloudinary from "../middleware/cloudinaryMiddleware.js";

const registerUser = async (req, res) => {
  const { name, email, phone, password, qualification, location  } = req.body;

  if (!name || !email || !phone || !password || !qualification || !location) {
    res.status(409);
    throw new Error("Please Enter All Details....");
  }

  if (phone.length !== 10) {
    res.status(409);
    throw new Error("Please Enter Valid Number");
  }


  let emailExit = await User.findOne({ email: email });
  let phoneExit = await User.findOne({ phone: phone });

  if (emailExit || phoneExit) {
    res.status(409);
    throw new Error("User All Ready Register");
  }



  const salt = bcrypt.genSaltSync(10);
const hashedPassword = bcrypt.hashSync( password, salt);

  if (!req.file) {
    res.status(409);
    throw new Error("Please upload a profile photo");
  }

let uploadResult = await uploadToCloudinary(req.file.path)
  const user = await User.create({
    name , email , phone , password: hashedPassword , qualification , location , profilePic : uploadResult.secure_url
  })
  if(!user){
    res.status(409)
    throw new Error("User Is Not Created..");
    
  }
  res.status(201).json({
    _id : user._id ,
    name : user.name ,
    email : user.email ,
    phone : user.phone ,
    qualification :user.qualification ,
    location : user.location ,
    userType : user.userType ,
    isActive : user.isActive ,
    credits : user.credits ,
    userSince : user.createdAt ,
    profilePic : user.profilePic ,
    token : generateToken(user._id) ,

  })



};
const loginUser = async (req, res) => {

const {email , password} = req.body
 
if(!email || !password) {
  res.status(409)
   throw new Error("Please fill all details");
   
}

const user = await User.findOne({email:email})
 
if(!user.isActive)
{
  res.status(401)
  throw new Error("Your account has been suspend contact Admin");
  
}


if(user && bcrypt.compareSync(password, user.password) ){
  res.status(200)
    res.status(201).json({
    _id : user._id ,
    name : user.name ,
    email : user.email ,
    phone : user.phone ,
    qualification :user.qualification ,
    location : user.location ,
    userType : user.userType ,
    isActive : user.isActive ,
    credits : user.credits ,
    userSince : user.createdAt ,
    profilePic : user.profilePic ,
    token : generateToken(user._id)
  })
}
else {
  res.status(401)
  throw new Error("Invalid Credentials!")
}
};

const generateToken = (id) => {
  return jwt.sign({id} , process.env.JWT_SECRET , {expiresIn : '30d'})
}


const privateController = async(req, res) => {

  res.json({
    message : `Request made by : ${req.user.name}`
  })
} 

const authControllers = {
  registerUser,
  loginUser , 
  privateController
};

export default authControllers;
