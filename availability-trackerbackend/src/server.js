import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRequired, roleRequired, signToken } from "./auth.js";
import { CALL_TYPES, findAccountByEmail, resetStore, store } from "./data.js";
import { findAvailabilityOverlap, scoreMentorWithOpenAI } from "./recommendation.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const account = findAccountByEmail(email);
  if (!account || account.password !== password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(account);
  return res.json({
    token,
    user: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      tags: account.tags || [],
      description: account.description || "",
      availability: account.availability || []
    }
  });
});

app.get("/api/me", authRequired, (req, res) => {
  const { password, ...safe } = req.user;
  res.json(safe);
});

app.patch("/api/me/profile", authRequired, roleRequired("user", "mentor"), (req, res) => {
  const { tags, description } = req.body;
  if (tags) req.user.tags = tags;
  if (typeof description === "string") req.user.description = description;
  res.json({ message: "Profile updated", user: req.user });
});

app.put("/api/me/availability", authRequired, roleRequired("user", "mentor"), (req, res) => {
  const { availability } = req.body;
  if (!Array.isArray(availability)) {
    return res.status(400).json({ message: "availability must be an array" });
  }
  req.user.availability = availability;
  res.json({ message: "Availability updated", availability: req.user.availability });
});

app.get("/api/call-types", authRequired, (_, res) => {
  res.json({ callTypes: CALL_TYPES });
});

app.get("/api/admin/users", authRequired, roleRequired("admin"), (_, res) => {
  res.json(store.users);
});

app.get("/api/admin/mentors", authRequired, roleRequired("admin"), (_, res) => {
  res.json(store.mentors);
});

app.get("/api/admin/recommendations", authRequired, roleRequired("admin"), async (req, res) => {
  const { userId, callType } = req.query;
  const user = store.users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!CALL_TYPES.includes(callType)) {
    return res.status(400).json({ message: "Invalid call type" });
  }

  try {
    const recommendations = await Promise.all(
      store.mentors.map(async (mentor) => {
        const scoreData = await scoreMentorWithOpenAI({
          user,
          mentor,
          callType,
          apiKey: process.env.OPENAI_API_KEY
        });
        const overlap = findAvailabilityOverlap(user.availability, mentor.availability);
        return { mentor, ...scoreData, overlapCount: overlap.length };
      })
    );

    recommendations.sort((a, b) => b.score - a.score || b.overlapCount - a.overlapCount);

    return res.json({
      user,
      callType,
      recommendations
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.get("/api/admin/overlap", authRequired, roleRequired("admin"), (req, res) => {
  const { userId, mentorId } = req.query;
  const user = store.users.find((u) => u.id === userId);
  const mentor = store.mentors.find((m) => m.id === mentorId);
  if (!user || !mentor) return res.status(404).json({ message: "User or mentor not found" });

  const overlaps = findAvailabilityOverlap(user.availability, mentor.availability);
  res.json({ overlaps });
});

app.post("/api/admin/bookings", authRequired, roleRequired("admin"), (req, res) => {
  const { userId, mentorId, callType, slot } = req.body;
  const user = store.users.find((u) => u.id === userId);
  const mentor = store.mentors.find((m) => m.id === mentorId);
  if (!user || !mentor) return res.status(404).json({ message: "User or mentor not found" });

  const overlaps = findAvailabilityOverlap(user.availability, mentor.availability);
  const validSlot = overlaps.some((o) => o.day === slot.day && o.start === slot.start && o.end === slot.end);
  if (!validSlot) return res.status(400).json({ message: "Slot is not in overlap" });

  const booking = {
    id: `b${store.bookings.length + 1}`,
    userId,
    mentorId,
    callType,
    slot,
    bookedBy: req.user.id,
    bookedAt: new Date().toISOString()
  };
  store.bookings.push(booking);
  res.status(201).json({ message: "Call booked", booking });
});

app.post("/api/dev/reset", (_, res) => {
  resetStore();
  res.json({ message: "Store reset" });
});

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
