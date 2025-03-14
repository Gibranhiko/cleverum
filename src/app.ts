import "dotenv/config";
import express from "express";
import next from "next";
import { createServer } from "http";
import { createBot, createProvider, MemoryDB } from "@builderbot/bot";
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import AIClass from "./chatbot/services/ai/index";
import flow from "./chatbot/flows";
import connectToDatabase from "./client-admin/app/api/utils/mongoose";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const PORT = process.env.PORT;
const dev = process.env.NODE_ENV !== "production";
const clientAdminApp = next({ dev, dir: "./src/client-admin" });
const handle = clientAdminApp.getRequestHandler();

const ai = new AIClass(process.env.OPEN_API_KEY, "gpt-3.5-turbo");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const main = async () => {
  try {
    await clientAdminApp.prepare();
    const app = express();

    const adapterProvider = createProvider(Provider, {
      timeRelease: 10800000, // 3 hours in milliseconds
    });

    // Create an HTTP server instance from Express
    const httpWebServer = createServer(app);

    // Connect to MongoDB
    await connectToDatabase("orders");
    console.log("Connected to MongoDB");

    // Serve QR code image
    app.get("/getqr", (req, res) => {
      const qrImagePath = path.join(__dirname, "../bot.qr.png");

      fs.readFile(qrImagePath, (err, data) => {
        if (err) {
          console.log("Error reading the QR code image:", err);
          return res.status(500).send("Error reading the QR code image");
        }
        res.contentType("image/png");
        res.send(data);
      });
    });

    // Handle Next.js app router requests
    app.all("*", (req, res) => {
      return handle(req, res);
    });

    // Bot routes or middleware
    const { httpServer } = await createBot(
      {
        database: new MemoryDB(),
        provider: adapterProvider,
        flow,
      },
      { extensions: { ai } }
    );

    // Initialize Socket.IO
    const io = new Server(httpWebServer, {
      cors: {
        origin: "*", // Handle specific origin request on PROD
        methods: ["GET", "POST"],
      },
    });

    global.io = io;

    // Handle WebSocket connections
    io.on("connection", (socket) => {
      console.log("New WebSocket connection:", socket.id);

      socket.on("new-order", (order) => {
        console.log("New order received:", order);
        io.emit("new-order", order);
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    // Start the server
    httpWebServer.listen(PORT, () => {
      console.log(`Web server running on http://localhost:${PORT}`);
    });
    httpServer(Number(PORT) + 1);
  } catch (err) {
    console.log("App could not start" + err);
  }
};

main();
