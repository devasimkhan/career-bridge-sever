# CareerBridge Backend API (`my-next-step`)

Backend server powering the CareerBridge career guidance and mentorship platform, built with Node.js, Express, MongoDB, Socket.io, and Google Gemini AI.

## 🚀 Features
- **Authentication & Roles:** JWT-based authentication for Students, Counselors, and Admins.
- **AI Career Roadmap Engine:** AI-generated career pathways using Google Gemini.
- **Real-time Chat & Presence:** Socket.io messaging between students and verified counselors.
- **Credit Circulation & Wallet:** Credit request, grant, and deduction system.
- **Admin Management:** Counselor approvals, user directory, category & tag control.

## 📦 Tech Stack
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** MongoDB & Mongoose
- **Real-time:** Socket.io
- **AI Integration:** Google GenAI SDK
- **Media Uploads:** Cloudinary & Multer

## ⚙️ Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd my-next-step
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```

4. **Run the server:**
   ```bash
   # Development mode with watch
   npm run dev

   # Production mode
   npm run server
   ```
