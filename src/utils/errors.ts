/**
 * Error de negocio esperado (validación, entidad inexistente).
 * Se distingue de un error inesperado para poder mostrar su mensaje tal cual.
 */
export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code = 'app_error') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/** Error de validación de formulario, con el detalle por campo. */
export class ValidationError extends AppError {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super('Revisa los campos marcados.', 'validation_error');
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Convierte cualquier valor lanzado en un mensaje presentable.
 * Los errores inesperados se registran en consola y se muestran genéricos:
 * al usuario no le sirve leer un stack de SQLite.
 */
export function toUserMessage(
  error: unknown,
  fallback = 'Algo salió mal. Inténtalo de nuevo.',
): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    console.error('[Launchpad] Error inesperado:', error);
    return fallback;
  }
  console.error('[Launchpad] Error desconocido:', error);
  return fallback;
}
