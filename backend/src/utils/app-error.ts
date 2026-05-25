import AppErrorCode from "../constants/app-error-code";
import { HttpStatusCode } from "../constants/http";

export class AppError extends Error {
  constructor(
    public message: string, // === this.message = message
    public statusCode: HttpStatusCode,
    public errorCode?: AppErrorCode
  ) {
    super(message);
  }
}

export default AppError;
