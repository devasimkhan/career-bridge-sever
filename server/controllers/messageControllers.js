import Message from "../models/messageModel.js";
import User from "../models/userModels.js";
import { roomName } from "../socket/chatHandel.js";

// GET /api/messages — inbox: last message per contact + unread count
// Jis user ne message kiya ho, vah contact list me dikhega
// Counselor ke liye: sirf STUDENT contacts dikhenge, aur counselor-counselor purane messages permanent delete honge
const getInbox = async (req, res) => {
  const me = req.user._id;

  const meUser = await User.findById(me).select("userType");
  const isCounselor = meUser?.userType === "COUNSELOR";

  const messages = await Message.find({
    $or: [{ sender: me }, { receiver: me }],
    deletedFor: { $ne: me },
  })
    .populate("sender", "name profilePic userType")
    .populate("receiver", "name profilePic userType")
    .sort({ createdAt: -1 });

  const inboxMap = new Map();

  for (const msg of messages) {
    const isSelfSender = String(msg.sender?._id || msg.sender) === String(me);
    const other = isSelfSender ? msg.receiver : msg.sender;
    if (!other) continue;
    const otherId = String(other._id || other);

    // Agar logged-in user COUNSELOR hai aur samne wala user bhi COUNSELOR hai ya STUDENT nahi hai:
    // Unke beech ke purane messages DB se permanently delete honge aur inbox me nahi aayenge
    if (isCounselor && other.userType === "COUNSELOR") {
      await Message.deleteMany({
        $or: [
          { sender: me, receiver: other._id },
          { sender: other._id, receiver: me },
        ],
      });
      continue;
    }

    if (isCounselor && other.userType !== "STUDENT") {
      continue;
    }

    if (!inboxMap.has(otherId)) {
      inboxMap.set(otherId, {
        user: other,
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
        lastMessageId: msg._id,
        unreadCount: 0,
      });
    }
  }

  // Unread count per contact (receiver = me, isRead = false, mere liye deleted nahi)
  const unreadAgg = await Message.aggregate([
    { $match: { receiver: me, isRead: false, deletedFor: { $ne: me } } },
    { $group: { _id: "$sender", count: { $sum: 1 } } },
  ]);
  for (const u of unreadAgg) {
    const key = String(u._id);
    if (inboxMap.has(key)) {
      inboxMap.get(key).unreadCount = u.count;
    }
  }

  res.status(200).json([...inboxMap.values()]);
};

// GET /api/messages/:uid — conversation between logged-in user and :uid
const getConversation = async (req, res) => {
  const me = req.user._id;
  const other = req.params.uid;

  const meUser = await User.findById(me).select("userType");
  const otherUser = await User.findById(other).select("userType");

  if (meUser?.userType === "COUNSELOR" && otherUser?.userType === "COUNSELOR") {
    await Message.deleteMany({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
    });
    return res.status(200).json([]);
  }

  const messages = await Message.find({
    $or: [
      { sender: me, receiver: other },
      { sender: other, receiver: me },
    ],
    deletedFor: { $ne: me },
  })
    .populate("sender", "name profilePic userType")
    .populate("receiver", "name profilePic userType")
    .sort({ createdAt: 1 });

  res.status(200).json(messages);
};



// DELETE /api/messages/conversation/:uid — poori chat history clear (sirf mere liye)
// Dusre user ki history safe rehti hai (per-user delete via deletedFor)
const clearConversation = async (req, res) => {
  const me = req.user._id;
  const other = req.params.uid;

  if (!other || String(other) === String(me)) {
    res.status(400);
    throw new Error("Invalid chat user");
  }

  const result = await Message.updateMany(
    {
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
      deletedFor: { $ne: me },
    },
    { $addToSet: { deletedFor: me } }
  );

  res.status(200).json({
    success: true,
    message: "Chat history cleared",
    clearedCount: result.modifiedCount ?? 0,
  });
};

// DELETE /api/messages/message/:mid — single message delete
// Sender apna message sabke liye delete karta hai (hard delete + realtime notify),
// receiver/dusra user sirf apne liye hide karta hai
const deleteMessage = async (req, res) => {
  const me = req.user._id;
  const mid = req.params.mid;

  const message = await Message.findById(mid);
  if (!message) {
    res.status(404);
    throw new Error("Message Not Found");
  }

  const isSender = String(message.sender) === String(me);
  const isReceiver = String(message.receiver) === String(me);
  if (!isSender && !isReceiver) {
    res.status(403);
    throw new Error("Not allowed to delete this message");
  }

  if (isSender) {
    const sender = String(message.sender);
    const receiver = String(message.receiver);
    await message.deleteOne();
    // Realtime: dono ke open chat se message turant hatao
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(roomName(sender, receiver)).emit("message_deleted", {
          messageId: String(mid),
          conversationWith: receiver,
        });
      }
    } catch {
      // socket emit fail ho to bhi delete success mana jayega
    }
    return res.status(200).json({
      success: true,
      message: "Message deleted for everyone",
      deletedForEveryone: true,
    });
  }

  await Message.updateOne(
    { _id: mid, deletedFor: { $ne: me } },
    { $addToSet: { deletedFor: me } }
  );
  return res.status(200).json({
    success: true,
    message: "Message deleted for you",
    deletedForEveryone: false,
  });
};

// GET /api/messages/user-info/:uid — fetch user info (name, profilePic) for direct chat
const getTargetUser = async (req, res) => {
  const user = await User.findById(req.params.uid).select("name profilePic qualification location userType");
  if (!user) {
    res.status(404);
    throw new Error("User Not Found");
  }
  res.status(200).json(user);
};

const messageControllers = { getConversation, getInbox, clearConversation, deleteMessage, getTargetUser };

export default messageControllers;

