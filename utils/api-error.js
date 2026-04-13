class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.isOperational = true;
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = "Bad Request") {
    return new ApiError(400, message);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }
  static notFound(message = "Not Found") {
    return new ApiError(404, message);
  }
  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }
  static tooManyRequests(message = "Too Many Requests") {
    return new ApiError(429, message);
  }
  static internalServerError(message = "Internal Server Error") {
    return new ApiError(500, message);
  }
}

export default ApiError;
