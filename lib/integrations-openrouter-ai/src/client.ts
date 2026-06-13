import OpenAI from "openai";

if (!process.env.GROQ_API_KEY) {
  throw new Error(
    "GROQ_API_KEY must be set. Please add your Groq API key as a secret.",
  );
}

export const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});
