const ResponseHandler = require("../modules/shared/response.handler");

describe("ResponseHandler", () => {
  const createResponseMock = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    return {
      res: { status },
      status,
      json,
    };
  };

  describe("success", () => {
    it("returns a success response with data", () => {
      const { res, status, json } = createResponseMock();

      const data = { id: "123" };

      ResponseHandler.success(
        res,
        data,
        "Created",
        201
      );

      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith({
        success: true,
        message: "Created",
        data,
      });
    });

    it("includes meta when provided", () => {
      const { res, json } = createResponseMock();

      const meta = {
        page: 1,
        total: 10,
      };

      ResponseHandler.success(
        res,
        { id: "123" },
        "Success",
        200,
        meta
      );

      expect(json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: { id: "123" },
        meta,
      });
    });

    it("omits data when data is null", () => {
      const { res, json } = createResponseMock();

      ResponseHandler.success(
        res,
        null,
        "Success"
      );

      expect(json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
      });
    });

    it("omits meta when meta is null", () => {
      const { res, json } = createResponseMock();

      ResponseHandler.success(
        res,
        { id: "123" },
        "Success",
        200,
        null
      );

      expect(json).toHaveBeenCalledWith({
        success: true,
        message: "Success",
        data: { id: "123" },
      });
    });
  });

  describe("error", () => {
    it("returns an error response with default values", () => {
      const { res, status, json } = createResponseMock();

      ResponseHandler.error(res);

      expect(status).toHaveBeenCalledWith(500);

      expect(json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal Server Error",
        },
      });
    });

    it("returns an error with custom code and status", () => {
      const { res, json } = createResponseMock();

      ResponseHandler.error(
        res,
        "Validation failed",
        400,
        "VALIDATION_ERROR"
      );

      expect(json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
        },
      });
    });

    it("includes error details when provided", () => {
      const { res, json } = createResponseMock();

      const details = {
        field: "title",
        reason: "Required",
      };

      ResponseHandler.error(
        res,
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        details
      );

      expect(json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details,
        },
      });
    });
  });
});