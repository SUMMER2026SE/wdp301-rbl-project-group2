import { FORBIDDEN } from "@/constants/http";
import { Role } from "@/types/user.type";
import appAssert from "@/utils/appAssert";
import { Request, RequestHandler, NextFunction, Response } from "express";

const authorize =
  (...allowedRoles: Role[]) =>
    (req: Request, res: Response, next: NextFunction) => {
      const role = req.role;
      appAssert(role, FORBIDDEN, "Not authorized");

      //check if role is allowed
      appAssert(
        allowedRoles.includes(role),
        FORBIDDEN,
        "Not authorized to access this route"
      );

      next();
    };

export default authorize;
