import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { connectDB } from "./lib/db";
import authRoutes from "./routes/auth";
import athleteRoutes from "./routes/athlete";
import coachRoutes from "./routes/coach";
import statsRoutes from "./routes/stats";
import chatRoutes from "./routes/chat";
import { initSocket } from "./socket";
import aiRoutes from "./routes/ai";
import { ensureDemoAccount } from "./lib/demo/ensureDemoAccount";
import path from "path";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://spaq-drab.vercel.app",
  "https://spaq-git-main-daves-projects-349fc7b6.vercel.app",
  "https://spaq-jdxfhunm4-daves-projects-349fc7b6.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/athlete", athleteRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai", aiRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

initSocket(io);

async function bootstrap() {
  try {
    await connectDB();

    await ensureDemoAccount();
    // oder immer frisch:
    // await ensureDemoAccount({ forceReseed: true });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log("Demo account ready: dirk@demo.com / password123");
    });
  } catch (error) {
    console.error("Failed to bootstrap server:", error);
    process.exit(1);
  }
}

bootstrap();
