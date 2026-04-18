import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";

import { connectDB } from "./lib/db";
import { initSocket } from "./socket";
import authRoutes from "./routes/auth";
import athleteRoutes from "./routes/athlete";
import coachRoutes from "./routes/coach";
import statsRoutes from "./routes/stats";
import chatRoutes from "./routes/chat";
import aiRoutes from "./routes/ai";
import locationRoutes from "./routes/location";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://spaq-drab.vercel.app",
  "https://spaq-git-main-daves-projects-349fc7b6.vercel.app",
  "https://spaq-jdxfhunm4-daves-projects-349fc7b6.vercel.app",
  "https://spaq-oioqvd854-daves-projects-349fc7b6.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/spaq-[a-z0-9-]+-daves-projects-349fc7b6\.vercel\.app$/.test(
          origin
        );

      if (isAllowed) {
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
app.use("/api/location", locationRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https:\/\/spaq-[a-z0-9-]+-daves-projects-349fc7b6\.vercel\.app$/.test(
          origin
        );

      if (isAllowed) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by Socket CORS"));
    },
    credentials: true,
  },
});

initSocket(io);

async function bootstrap() {
  await connectDB();

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
