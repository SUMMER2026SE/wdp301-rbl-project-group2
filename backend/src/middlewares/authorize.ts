import { FORBIDDEN } from "@/constants/http";
import { Role } from "@/types/user.type";
import appAssert from "@/utils/app-assert";
import { Request, RequestHandler, NextFunction, Response } from "express";

const authorize =
  (...allowedRoles: Role[]) =>
    (req: Request, res: Response, next: NextFunction) => {
      const role = req.role;
      appAssert(role, FORBIDDEN, "Not authorized");

      const normalizedRole = role.toLowerCase();
      const normalizedAllowedRoles = allowedRoles.map((allowedRole) =>
        allowedRole.toLowerCase()
      );

      appAssert(
        normalizedAllowedRoles.includes(normalizedRole),
        FORBIDDEN,
        "Not authorized to access this route"
      );

      next();
    };

export default authorize;
