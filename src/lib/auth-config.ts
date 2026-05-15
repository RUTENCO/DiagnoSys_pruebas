import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
                rememberMe: { label: "Remember me", type: "checkbox" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: {
                        role: {
                            select: {
                                name: true,
                                displayName: true,
                            },
                        },
                    },
                });

                if (!user) throw new Error("User not found");

                const isPasswordValid = await bcrypt.compare(
                    credentials.password,
                    user.password
                );

                if (!isPasswordValid) throw new Error("Invalid password");

                // Retornamos datos esenciales del usuario
                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.email,
                    rememberMe: credentials.rememberMe === "on",
                    role: user.role,
                };
            },
        }),
    ],

    pages: {
        signIn: "/auth/card",
    },

    session: {
        strategy: "jwt",
    },

    callbacks: {
        async jwt({ token, user }: { token: JWT; user?: import("next-auth").User }) {
            if (user) {
                token.id = user.id; // Agregar el ID del usuario al token
                token.role = user.role;
                token.rememberMe = !!user.rememberMe;
                token.exp =
                    Math.floor(Date.now() / 1000) +
                    (user.rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8); // 30 días o 8 horas
            }
            return token;
        },

        async session({
            session,
            token,
        }: {
            session: import("next-auth").Session;
            token: JWT;
        }) {
            if (token.id) {
                session.user.id = token.id as string; // Agregar el ID del usuario a la sesión
            }
            if (typeof token.exp === "number") {
                session.expires = new Date(token.exp * 1000).toISOString();
            }
            if (typeof token.rememberMe === "boolean") {
                session.user.rememberMe = token.rememberMe;
            }
            if (token.role) {
                session.user.role = token.role;
            }
            return session;
        },
    },

    secret: process.env.NEXTAUTH_SECRET,
};