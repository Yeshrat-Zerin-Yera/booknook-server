import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { getDB } from "../config/db.js";

export function createAuth() {
  return betterAuth({
    database: mongodbAdapter(getDB()),

    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,

    trustedOrigins: [
      process.env.CLIENT_URL!,
    ],

    emailAndPassword: {
      enabled: true,
    },
  });
}