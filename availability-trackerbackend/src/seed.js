import { store } from "./data.js";

console.log("Seeded data summary:");
console.log(`Users: ${store.users.length}`);
console.log(`Mentors: ${store.mentors.length}`);
console.log(`Admins: ${store.admins.length}`);
console.log("Admin login: admin@example.com / admin123");
console.log("Sample user login: user1@example.com / user123");
console.log("Sample mentor login: mentor1@example.com / mentor123");
