import Message from "../models/messageModel.js";
import User from "../models/userModels.js";
import { roomName } from "../socket/chatHandel.js";

// GET /api/messages — inbox: last message per contact + unread count
// Counselor ke liye: sirf STUDENT contacts + student ka latest message (not counselor's own reply)
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

    // Counselor-to-Counselor messages permanently delete karo
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
        lastMessageSender: isSelfSender ? "me" : "them",
        lastMessageId: msg._id,
        unreadCount: 0,
        _hasStudentMsg: !isSelfSender,
      });
    } else {
      const existing = inboxMap.get(otherId);
      // Counselor ke liye: student ka latest message prefer karo
      if (isCounselor && !existing._hasStudentMsg && !isSelfSender) {
        existing.lastMessage = msg.content;
        existing.lastMessageAt = msg.createdAt;
        existing.lastMessageSender = "them";
        existing._hasStudentMsg = true;
      }
    }
  }

  // Unread count per contact
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

  const result = [...inboxMap.values()].map(({ _hasStudentMsg, ...rest }) => rest);
  res.status(200).json(result);
};

// GET /api/messages/:uid — conversation between logged-in user and :uid
const getConversation = async (req, res) => {
  const me = req.user._id;
  const other = req.params.uid;

  if (!other || String(other) === String(me)) {
    res.status(400);
    throw new Error("Invalid conversation user");
  }

  const meUser = await User.findById(me).select("userType");
  const otherUser = await User.findById(other).select("userType");

  if (!otherUser) {
    res.status(404);
    throw new Error("User not found");
  }

  // Counselor-to-Counselor: block & clear
  if (meUser?.userType === "COUNSELOR" && otherUser?.userType === "COUNSELOR") {
    await Message.deleteMany({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
    });
    return res.status(200).json([]);
  }

  // Mark all unread messages sent by other to me as read + set seenAt
  const now = new Date();
  const updateResult = await Message.updateMany(
    { sender: other, receiver: me, isRead: false },
    { $set: { isRead: true, seenAt: now } }
  );

  // Realtime: dono users ko seen status broadcast karo
  try {
    const io = req.app.get("io");
    if (io && updateResult.modifiedCount > 0) {
      io.to(roomName(me, other)).emit("messages_seen", {
        readerId: String(me),
        senderId: String(other),
        seenAt: now,
      });
    }
  } catch {
    // ignore socket emit error
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

// POST /api/messages/mark-seen/:uid — mark messages from :uid as read
const markSeen = async (req, res) => {
  const me = req.user._id;
  const other = req.params.uid;

  if (!other || String(other) === String(me)) {
    res.status(400);
    throw new Error("Invalid user");
  }

  const now = new Date();
  const updateResult = await Message.updateMany(
    { sender: other, receiver: me, isRead: false },
    { $set: { isRead: true, seenAt: now } }
  );

  try {
    const io = req.app.get("io");
    if (io && updateResult.modifiedCount > 0) {
      io.to(roomName(me, other)).emit("messages_seen", {
        readerId: String(me),
        senderId: String(other),
        seenAt: now,
      });
    }
  } catch {
    // ignore
  }

  res.status(200).json({ success: true, markedCount: updateResult.modifiedCount });
};

// DELETE /api/messages/conversation/:uid — poori chat history clear (sirf mere liye)
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
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(roomName(sender, receiver)).emit("message_deleted", {
          messageId: String(mid),
          conversationWith: receiver,
        });
      }
    } catch {
      // socket emit fail ho to bhi delete success
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

// GET /api/messages/user-info/:uid — fetch user info for direct chat
const getTargetUser = async (req, res) => {
  const user = await User.findById(req.params.uid).select(
    "name profilePic qualification location userType"
  );
  if (!user) {
    res.status(404);
    throw new Error("User Not Found");
  }
  res.status(200).json(user);
};

const messageControllers = {
  getConversation,
  getInbox,
  clearConversation,
  deleteMessage,
  getTargetUser,
  markSeen,
};

export default messageControllers;
