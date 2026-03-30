export const CALL_TYPES = ["resume-revamp", "job-market-guidance", "mock-interview"];

const makeAvailability = (day, start, end) => ({ day, start, end });

export const store = {
  users: [],
  mentors: [],
  admins: [],
  bookings: []
};

export function resetStore() {
  store.users = Array.from({ length: 10 }).map((_, i) => ({
    id: `u${i + 1}`,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    password: "user123",
    role: "user",
    tags: i % 2 === 0 ? ["tech", "good-communication", "asks-questions"] : ["non-tech", "good-communication"],
    description: i % 2 === 0 ? "Looking to improve interview and resume for product roles." : "Needs guidance on communication and confidence.",
    availability: [makeAvailability("monday", "10:00", "12:00"), makeAvailability("wednesday", "15:00", "17:00")]
  }));

  store.mentors = Array.from({ length: 5 }).map((_, i) => ({
    id: `m${i + 1}`,
    name: `Mentor ${i + 1}`,
    email: `mentor${i + 1}@example.com`,
    password: "mentor123",
    role: "mentor",
    tags: [
      i % 2 === 0 ? "tech" : "non-tech",
      i < 3 ? "big-company" : "public-company",
      i % 2 === 0 ? "senior-developer" : "good-communication"
    ],
    description: i % 2 === 0 ? "Engineering mentor from big tech with strong interview prep experience." : "Career mentor focused on communication and job readiness.",
    availability: [makeAvailability("monday", "11:00", "13:00"), makeAvailability("wednesday", "16:00", "18:00")]
  }));

  store.admins = [
    {
      id: "a1",
      name: "Admin User",
      email: "admin@example.com",
      password: "admin123",
      role: "admin"
    }
  ];

  store.bookings = [];
}

resetStore();

export function findAccountByEmail(email) {
  return [...store.users, ...store.mentors, ...store.admins].find((a) => a.email === email);
}

export function getAccountById(role, id) {
  if (role === "user") return store.users.find((u) => u.id === id);
  if (role === "mentor") return store.mentors.find((m) => m.id === id);
  if (role === "admin") return store.admins.find((a) => a.id === id);
  return null;
}
