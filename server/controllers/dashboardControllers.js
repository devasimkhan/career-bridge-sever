import User from "../models/userModels.js";
import Roadmap from "../models/roadmapModel.js";
import Message from "../models/messageModel.js";
import Credit from "../models/creditsModel.js";
import Counselor from "../models/counselorModel.js";
import Rating from "../models/ratingModel.js";

const extractTitle = (text = "") => {
  const lines = String(text)
    .split("\n")
    .map((l) => l.replace(/^[#*\-\s>]+/, "").trim())
    .filter(Boolean);
  const titleLine =
    lines.find((l) => /career|roadmap|snapshot|full-stack|data|mern/i.test(l)) ||
    lines[0] ||
    "My Career Roadmap";
  return titleLine.slice(0, 80);
};

const calcProfileCompletion = (user) => {
  const fields = [
    user?.name,
    user?.email,
    user?.phone,
    user?.qualification,
    user?.location,
    user?.profilePic,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

// GET /api/user/dashboard — aggregated student (user) dashboard
export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const freshUser = await User.findById(userId).select("-password").lean();
    if (!freshUser) {
      return res.status(404).json({
        success: false,
        message: "User Not Found",
      });
    }

    const [
      roadmapsCount,
      recentRoadmaps,
      creditRequests,
      pendingCreditsCount,
      totalUnread,
      recentMessages,
      acceptedCounselors,
      ratingAgg,
    ] = await Promise.all([
      Roadmap.countDocuments({ user: userId }),
      Roadmap.find({ user: userId }).sort({ createdAt: -1 }).limit(3).lean(),
      Credit.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Credit.countDocuments({ user: userId, status: "pending" }),
      Message.countDocuments({ receiver: userId, isRead: false }),
      Message.find({ $or: [{ sender: userId }, { receiver: userId }] })
        .populate("sender", "name profilePic userType")
        .populate("receiver", "name profilePic userType")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Counselor.find({ status: "accepted" })
        .populate("user", "name profilePic location qualification")
        .populate("category", "name title")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Rating.aggregate([
        { $group: { _id: "$counselor", avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
        { $sort: { avgRating: -1, totalReviews: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Distinct chat contacts -> "upcoming sessions / active chats"
    const seen = new Set();
    const upcomingSessions = [];
    for (const msg of recentMessages) {
      const senderId = String(msg.sender?._id || msg.sender);
      const receiverId = String(msg.receiver?._id || msg.receiver);
      const otherId = senderId === String(userId) ? receiverId : senderId;
      if (!otherId || seen.has(otherId)) continue;
      seen.add(otherId);
      const other = senderId === String(userId) ? msg.receiver : msg.sender;
      if (!other?.name) continue;
      upcomingSessions.push({
        contactId: otherId,
        counselor: other.name,
        avatar: other.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        profilePic: other.profilePic || null,
        topic: msg.content?.slice(0, 90) || "Chat conversation",
        date: msg.createdAt,
        isRead: msg.isRead,
        status: msg.isRead ? "Active Chat" : "New Message",
      });
      if (upcomingSessions.length >= 3) break;
    }

    // Spotlight mentor: top-rated accepted counselor, fallback to latest
    const ratingByCounselor = new Map(
      ratingAgg.map((r) => [String(r._id), r])
    );
    const withRatings = acceptedCounselors
      .map((c) => ({
        counselor: c,
        stats: ratingByCounselor.get(String(c._id)),
      }))
      .sort(
        (a, b) =>
          (b.stats?.avgRating || 0) - (a.stats?.avgRating || 0) ||
          (b.counselor?.experience || 0) - (a.counselor?.experience || 0) ||
          (b.stats?.totalReviews || 0) - (a.stats?.totalReviews || 0)
      );
    let spotlightMentor = null;
    // Best 3 counselors — rating pehle, phir experience (dashboard sessions section)
    const topCounselors = withRatings.slice(0, 3).map(({ counselor: c, stats: s }) => ({
      counselorId: c._id,
      userId: c.user?._id || c.user,
      name: c.user?.name || "Verified Mentor",
      profilePic: c.user?.profilePic || null,
      qualification: c.user?.qualification || null,
      category: c.category?.name || c.category?.title || "Career Mentor",
      experience: c.experience || 0,
      avgRating: s ? Number(s.avgRating.toFixed(1)) : null,
      totalReviews: s?.totalReviews || 0,
    }));
    const top = withRatings[0]?.counselor;
    if (top) {
      const stats = ratingByCounselor.get(String(top._id));
      spotlightMentor = {
        counselorId: top._id,
        userId: top.user?._id || top.user,
        name: top.user?.name || "Verified Mentor",
        profilePic: top.user?.profilePic || null,
        category: top.category?.name || top.category?.title || "Career Mentor",
        experience: top.experience || 0,
        avgRating: stats ? Number(stats.avgRating.toFixed(1)) : null,
        totalReviews: stats?.totalReviews || 0,
      };
    }

    return res.status(200).json({
      success: true,
      profile: {
        _id: freshUser._id,
        name: freshUser.name,
        email: freshUser.email,
        phone: freshUser.phone,
        qualification: freshUser.qualification,
        location: freshUser.location,
        credits: freshUser.credits,
        profilePic: freshUser.profilePic,
        userType: freshUser.userType,
        isActive: freshUser.isActive,
        memberSince: freshUser.createdAt,
      },
      stats: {
        activeRoadmaps: roadmapsCount,
        bookedSessions: seen.size,
        creditBalance: freshUser.credits,
        profileCompletion: calcProfileCompletion(freshUser),
        unreadMessages: totalUnread,
        pendingCreditRequests: pendingCreditsCount,
      },
      recentRoadmaps: recentRoadmaps.map((r) => ({
        _id: r._id,
        title: extractTitle(r.text),
        excerpt: String(r.text || "").slice(0, 140),
        createdAt: r.createdAt,
      })),
      upcomingSessions,
      topCounselors,
      creditWallet: {
        balance: freshUser.credits,
        pendingRequests: pendingCreditsCount,
        recentRequests: creditRequests.map((c) => ({
          _id: c._id,
          credits: c.credits,
          status: c.status,
          createdAt: c.createdAt,
        })),
      },
      spotlightMentor,
    });
  } catch (error) {
    console.error("User Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable To Load Dashboard",
    });
  }
};
