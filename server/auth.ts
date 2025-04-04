import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import nodemailer from "nodemailer";
import { createClient } from "redis";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";

// Initialize Redis client and store
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.connect().catch(console.error);

const redisStore = new RedisStore({
  client: redisClient,
  prefix: "sheetsearch:",
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify email transport configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transport verification failed:', error);
  } else {
    console.log('Email transport is ready to send messages');
  }
});

const tempUsers = new Map();
const otpStore = new Map();
const resetTokens = new Map();

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'default-secret-key-for-development-only',
    resave: false,
    saveUninitialized: false,
    store: redisStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true
    }
  };

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tempUserId = randomBytes(16).toString('hex');

    tempUsers.set(tempUserId, {
      ...req.body,
      password: await hashPassword(req.body.password),
    });
    otpStore.set(tempUserId, otp);

    try {
      await transporter.sendMail({
        from: `"Sheet Search" <${process.env.EMAIL_USER || "your-email@gmail.com"}>`,
        to: req.body.email,
        subject: 'Email Verification OTP',
        text: `Your OTP for email verification is: ${otp}`,
        html: `<p>Your OTP for email verification is: <strong>${otp}</strong></p>`
      });

      res.status(200).json({ tempUserId });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  });

  app.post("/api/verify-otp", async (req, res, next) => {
    const { otp, tempUserId } = req.body;
    
    if (!tempUsers.has(tempUserId) || !otpStore.has(tempUserId)) {
      return res.status(400).json({ error: "Invalid or expired verification session" });
    }

    if (otpStore.get(tempUserId) !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const userData = tempUsers.get(tempUserId);
    const user = await storage.createUser(userData);

    tempUsers.delete(tempUserId);
    otpStore.delete(tempUserId);

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Password reset email sent successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: "No account found with this email address" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = randomBytes(16).toString('hex');
    
    resetTokens.set(resetToken, {
      userId: user.id,
      otp,
      expiry: Date.now() + 3600000 // 1 hour expiry
    });

    try {
      await transporter.sendMail({
        from: `"Sheet Search" <${process.env.EMAIL_USER || "your-email@gmail.com"}>`,
        to: user.email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}`,
        html: `<p>Your OTP for password reset is: <strong>${otp}</strong></p>`
      });

      res.status(200).json({ token: resetToken });
    } catch (error) {
      console.error('Error sending password reset email:', error);
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  });

  app.post("/api/forgot-username", async (req, res) => {
    const { email } = req.body;
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ error: "No account found with this email address" });
    }

    try {
      await transporter.sendMail({
        from: `"Sheet Search" <${process.env.EMAIL_USER || "your-email@gmail.com"}>`,
        to: user.email,
        subject: 'Your Username Recovery',
        text: `Your username is: ${user.username}`,
        html: `<p>Your username is: <strong>${user.username}</strong></p>`
      });

      res.status(200).json({ message: "Username sent successfully" });
    } catch (error) {
      console.error('Error sending username recovery email:', error);
      res.status(500).json({ error: 'Failed to send username recovery email' });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    const { token } = req.query;
    const { password, otp } = req.body;

    const resetData = resetTokens.get(token);
    if (!resetData) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    if (Date.now() > resetData.expiry) {
      resetTokens.delete(token);
      return res.status(400).json({ error: "Reset token has expired" });
    }

    if (resetData.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    try {
      const user = await storage.getUser(resetData.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(user.id, hashedPassword);

      resetTokens.delete(token);
      res.status(200).json({ message: "Password successfully reset" });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

}
