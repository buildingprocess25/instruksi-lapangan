export const isLocalMode =
  process.env.LOCAL_MODE === "true" ||
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("[PROJECT-REF]") ||
  process.env.DATABASE_URL.includes("localhost:5432/db")
