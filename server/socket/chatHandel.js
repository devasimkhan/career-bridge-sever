import Message from "../models/messageModel.js";
import User from "../models/userModels.js";

export const onlineUsers = new Map();

export const roomName = (a, b) => `room_${[a, b].map(String).sort().join("_")}`;

export const chatHandler = (io, socket) => {
  const userId = String(socket.userID || socket.userId || "");
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Personal room: bina chat khole bhi receiver tak notification pahunche
  socket.join(`user_${userId}`);

  // Naye connected user ko abhi-online sabki list bhejo (initial sync)
  socket.emit("online_list", { onlineUsers: [...onlineUsers.keys()] });
  // Baaki sabko batao ye user online hai
  socket.broadcast.emit("user_online", { userId });

  socket.on("join_room", ({ senderID, receiverId }) => {
    if (!senderID || !receiverId) return;
    socket.join(roomName(senderID, receiverId));
  });

  socket.on("send_message", async ({ senderID, receiverId, content }) => {
    if (!content?.trim() || !senderID || !receiverId) return;
    try {
      const message = await Message.create({
        sender: senderID,
        receiver: receiverId,
        content: content.trim(),
      });
      const senderDoc = await User.findById(senderID).select("name profilePic");
      const payload = {
        _id: message._id,
        sender: message.sender,
        receiver: message.receiver,
        content: message.content,
        isRead: message.isRead,
        seenAt: message.seenAt,
        createdAt: message.createdAt,
        senderName: senderDoc?.name || null,
        senderPic: senderDoc?.profilePic || null,
      };
      io.to(roomName(senderID, receiverId)).emit("receiver_message", payload);
      // Receiver ke personal room me notification — room join na ho tab bhi pahunche
      io.to(`user_${receiverId}`).emit("new_message", {
        messageId: message._id,
        senderId: String(senderID),
        receiverId: String(receiverId),
        senderName: senderDoc?.name || "User",
        senderPic: senderDoc?.profilePic || null,
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (error) {
      socket.emit("message_error", { error: "Error in sending message" });
    }
  });

  // Socket-based seen: jab receiver chat khola ho aur naye messages aayein
  // Frontend "mark_seen" emit karta hai � DB update + broadcast
  socket.on("mark_seen", async ({ viewerId, senderId }) => {
    if (!viewerId || !senderId) return;
    try {
      const now = new Date();
      const result = await Message.updateMany(
        { sender: senderId, receiver: viewerId, isRead: false },
        { $set: { isRead: true, seenAt: now } }
      );
      if (result.modifiedCount > 0) {
        io.to(roomName(viewerId, senderId)).emit("messages_seen", {
          readerId: String(viewerId),
          senderId: String(senderId),
          seenAt: now,
        });
      }
    } catch {
      // ignore DB error
    }
  });

  socket.on("Typing", ({ senderID, receiverId }) => {
    if (!senderID || !receiverId) return;
    socket.to(roomName(senderID, receiverId)).emit("user_typing", { userId: senderID });
  });

  socket.on("disconnect", () => {
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      // Last tab/socket band hua tabhi offline broadcast karo
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("user_offline", { userId });
      }
    }
  });
};
