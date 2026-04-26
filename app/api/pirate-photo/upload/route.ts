import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getProfileData, updateProfileContact } from "@/lib/cooperto/service";
import type { ProfileResponse, ProfileUpdateInput } from "@/lib/cooperto/types";
import { sendTransactionalEmail } from "@/lib/email/smtp";
import { piratePhotoPublicConfig } from "@/lib/pirate-photo/config";
import { piratePhotoServerConfig } from "@/lib/pirate-photo/server-config";
import type { PiratePhotoUploadResponse } from "@/lib/pirate-photo/types";
import {
  isValidProfileEmail,
  normalizeProfileEmail,
  validateProfileUpdateInput,
} from "@/lib/profile/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const extensionAliases: Record<string, string> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  heic: "heic",
  heif: "heif",
};

const readFormValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const sanitizeNamePart = (value: string) => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "pirata";
};

const getFileExtension = (fileName: string) => {
  const baseName = path.basename(fileName);
  const extension = path.extname(baseName).replace(".", "").toLowerCase();
  return extensionAliases[extension] ? extension : "";
};

const detectImageKind = (buffer: Buffer) => {
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    if (brand.startsWith("hei") || brand.startsWith("mif")) {
      return brand.startsWith("heif") ? "heif" : "heic";
    }
  }

  return "";
};

