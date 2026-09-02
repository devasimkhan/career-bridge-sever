import { GoogleGenAI } from "@google/genai";
import User from "../models/userModels.js";
import Career from "../models/careerModel.js";
import Category from "../models/categoryModel.js";
import Rating from "../models/ratingModel.js";
import Credit from "../models/creditsModel.js";
import Counselor from "../models/counselorModel.js";
import Roadmap from "../models/roadmapModel.js";

export const generateRoadmap = async (req, res) => {
  try {
    const ai = new GoogleGenAI({});

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404);
      throw new Error("User Not Found");
    }

    if (user.credits < 1) {
      res.status(401);
      throw new Error("Inssufficeint Credits!");
    }

    let userUpdated = await User.findByIdAndUpdate(
      user._id,
      { credits: user.credits - 1 },
      { new: true },
    );

    const { name, email, qualification, location } = user;
    const { interest, skill_level, budget, learning_mode , additional_info } = req.body;

    if (!interest || !skill_level || !budget || !learning_mode) {
      res.status(409);
      throw new Error("Please Fill All Details");
    }

    const SYSTEM_PROMPT = `You are "CareerPath AI," a career guidance assistant specialized in the Indian subcontinent 
(India, Pakistan, Bangladesh, Nepal, Sri Lanka) education and job market.

## INPUT
You will receive the following details about a student:
- Name
- Email
- Qualification (current education level, e.g., "Class 10 passed", "B.Tech in CS", "12th with PCM")
- Interest (career field, subject, or industry they're curious about)

If any of these four fields is missing or unclear, ask a brief clarifying question before proceeding. 
Do not fabricate missing information.

HERE IS MY DETAILS : 
 name : ${name},
 email : ${email} ,
 qualification :${qualification} ,
 location : ${location}
 interest : ${interest} ,
 skills_level : ${skill_level} ,
 budget : ${budget} ,
 learning_mode : ${learning_mode} ,
 additional_info : ${additional_info}
            

## YOUR TASK
Generate a personalized, step-by-step career roadmap that is realistic, actionable, and specific 
to opportunities available in the Indian subcontinent.

## OUTPUT FORMAT
Address the student by name. Structure your response with clear headers and bullet points as follows:

### 🎯 Career Snapshot
1-2 lines summarizing the suggested career direction based on their qualification + interest.

### 🛣️ Step-by-Step Roadmap
Break into sequential phases (e.g., Phase 1: Foundation, Phase 2: Specialization, Phase 3: 
Entry-Level, Phase 4: Growth). For each phase include:
- **Timeline** (e.g., "Next 6 months", "Year 1-2")
- **What to do** (courses, skills, projects)
- **Relevant exams/entrance tests** — mention only if directly relevant to their qualification 
  and interest (e.g., JEE/NEET/CUET/CAT/UPSC/state-specific exams). Do not force irrelevant exams.
- **Certifications/resources** (free or low-cost where possible: NPTEL, SWAYAM, Coursera, YouTube, etc.)

### 📜 Certifications & Skills Checklist
A short bullet list of key skills/certifications to acquire along the way.

### 💼 Career Outcomes
2-3 example job roles or paths this roadmap leads to, with a realistic sense of scope in the 
regional job market.

### 📌 Quick Tip
One practical, encouraging tip to keep momentum.

## TONE & STYLE
- Simple, encouraging, and practical — avoid jargon unless explained.
- Prioritize affordable/accessible resources relevant to Indian subcontinent students 
  (government schemes, scholarships, local coaching options, online free courses).
- Keep steps realistic given typical constraints (cost, access, competitive exams).
- Do not guarantee specific outcomes (jobs, salaries, admissions) — phrase as guidance, not promises.
- Keep the total response focused and skimmable — no unnecessary filler.

## GUARDRAILS
- Do not provide legal, immigration, or financial investment advice.
- Do not recommend specific paid coaching institutes or colleges by name unless widely 
  recognized as standard/public (e.g., IITs, NITs, AIIMS) — favor generic guidance.
- If the interest and qualification seem mismatched (e.g., interest in medicine but no science 
  background), gently point this out and suggest bridge steps rather than ignoring the gap.
  `;
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: SYSTEM_PROMPT,
    });
    let data = interaction.output_text;
    
    const roadmap = await Roadmap.create({
      text :data ,
      user : user._id
    })
    
    
    res.status(200).json({
      message: "Roadmap Generated",
      roadmap: roadmap,
      credits : userUpdated.credits
    });
  } catch (error) {
    res.status(409);
    throw new Error(error.message);
  }
};

export const getMyRoadmap = async(req, res) => {

const user = await User.findById(req.user)

if(!user){
  res.status(404)
  throw new Error("User is Not Found ");
  
}

const roadmap = await Roadmap.find({user : user._id})

if(!roadmap){
  res.status(404)
  throw new Error("NO Roadmap Found");
  
}
res.status(200).json(roadmap)

}
export const AdminAiChat = async (req, res) => {
  const { question } = req.body;
  if (!question) {
    res.status(409);
    throw new Error("Question is Not Found");
  }

  try {
    const users = await User.find();
    const careers = await Career.find();
    const categories = await Category.find();
    const ratings = await Rating.find();
    const credits = await Credit.find();
    const counselors = await Counselor.find();

    const dataset = [users, careers, categories, ratings, credits, counselors];

    const SYSTEM_PROMPT = `You are  smart ai assistant which replies to my question about given data else you respond with no data available . here is data set you need to answer according to that : ${dataset}  here is my question : ${question}`;

    const ai = new GoogleGenAI({});
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: SYSTEM_PROMPT,
    });
    let data = interaction.output_text;

    res.status(200).json({
      message: "Response Arrived",
      answer: data,
    });
  } catch (error) {
    console.log(error);
    res.status(409);
    throw new Error("Unable To Generate Response");
  }
};
