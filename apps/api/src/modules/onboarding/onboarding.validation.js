import { AppError } from '../../common/errors/AppError.js';

/**
 * Validates a step response against onboarding_steps.schema_json, a small
 * declarative shape: { fields: [{ key, type: 'string'|'number'|'boolean'|
 * 'array'|'object', required }] }. This is intentionally a minimal,
 * server-authoritative validator (not a full JSON-Schema/Zod compiler) —
 * every onboarding step author works within this shape, and it rejects any
 * response missing a required field or with a mismatched type.
 */
export function validateStepResponse(schemaJson, response) {
  const fields = Array.isArray(schemaJson?.fields) ? schemaJson.fields : [];
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new AppError('Step response must be an object', 422);
  }

  for (const field of fields) {
    const value = response[field.key];
    if (field.required && (value === undefined || value === null || value === '')) {
      throw new AppError(`Field "${field.key}" is required`, 422, { code: 'FIELD_REQUIRED', field: field.key });
    }
    if (value === undefined || value === null) continue;

    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (field.type && actualType !== field.type) {
      throw new AppError(`Field "${field.key}" must be of type ${field.type}`, 422, {
        code: 'FIELD_TYPE_MISMATCH',
        field: field.key,
      });
    }
  }

  return response;
}
