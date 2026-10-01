import Message from "../models/messageModel.js";

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
      io.to(roomName(senderID, receiverId)).emit("receiver_message", {
        _id: message._id,
        sender: message.sender,
        receiver: message.receiver,
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (error) {
      socket.emit("message_error", { error: "Error in sending message" });
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
