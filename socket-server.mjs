import { Server } from "socket.io";
import { createServer } from "http";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

const httpServer = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/message-update") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        io.emit("messageUpdated", data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else if (req.method === "POST" && req.url === "/api/message-deleted") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        io.emit("messageDeleted", data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, restrict this to your domain
    methods: ["GET", "POST"]
  }
});

// Registry to keep track of online users: userId -> socketId
const users = new Map();
// Reverse mapping: socketId -> userId (for disconnects)
const socketToUser = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // User authenticates/registers their socket
  socket.on("register", (userId) => {
    if (userId) {
      users.set(userId, socket.id);
      socketToUser.set(socket.id, userId);
      console.log(`User ${userId} registered with socket ${socket.id}`);
      
      // Notify all users about online status
      io.emit("userOnline", userId);
      
      // Send the list of currently online users to the registered client
      socket.emit("onlineUsers", Array.from(users.keys()));
    }
  });

  // Chat message event
  socket.on("sendMessage", (data) => {
    // data should contain { to: recipientId, message: messageData }
    const { to, message } = data;
    const recipientSocketId = users.get(to);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("receiveMessage", message);
      console.log(`Message relayed to ${to}`);
    } else {
      console.log(`User ${to} is offline, message not relayed via socket`);
    }
  });

  // WebRTC Signaling: Initiate a call
  socket.on("callUser", (data) => {
    // data: { userToCall: recipientId, signalData: offer, from: callerId, callerName: name }
    const { userToCall, signalData, from, callerName } = data;
    const recipientSocketId = users.get(userToCall);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("incomingCall", { signal: signalData, from, callerName });
      console.log(`User ${from} calling ${userToCall}`);
    }
  });

  // WebRTC Signaling: Accept a call
  socket.on("answerCall", (data) => {
    // data: { to: callerId, signal: answer }
    const { to, signal } = data;
    const callerSocketId = users.get(to);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", signal);
      console.log(`Call accepted, notifying ${to}`);
    }
  });

  // WebRTC Signaling: ICE Candidate
  socket.on("iceCandidate", (data) => {
    // data: { to: recipientId, candidate: RTCIceCandidate }
    const { to, candidate } = data;
    const recipientSocketId = users.get(to);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("iceCandidate", candidate);
    }
  });

  // End Call
  socket.on("endCall", (data) => {
    // data: { to: otherUserId }
    const { to } = data;
    const recipientSocketId = users.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("callEnded");
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const userId = socketToUser.get(socket.id);
    if (userId) {
      users.delete(userId);
      socketToUser.delete(socket.id);
      console.log(`User ${userId} unregistered`);
      io.emit("userOffline", userId);

      // Clean up guest user session if they do not reconnect within 5 seconds
      setTimeout(async () => {
        if (users.has(userId)) {
          console.log(`User ${userId} reconnected within grace period. Cleanup cancelled.`);
          return;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
          });

          if (user && user.email.endsWith("@guest.justchat.com")) {
            console.log(`Cleaning up guest user ${userId} from database...`);
            await prisma.user.delete({
              where: { id: userId }
            });
            console.log(`Guest user ${userId} deleted successfully.`);
          }
        } catch (err) {
          console.error(`Failed to clean up guest user ${userId}:`, err);
        }
      }, 5000);
    }
  });
});

const PORT = 3002;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO Server running on port ${PORT}`);
});
