import { Request, NextFunction, Response } from 'express';

export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const catchErrors =
  (controller: AsyncController): AsyncController =>
  async (req, res, next) => {
    try {
      await controller(req, res, next);
    } catch (error) {
      next(error);
    }
  };
