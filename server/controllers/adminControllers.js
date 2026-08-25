import Career from "../models/careerModel.js";
import Category from "../models/categoryModel.js";
import Counselor from "../models/counselorModel.js";
import Credit from "../models/creditsModel.js";
import Roadmap from "../models/roadmapModel.js";
import User from "../models/userModels.js";

const getAllUser = async (req, res) => {
  const allUsers = await User.find();

  if (!allUsers) {
    res.status(404);
    throw new Error("User is not Found");
  }

  res.status(200).json(allUsers);
};

const createCategory = async (req, res) => {
  const { title } = req.body;
  if (!title) {
    res.status(409);
    throw new Error("Please Enter Category Title");
  }

  const category = await Category.create({ title: title });

  if (!category) {
    res.status(409);
    throw new Error("Category Not Created! ");
  }
  res.status(201).json(category);
};

const getAllCategory = async (req, res) => {
  const allCategory = await Category.find();

  if (!allCategory) {
    res.status(404);
    throw new Error("Category is Not Found");
  }
  res.status(200).json(allCategory);
};

const createCareer = async (req, res) => {
  const { title, description, requiredQualification, duration, salary } =
    req.body;

  if (
    !title ||
    !description ||
    !requiredQualification ||
    !duration ||
    !salary
  ) {
    res.status(409);
    throw new Error("Please Enter All Details!");
  }
  const categoryId = req.params.cid;

  const career = await Career.create({
    category: categoryId,
    title,
    description,
    requiredQualification,
    salary,
    duration,
  });
  if (!career) {
    res.status(409);
    throw new Error("Career Not Create");
  }

  res.status(201).json(career);
};

const getAllCareer = async (req, res) => {
  const allCareers = await Career.find().populate("category");
  if (!allCareers) {
    res.status(404);
    throw new Error("Career Not Found");
  }
  res.status(200).json(allCareers);
};

const getCareerByCategoryId = async (req, res) => {
  // const { cid } = req.params;
  const categoryId = req.params.cid;

  const careers = await Career.find({
    category: categoryId,
  });

  if (careers.length === 0) {
    res.status(404);
    throw new Error("No Career Found");
  }

  res.status(200).json(careers);
};

const getAllCounselor = async (req, res) => {
  const allCounselor = await Counselor.find()
    .populate("user")
    .populate("category");
  if (!allCounselor) {
    res.status(404);
    throw new Error("Counselor Not found");
  }
  res.status(200).json(allCounselor);
};

// const UpdateCounselor = async (req, res) => {
//   let counselorId = req.params.cnid;
//   const counselor = await Counselor.findById(counselorId);
//   if (!counselor) {
//     res.status(409);
//     throw new Error("Counselor Not Found");
//   }

//   const UpdatedCounselor = await Counselor.findByIdAndUpdate(
//     counselor._id,
//     req.body,
//     { new: true },
//   )
//     .populate("user")
//     .populate("category");

//   if (req.body.status === "accepted") {
//     const updateUser = await User.findByIdAndUpdate(
//       counselor.user,
//       { userType: "COUNSELOR" },
//       { new: true },  
//     );
//   }
//   res.status(200).json(UpdatedCounselor);
// };

const updateCounselor = async (req, res) => {

    const counselor = await Counselor.findById(req.params.cnid)

    if (!counselor) {
        res.status(404)
        throw new Error('Counselor Not Found')
    }

    const updatedCounselor = await Counselor.findByIdAndUpdate(counselor._id, req.body, { new: true }).populate('user').populate('category')

    if (req.body.status === "accepted") {
        const updatedUser = await User.findByIdAndUpdate(counselor.user, { userType: "COUNSELOR" }, { new: true })
    }

    if (!updatedCounselor) {
        res.status(409)
        throw new Error("Counselor not updated")
    }

    res.status(200).json(updatedCounselor)

}


const getAllCreditsRequest = async (req, res) => {
  const creditRequest = await Credit.find().populate("user");
  if (!creditRequest) {
    res.status(404);
    throw new Error("Credit Request Not Found");
  }

  res.status(200).json(creditRequest);
};

const updatedCreditRequest = async (req, res) => {
  const { status } = req.body;

  if (!status) {
    res.status(409);
    throw new Error("Please Enter Status");
  }

  const creditRequest = await Credit.findById(req.params.rid);

  if (!creditRequest) {
    res.status(404);
    throw new Error("Request Not Found");
  }

  const user = await User.findById(creditRequest.user);

  if (!user) {
    res.status(404);
    throw new Error("User Not Found");
  }

  const updatedCreditRequest = await Credit.findByIdAndUpdate(
    creditRequest._id,
    { status },
    { new: true },
  );
  res.status(200).json(updatedCreditRequest);
};

const getAllRoadsMap = async (req, res) => {
  const roadmaps = await Roadmap.find().populate("user");

  if (!roadmaps) {
    res.status(404);
    throw new Error("Roadmap Not Found");
  }

  res.status(200).json(roadmaps);
};


const updateUser = async(req ,res) => {

const userId = req.params.uid

const user = await User.findById(userId) 

if(!user) {
  res.status(404)
  throw new Error("user Is Not Found")
}

const updatedUser = await User.findByIdAndUpdate(user._id , {isActive : !user.isActive} , {new  : true})

if(!updatedUser){
  res.status(409)
  throw new Error("User Not Updated ");
  
}
res.status(200).json(updatedUser)
 


}



const adminControllers = {
  getAllUser,
  createCategory,
  getAllCategory,
  createCareer,
  getAllCareer,
  getCareerByCategoryId,
  getAllCounselor,
  updateCounselor,
  getAllCreditsRequest,
  updatedCreditRequest,
  getAllRoadsMap,
  updateUser
};

export default adminControllers;
