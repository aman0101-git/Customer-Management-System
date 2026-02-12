import { Request, Response } from "express";
import { db } from "../../config/db.js";
import * as AuthService from "./auth.service.js";

// LOGIN
export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  try {
    const result = await AuthService.login(username, password);

    res.cookie("token", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    res.status(200).json({ message: "Login successful" });
  } catch {
    res.status(401).json({ message: "Invalid credentials" });
  }
}

// GET CURRENT USER
export async function getMe(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [rows] = await db.query<any[]>(
    "SELECT id, first_name, last_name, username, role FROM users WHERE id = ?",
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(rows[0]);
}

// LOGOUT
export function logout(req: Request, res: Response) {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  res.status(200).json({ message: "Logged out" });
}

// CREATE USER (ADMIN / SUPERVISOR)
export async function createUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { firstName, lastName, username, password, role } = req.body;

  try {
    await AuthService.createUser(
      req.user.id,
      firstName,
      lastName,
      username,
      password,
      role
    );

    res.status(201).json({ message: "User created" });
  } catch (err: any) {
    res.status(400).json({ message: err.message || "Failed to create user" });
  }
}
