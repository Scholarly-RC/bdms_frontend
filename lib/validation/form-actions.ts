import { z } from "zod";

const nonEmptyString = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, { message: "Required" })
    .max(maxLength, { message: `Must be at most ${maxLength} characters` });

export const loginFormSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(1, { message: "Required" }),
});

export const barangayProfileFormSchema = z.object({
  province: nonEmptyString(120),
  municipality: nonEmptyString(120),
  barangay: nonEmptyString(120),
});

export const createFormProcessFormSchema = z.object({
  title: nonEmptyString(160),
  formIds: z.array(nonEmptyString(255)).min(1),
  context: nonEmptyString(3000),
});

export const createFormFormSchema = z.object({
  name: nonEmptyString(120),
  description: z.string().trim().max(500).optional().default(""),
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, { message: "File is required" })
    .refine((file) => file.name.toLowerCase().endsWith(".pdf"), {
      message: "Only PDF files are allowed",
    })
    .refine((file) => file.type === "" || file.type === "application/pdf", {
      message: "Only PDF files are allowed",
    }),
});

export const deleteFormSchema = z.object({
  formId: z.uuid(),
});

export const deleteFormProcessSchema = z.object({
  processId: z.uuid(),
});

export const addFormToProcessSchema = z.object({
  processId: z.uuid(),
  formId: z.uuid(),
});
