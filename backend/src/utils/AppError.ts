import AppErrorCode from "../constants/appErrorCode";
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
