export class RequestValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RequestValidationError";
    this.status = status;
  }
}

export const readJsonBody = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new RequestValidationError("Payload non valido.");
  }
};

type StringOptions = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

export const expectString = (
  value: unknown,
  label: string,
  options: StringOptions = {},
) => {
  const {
    required = true,
    minLength = 0,
    maxLength = Number.POSITIVE_INFINITY,
  } = options;

  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    if (required) {
      throw new RequestValidationError(`${label} mancante.`);
    }
    return "";
  }

  if (normalized.length < minLength) {
    throw new RequestValidationError(
      `${label} troppo corto. Minimo ${minLength} caratteri.`,
    );
  }

  if (normalized.length > maxLength) {
    throw new RequestValidationError(
      `${label} troppo lungo. Massimo ${maxLength} caratteri.`,
    );
  }

  return normalized;
};

export const expectOptionalString = (
  value: unknown,
  label: string,
  options: Omit<StringOptions, "required"> = {},
) => {
  const normalized = expectString(value, label, { ...options, required: false });
  return normalized || undefined;
};

export const expectBoolean = (
  value: unknown,
  label: string,
  fallback?: boolean,
) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new RequestValidationError(`${label} non valido.`);
};

export const expectNumber = (
  value: unknown,
  label: string,
  options: {
    integer?: boolean;
    min?: number;
    max?: number;
  } = {},
) => {
  const { integer = false, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } =
    options;

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    throw new RequestValidationError(`${label} non valido.`);
  }

  if (integer && !Number.isInteger(parsed)) {
    throw new RequestValidationError(`${label} deve essere un intero.`);
  }

  if (parsed < min || parsed > max) {
    throw new RequestValidationError(`${label} fuori intervallo.`);
  }

  return parsed;
};

export const expectEnum = <T extends string>(
  value: unknown,
  label: string,
  allowedValues: readonly T[],
) => {
  if (typeof value !== "string" || !allowedValues.includes(value as T)) {
    throw new RequestValidationError(`${label} non valido.`);
  }

  return value as T;
};
