class ApiResponse {
  static send(res, statusCode, message, data) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static ok({ res, message, data = null }) {
    return this.send(res, 200, message, data);
  }

  static created({ res, message, data = null }) {
    return this.send(res, 201, message, data);
  }

  static noContent({ res }) {
    return res.status(204).send();
  }
}

export default ApiResponse;