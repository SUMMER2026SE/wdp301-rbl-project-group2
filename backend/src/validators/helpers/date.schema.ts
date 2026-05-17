import { isDateInFuture } from '@/utils/date';
import z from 'zod';

export const datePreprocess = z.preprocess((val: string | number) => {
  const date = new Date(val);
  if (!isNaN(date.getTime())) return date; // valid date

  return undefined;
}, z.date());

export const nonFutureDateSchema = datePreprocess.refine(
  (val: Date) => {
    return !isDateInFuture(val);
  },
  {
    message: 'Date cannot be in the future',
  }
);

export const nonPastDateSchema = datePreprocess.refine(
  (val: Date) => {
    return isDateInFuture(val);
  },
  {
    message: 'Date cannot be in the past',
  }
);
