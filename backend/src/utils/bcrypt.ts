import bcrypt from "bcrypt";

export const hashValue = async (value: string, saltRounds?: number) => {
  return await bcrypt.hash(value, saltRounds || 8);
};

export const compareValue = async (value: string, hash: string) => {
  return await bcrypt.compare(value, hash).catch(() => false);
};
