const MODEL = "gpt-4.1-mini";

function overlapScore(userTags, mentorTags) {
  const matches = userTags.filter((t) => mentorTags.includes(t)).length;
  return userTags.length ? Math.round((matches / userTags.length) * 100) : 0;
}

export async function scoreMentorWithOpenAI({ user, mentor, callType, apiKey }) {
  if (!apiKey) {
    const score = overlapScore(user.tags, mentor.tags);
    return {
      score,
      reason: `Fallback score from tag overlap (${score}%).`
    };
  }

  const prompt = `You are ranking mentor fit for mentoring calls.
Return strict JSON with shape {"score": number, "reason": string}.
score must be 0-100.
Call type: ${callType}
User tags: ${JSON.stringify(user.tags)}
User description: ${user.description}
Mentor tags: ${JSON.stringify(mentor.tags)}
Mentor description: ${mentor.description}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "match_score",
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              reason: { type: "string" }
            },
            required: ["score", "reason"],
            additionalProperties: false
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI scoring failed with status ${response.status}`);
  }

  const data = await response.json();
  const output = data.output_text ? JSON.parse(data.output_text) : null;

  if (!output || typeof output.score !== "number") {
    throw new Error("OpenAI response missing score");
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(output.score))),
    reason: output.reason
  };
}

function parseTime(s) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export function findAvailabilityOverlap(userAvailability, mentorAvailability) {
  const overlaps = [];
  for (const u of userAvailability) {
    for (const m of mentorAvailability) {
      if (u.day !== m.day) continue;
      const start = Math.max(parseTime(u.start), parseTime(m.start));
      const end = Math.min(parseTime(u.end), parseTime(m.end));
      if (start < end) {
        const format = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
        overlaps.push({ day: u.day, start: format(start), end: format(end) });
      }
    }
  }
  return overlaps;
}
