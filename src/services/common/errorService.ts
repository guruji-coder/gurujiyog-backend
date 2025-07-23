export interface AppError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export class ErrorService {
  // Common error codes
  static readonly ERROR_CODES = {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
    NOT_FOUND: "NOT_FOUND",
    CONFLICT: "CONFLICT",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  };

  // Create validation error
  static createValidationError(message: string, details?: any): AppError {
    return {
      code: this.ERROR_CODES.VALIDATION_ERROR,
      message,
      details,
      statusCode: 400,
    };
  }

  // Create authentication error
  static createAuthenticationError(
    message: string = "Authentication failed"
  ): AppError {
    return {
      code: this.ERROR_CODES.AUTHENTICATION_ERROR,
      message,
      statusCode: 401,
    };
  }

  // Create authorization error
  static createAuthorizationError(message: string = "Access denied"): AppError {
    return {
      code: this.ERROR_CODES.AUTHORIZATION_ERROR,
      message,
      statusCode: 403,
    };
  }

  // Create not found error
  static createNotFoundError(resource: string): AppError {
    return {
      code: this.ERROR_CODES.NOT_FOUND,
      message: `${resource} not found`,
      statusCode: 404,
    };
  }

  // Create conflict error
  static createConflictError(message: string): AppError {
    return {
      code: this.ERROR_CODES.CONFLICT,
      message,
      statusCode: 409,
    };
  }

  // Create internal server error
  static createInternalError(
    message: string = "Internal server error",
    details?: any
  ): AppError {
    return {
      code: this.ERROR_CODES.INTERNAL_ERROR,
      message,
      details,
      statusCode: 500,
    };
  }

  // Create database error
  static createDatabaseError(message: string, details?: any): AppError {
    return {
      code: this.ERROR_CODES.DATABASE_ERROR,
      message,
      details,
      statusCode: 500,
    };
  }

  // Create external service error
  static createExternalServiceError(
    service: string,
    message: string
  ): AppError {
    return {
      code: this.ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      message: `${service} service error: ${message}`,
      statusCode: 502,
    };
  }

  // Handle and log error
  static handleError(error: any, context?: string): AppError {
    console.error(`Error in ${context || "unknown context"}:`, error);

    // If it's already an AppError, return it
    if (error.code && error.message) {
      return error;
    }

    // Handle different types of errors
    if (error.name === "ValidationError") {
      return this.createValidationError("Validation failed", error.errors);
    }

    if (error.name === "CastError") {
      return this.createNotFoundError("Resource");
    }

    if (error.code === 11000) {
      return this.createConflictError("Resource already exists");
    }

    if (error.name === "JsonWebTokenError") {
      return this.createAuthenticationError("Invalid token");
    }

    if (error.name === "TokenExpiredError") {
      return this.createAuthenticationError("Token expired");
    }

    // Default internal error
    return this.createInternalError(error.message || "Unknown error occurred");
  }

  // Format error response for API
  static formatErrorResponse(error: AppError): any {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details }),
      },
    };
  }

  // Check if error is retryable
  static isRetryableError(error: AppError): boolean {
    const retryableCodes = [
      this.ERROR_CODES.INTERNAL_ERROR,
      this.ERROR_CODES.DATABASE_ERROR,
      this.ERROR_CODES.EXTERNAL_SERVICE_ERROR,
    ];
    return retryableCodes.includes(error.code);
  }

  // Get appropriate HTTP status code
  static getStatusCode(error: AppError): number {
    return error.statusCode || 500;
  }
}
