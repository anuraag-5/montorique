import React from "react";
import ReactDOM from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function api(path, options = {}, token) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "API error");
  return data;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card">
      <h1>Mentoring Call Scheduler</h1>
      <p>Login only. No signup flow.</p>
      <form onSubmit={submit}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button type="submit">Login</button>
      </form>
      <small>Admin: admin@example.com/admin123</small>
    </div>
  );
}

function AvailabilityEditor({ availability, onChange }) {
  const [day, setDay] = useState("monday");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");

  return (
    <div>
      <div className="row">
        <select value={day} onChange={(e) => setDay(e.target.value)}>
          {["monday", "tuesday", "wednesday", "thursday", "friday"].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        <button
          type="button"
          onClick={() => onChange([...availability, { day, start, end }])}
        >
          Add Slot
        </button>
      </div>
      <ul>
        {availability.map((a, idx) => (
          <li key={`${a.day}-${a.start}-${idx}`}>
            {a.day}: {a.start} - {a.end}{" "}
            <button type="button" onClick={() => onChange(availability.filter((_, i) => i !== idx))}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserMentorDashboard({ auth, onLogout }) {
  const [tags, setTags] = useState(auth.user.tags.join(", "));
  const [description, setDescription] = useState(auth.user.description || "");
  const [availability, setAvailability] = useState(auth.user.availability || []);
  const [message, setMessage] = useState("");

  const saveProfile = async () => {
    await api(
      "/api/me/profile",
      {
        method: "PATCH",
        body: JSON.stringify({ tags: tags.split(",").map((t) => t.trim()).filter(Boolean), description })
      },
      auth.token
    );
    setMessage("Profile saved.");
  };

  const saveAvailability = async () => {
    await api(
      "/api/me/availability",
      {
        method: "PUT",
        body: JSON.stringify({ availability })
      },
      auth.token
    );
    setMessage("Availability updated.");
  };

  return (
    <div className="card">
      <h2>{auth.user.role.toUpperCase()} Dashboard</h2>
      <p>{auth.user.role === "mentor" ? "You can only add availability." : "You can only add availability."} Booking is disabled.</p>
      <label>Tags (comma separated)</label>
      <input value={tags} onChange={(e) => setTags(e.target.value)} />
      <label>Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      <button type="button" onClick={saveProfile}>Save profile</button>
      <h3>Availability</h3>
      <AvailabilityEditor availability={availability} onChange={setAvailability} />
      <button type="button" onClick={saveAvailability}>Save availability</button>
      {message && <p className="ok">{message}</p>}
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

function AdminDashboard({ auth, onLogout }) {
  const [users, setUsers] = useState([]);
  const [callTypes, setCallTypes] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCallType, setSelectedCallType] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [selectedMentor, setSelectedMentor] = useState("");
  const [overlaps, setOverlaps] = useState([]);
  const [bookMessage, setBookMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const [u, c] = await Promise.all([
        api("/api/admin/users", {}, auth.token),
        api("/api/call-types", {}, auth.token)
      ]);
      setUsers(u);
      setSelectedUser(u[0]?.id || "");
      setCallTypes(c.callTypes);
      setSelectedCallType(c.callTypes[0] || "");
    };
    load().catch(console.error);
  }, [auth.token]);

  const fetchRecommendations = async () => {
    const data = await api(`/api/admin/recommendations?userId=${selectedUser}&callType=${selectedCallType}`, {}, auth.token);
    setRecommendations(data.recommendations);
    setSelectedMentor(data.recommendations[0]?.mentor.id || "");
    setBookMessage("");
  };

  const fetchOverlap = async () => {
    const data = await api(`/api/admin/overlap?userId=${selectedUser}&mentorId=${selectedMentor}`, {}, auth.token);
    setOverlaps(data.overlaps);
  };

  const bookFirst = async () => {
    if (!overlaps.length) return;
    const result = await api(
      "/api/admin/bookings",
      {
        method: "POST",
        body: JSON.stringify({ userId: selectedUser, mentorId: selectedMentor, callType: selectedCallType, slot: overlaps[0] })
      },
      auth.token
    );
    setBookMessage(`Booked! Booking ID: ${result.booking.id}`);
  };

  const selectedUserData = useMemo(() => users.find((u) => u.id === selectedUser), [users, selectedUser]);

  return (
    <div className="card">
      <h2>ADMIN Dashboard</h2>
      <p>Admin handles recommendations, overlap checks, and booking.</p>

      <label>User</label>
      <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>

      <label>Call type</label>
      <select value={selectedCallType} onChange={(e) => setSelectedCallType(e.target.value)}>
        {callTypes.map((ct) => <option key={ct}>{ct}</option>)}
      </select>

      <button onClick={fetchRecommendations}>Get mentor recommendations</button>

      {selectedUserData && (
        <div className="panel">
          <strong>User requirements</strong>
          <p>{selectedUserData.description}</p>
          <p>Tags: {selectedUserData.tags.join(", ")}</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <>
          <h3>Recommended mentors</h3>
          <ul>
            {recommendations.map((r) => (
              <li key={r.mentor.id}>
                <label>
                  <input
                    type="radio"
                    name="mentor"
                    value={r.mentor.id}
                    checked={selectedMentor === r.mentor.id}
                    onChange={(e) => setSelectedMentor(e.target.value)}
                  />
                  {r.mentor.name} - score {r.score} - overlap slots {r.overlapCount}
                </label>
                <div className="small">{r.reason}</div>
              </li>
            ))}
          </ul>
          <button onClick={fetchOverlap}>Check availability overlap</button>
        </>
      )}

      {overlaps.length > 0 && (
        <div className="panel">
          <strong>Overlap slots</strong>
          <ul>{overlaps.map((o, i) => <li key={i}>{o.day} {o.start} - {o.end}</li>)}</ul>
          <button onClick={bookFirst}>Book first overlap slot</button>
        </div>
      )}

      {bookMessage && <p className="ok">{bookMessage}</p>}
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState(null);

  if (!auth) {
    return <Login onLogin={setAuth} />;
  }

  return auth.user.role === "admin" ? (
    <AdminDashboard auth={auth} onLogout={() => setAuth(null)} />
  ) : (
    <UserMentorDashboard auth={auth} onLogout={() => setAuth(null)} />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
