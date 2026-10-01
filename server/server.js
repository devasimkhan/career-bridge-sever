import express from "express"
import dotenv from "dotenv"
dotenv.config()
import colors from "colors"
import connectDB from "./config/dbConfig.js"
import authRoutes from "./routes/authRoutes.js"
import errorHandler from "./middleware/errorhandler.js"
import adminRoutes from "./routes/adminRoutes.js"
import counselorRoutes from "./routes/counselorRoutes.js"
import ratingRoutes from "./routes/ratingRoutes.js"
import creditsRoutes from "./routes/creditsRoutes.js"
import roadmapRoutes from "./routes/roadmapRoutes.js"
import messageRoutes from "./routes/messageRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
import http from "http"
import { Server } from "socket.io"
import { chatHandler } from "./socket/chatHandel.js"
import socketAuthMiddleware from "./socket/socketAuth.js"
const PORT = process.env.PORT || 3000

const app = express()
const server = http.createServer(app)
connectDB()

const io = new Server(server, {
   cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
   }
})

io.use(socketAuthMiddleware)

// controllers (message delete realtime notify) ke liye io available rakho
app.set("io", io)

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userID}`)
    chatHandler(io, socket)
})

app.use(express.json())
app.use(express.urlencoded())


app.get("/" , (req , res) => {
    res.status(200).json({
        message : "WELCOME TO NEXT-STEP API's "
    })
})
// Auth Routes
app.use("/api/auth" , authRoutes)

// admin Routes
app.use("/api/admin/" , adminRoutes)
//  Counselor Routes

app.use("/api" , counselorRoutes)

//  rating router 

app.use("/api/rating" , ratingRoutes)

//  credits router 
app.use("/api/credits" , creditsRoutes)
//  road map routes
app.use("/api/ai" , roadmapRoutes)

//  messages routes
app.use("/api/messages" , messageRoutes)

//  user dashboard (StudentDashboard at /auth/profile)
app.use("/api/user" , dashboardRoutes)
// alias so /api/dashboard also works
app.use("/api" , dashboardRoutes)

// error handler
app.use(errorHandler)
server.listen(PORT , () => console.log(`SERVER RUNNING AT PORT ,${PORT}`.bgBlue) )





