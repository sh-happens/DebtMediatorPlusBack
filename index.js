import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import nodemailer from "nodemailer";

import Borrower from "./models/Borrower.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "https://www.rfg.kz",
        "http://www.rfg.kz",
        "https://rfg.kz",
        "http://rfg.kz",
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads/" });

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to DebtMediatorPlus!" });
});

app.get("/check-user", async (req, res) => {
  const iin = req.query.iin;
  const phoneNumber = req.query.phoneNumber;

  if (!iin || !phoneNumber) {
    return res.status(400).json({ error: "IIN and phone number are required" });
  }

  try {
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, "");
    const iinQueries = [iin, parseInt(iin, 10), iin.toString()];

    const user = await Borrower.findOne({
      iin: { $in: iinQueries },
      $or: [
        { phoneNumber: cleanPhoneNumber },
        { phoneNumber: parseInt(cleanPhoneNumber, 10) },
        { phoneNumber: { $regex: cleanPhoneNumber } },
        { phoneNumber: { $regex: new RegExp(`\\b${cleanPhoneNumber}\\b`) } },
      ],
    });

    if (user) {
      let phoneMatches;
      if (typeof user.phoneNumber === "string") {
        phoneMatches = user.phoneNumber.match(/\d+/g);
      } else if (typeof user.phoneNumber === "number") {
        phoneMatches = [user.phoneNumber.toString()];
      } else {
        phoneMatches = user.phoneNumber.toString().match(/\d+/g);
      }

      const exactMatch = phoneMatches
        ? phoneMatches.some((match) => match.includes(cleanPhoneNumber))
        : false;

      res.json({ exists: exactMatch });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/send-email", upload.array("files", 5), async (req, res) => {
  const { fullName, address, comments } = req.body;
  const files = req.files;

  if (!fullName || !address) {
    return res.status(400).json({ error: "Full name and address are required" });
  }

  try {
    let attachments = files.map((file) => ({
      filename: file.originalname,
      path: file.path,
    }));

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: "Новая заявка на урегулирование задолженности",
      text: `ФИО: ${fullName}\nАдрес регистрации: ${address}\nКомментарии: ${comments}\nПрикрепленные файлы: ${files
        .map((f) => f.originalname)
        .join(", ")}`,
      html: `<p><strong>ФИО:</strong> ${fullName}</p>
             <p><strong>Адрес регистрации:</strong> ${address}</p>
             <p><strong>Комментарии:</strong> ${comments}</p>
             <p><strong>Прикрепленные файлы:</strong> ${files
               .map((f) => f.originalname)
               .join(", ")}</p>`,
      attachments: attachments,
    });

    res.json({ message: "Форма отправлена успешно" });
  } catch (error) {
    console.error("Ошибка при отправке email:", error);
    res.status(500).json({ error: "Не удалось отправить форму" });
  }
});

app.listen(PORT, () => {
  console.log(`DebtMediatorPlus server is running on port ${PORT}`);
});
