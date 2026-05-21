import { z } from "zod";

// Zod schema to validate Login inputs
export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

// Zod schema to validate Sign Up inputs
export const SignUpSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name must be at least 3 characters.")
    .regex(/^[a-zA-Z\s]*$/, "Full name cannot contain special characters or digits."),
  email: z.string().email("Please enter a valid email address."),
  university: z.string().min(1, "University name is required."),
  githubUsername: z.string().min(1, "GitHub username is required."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Must contain at least one digit.")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character."),
  confirmPassword: z.string()
}).refine((data) => data.confirmPassword === data.password, {
  message: "Passwords do not match.",
  path: ["confirmPassword"]
});

// Zod schema to validate Password Reset inputs
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address.")
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
