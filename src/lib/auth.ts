
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
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
      autoSignIn: false,
      minPasswordLength: 6,
    },

    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },

    plugins: [
      jwt({
        jwt: {
          definePayload: ({ user }) => ({
            id: user.id,
            name: user.name,
            email: user.email,
          }),
        },
      }),
    ],
  });
}
