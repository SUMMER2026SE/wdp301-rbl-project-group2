export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const ONE_HOUR_MS = 60 * 60 * 1000;

export const minutesFromNow = (minutes: number) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

export const daysFromNow = (days: number) => {
  return new Date(Date.now() + days * ONE_DAY_MS);
};

export const thirtyDaysFromNow = () => {
  return daysFromNow(30);
};

export const fifteenMinutesFromNow = () => {
  return minutesFromNow(15);
};

export const fiveMinutesAgo = () => {
  return new Date(Date.now() - 5 * 60 * 1000);
};
export const oneHourFromNow = () => {
  return new Date(Date.now() + 1 * ONE_HOUR_MS);
};

export const isDateInFuture = (val: Date) => {
  if (!val) return false;

  const today = new Date();

  const dateToCheck = new Date(val);

  return dateToCheck > today;
};
