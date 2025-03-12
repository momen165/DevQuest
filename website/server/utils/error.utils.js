class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (err, req, res, next) => {
  console.error("Error:", err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Handle specific error types
  if (err.message.includes("Access denied")) {
    return res.status(403).json({ error: err.message });
  }

  if (err.message.includes("not found")) {
    return res.status(404).json({ error: err.message });
  }

  // Default error response
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  handleError,
  asyncHandler,
};
