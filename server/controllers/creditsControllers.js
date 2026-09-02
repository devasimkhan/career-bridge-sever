import Credit from "../models/creditsModel.js";

//  create Credits Request or create request user karega
const requestCredits = async (req, res) => {
  let userId = req.user.id;

  const { credits } = req.body;

  if (!credits) {
    res.status(409);
    throw new Error("Please Enter Required Details!");
  }

  const credit = new Credit({
    user: userId,
    credits,
    status: "pending",
  });

  await credit.save();
  await credit.populate("user");

  if (!credit) {
    res.status(409);
    throw new Error("Please Add Credit Amount");
  }
  res.status(201).json(credit);
};

//  puri credits user Dekh sakta hai

const getAllCreditRequestHistory = async (req, res) => {
  const allCreditsRequests = await Credit.findOne({
    user: req.user.id,
  }).populate("user");

  if (!allCreditsRequests) {
    res.status(404);
    throw new Error("Not Credits Here");
  }
  res.status(200).json(allCreditsRequests);
};

const getSingleCreditRequestHistory = async (req, res) => {
  const singleRequestCreditHistory = await Credit.findById(
    req.params.rid,
  ).populate("user");
  if (!singleRequestCreditHistory) {
    res.status(404);
    throw new Error("No Credits Request Here");
  }

  res.status(200).json(singleRequestCreditHistory);
};

const creditsControllers = {
  requestCredits,
  getAllCreditRequestHistory,
  getSingleCreditRequestHistory,
};

export default creditsControllers;
