export class ApiError extends Error {
  constructor(message, status = 400, code = 'bad_request') {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function requireString(value, name, { min = 1, max = 20000 } = {}) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(`"${name}" is required.`, 400, 'validation');
  }
  const v = value.trim();
  if (v.length < min) throw new ApiError(`"${name}" is too short.`, 400, 'validation');
  if (v.length > max) throw new ApiError(`"${name}" is too long (max ${max} characters).`, 400, 'validation');
  return v;
}

export function isValidObjectId(id) {
  return /^[a-fA-F0-9]{24}$/.test(String(id || ''));
}