const validatePhotoFile = async (file: File) => {
  const extension = getFileExtension(file.name);

  if (
    !extension ||
    !piratePhotoPublicConfig.monthPhotoAllowedExtensions.includes(
      extension as (typeof piratePhotoPublicConfig.monthPhotoAllowedExtensions)[number],
    )
  ) {
    throw new Error("Formato foto non supportato. Usa JPG, PNG, WEBP, HEIC o HEIF.");
  }

  if (file.type && !allowedMimeTypes.has(file.type)) {
    throw new Error("Formato foto non supportato. Usa JPG, PNG, WEBP, HEIC o HEIF.");
  }

  if (file.size <= 0) {
    throw new Error("Carica una foto valida.");
  }

  if (file.size > piratePhotoPublicConfig.maxUploadBytes) {
    throw new Error("La foto supera il limite di 5 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedKind = detectImageKind(buffer);
  const normalizedExtension = extensionAliases[extension];

  if (!detectedKind || !normalizedExtension) {
    throw new Error("Il file non sembra una foto valida.");
  }

  const extensionMatches =
    detectedKind === normalizedExtension ||
    (detectedKind === "heic" && normalizedExtension === "heif") ||
    (detectedKind === "heif" && normalizedExtension === "heic");

  if (!extensionMatches) {
    throw new Error("Estensione e contenuto della foto non coincidono.");
  }

  return { buffer, extension };
};

const getMonthDirectoryName = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const buildSafeUploadPath = async ({
  firstName,
  lastName,
  extension,
  buffer,
}: {
  firstName: string;
  lastName: string;
  extension: string;
  buffer: Buffer;
}) => {
  const now = new Date();
  const uploadRoot = path.resolve(piratePhotoServerConfig.uploadDir);
  const monthDirectory = path.resolve(uploadRoot, getMonthDirectoryName(now));

  if (
    monthDirectory !== uploadRoot &&
    !monthDirectory.startsWith(`${uploadRoot}${path.sep}`)
  ) {
    throw new Error("Percorso upload non valido.");
  }

  await mkdir(monthDirectory, { recursive: true });

  const fileName = [
    now.getTime(),
    sanitizeNamePart(firstName),
    sanitizeNamePart(lastName),
    randomBytes(5).toString("hex"),
  ].join("-");
  const finalFileName = `${fileName}.${extension}`;
  const filePath = path.resolve(monthDirectory, finalFileName);

  if (!filePath.startsWith(`${monthDirectory}${path.sep}`)) {
    throw new Error("Percorso file non valido.");
  }

  await writeFile(filePath, buffer);

  return {
    fileName: finalFileName,
    filePath,
  };
};

const resolveExistingProfile = async ({
  contactCode,
  email,
}: {
  contactCode: string;
  email: string;
}) => {
  if (contactCode) {
    const profile = await getProfileData("contactCode", contactCode);
    if (profile.contact?.CodiceContatto?.trim()) {
      return profile;
    }
  }

  if (email && isValidProfileEmail(email)) {
    const profile = await getProfileData("email", email);
    if (profile.contact?.CodiceContatto?.trim()) {
      return profile;
    }
  }

  return null;
};

const buildProfilePayload = (formData: FormData): ProfileUpdateInput => ({
  firstName: cleanText(readFormValue(formData, "firstName")),
  lastName: cleanText(readFormValue(formData, "lastName")),
  email: normalizeProfileEmail(readFormValue(formData, "email")),
  phone: cleanText(readFormValue(formData, "phone")),
  marketingConsent: true,
});

const getProfileForSubmission = async (formData: FormData) => {
  const contactCode = cleanText(readFormValue(formData, "contactCode"));
  const email = normalizeProfileEmail(readFormValue(formData, "email"));
  const existingProfile = await resolveExistingProfile({ contactCode, email });

  if (existingProfile?.contact) {
    return existingProfile;
  }

  const profilePayload = buildProfilePayload(formData);
  const validationError = validateProfileUpdateInput(profilePayload);

  if (validationError) {
    throw new Error(validationError);
  }

  return updateProfileContact(profilePayload);
};

const buildNotificationEmail = ({
  profile,
  fileName,
  filePath,
  receivedAt,
}: {
  profile: ProfileResponse;
  fileName: string;
  filePath: string;
  receivedAt: Date;
}) => {
  const contact = profile.contact;
  const firstName = cleanText(contact?.Nome ?? "");
  const lastName = cleanText(contact?.Cognome ?? "");
  const email = normalizeProfileEmail(contact?.Email);
  const phone = cleanText(contact?.Telefono ?? "");
  const contactCode = cleanText(contact?.CodiceContatto ?? "");
  const safeFirstName = escapeHtml(firstName);
  const safeLastName = escapeHtml(lastName);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone);
  const safeContactCode = escapeHtml(contactCode || "Non disponibile");
  const safeFileName = escapeHtml(fileName);
  const receivedAtLabel = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(receivedAt);

  const text = [
    "Nuovo Scatto del Mese Tortuga.",
    "",
    `Nome: ${firstName}`,
    `Cognome: ${lastName}`,
    `Email: ${email}`,
    `Telefono: ${phone}`,
    `Codice contatto: ${contactCode || "Non disponibile"}`,
    `Data/ora: ${receivedAtLabel}`,
    `File: ${fileName}`,
  ].join("\n");

  const html = `
    <p>Nuovo <strong>Scatto del Mese Tortuga</strong>.</p>
    <ul>
      <li><strong>Nome:</strong> ${safeFirstName}</li>
      <li><strong>Cognome:</strong> ${safeLastName}</li>
      <li><strong>Email:</strong> ${safeEmail}</li>
      <li><strong>Telefono:</strong> ${safePhone}</li>
      <li><strong>Codice contatto:</strong> ${safeContactCode}</li>
      <li><strong>Data/ora:</strong> ${receivedAtLabel}</li>
      <li><strong>File:</strong> ${safeFileName}</li>
    </ul>
  `;

  return {
    subject: `Scatto del Mese Tortuga - ${firstName} ${lastName}`.trim(),
    text,
    html,
    attachments: [
      {
        filename: fileName,
        path: filePath,
      },
    ],
  };
};

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload non valido." }, { status: 400 });
  }

  const rawPhoto = formData.get("photo");

  if (!(rawPhoto instanceof File)) {
    return NextResponse.json({ error: "Carica una foto." }, { status: 400 });
  }

  try {
    const { buffer, extension } = await validatePhotoFile(rawPhoto);
    const profile = await getProfileForSubmission(formData);

    if (!profile.contact?.CodiceContatto?.trim()) {
      return NextResponse.json(
        { error: "Non sono riuscito ad agganciare la foto a un contatto Cooperto." },
        { status: 400 },
      );
    }

    const firstName = cleanText(profile.contact.Nome ?? "");
    const lastName = cleanText(profile.contact.Cognome ?? "");
    const { fileName, filePath } = await buildSafeUploadPath({
      firstName,
      lastName,
      extension,
      buffer,
    });

    const email = buildNotificationEmail({
      profile,
      fileName,
      filePath,
      receivedAt: new Date(),
    });

    await sendTransactionalEmail({
      to: piratePhotoServerConfig.notifyEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachments: email.attachments,
    });

    const response: PiratePhotoUploadResponse = {
      status: "success",
      message: "Foto ricevuta, pirata.",
      fileName,
      contactCode: profile.contact.CodiceContatto,
      profile,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Non sono riuscito a ricevere la foto.",
      },
      { status: 400 },
    );
  }
}
