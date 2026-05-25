import { UserModel } from '@/models';
import { ClientSession } from 'mongoose';

const MAX_USERNAME_LENGTH = 30;

const sanitizeUsername = (input: string) => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

export const generateUsernameFromEmail = async (
  email: string,
  session: ClientSession
) => {
  const emailPrefix = email.split('@')[0];

  let base = sanitizeUsername(emailPrefix).slice(0, MAX_USERNAME_LENGTH);

  let username = base;
  let counter = 1;

  while (await UserModel.exists({ username }).session(session)) {
    const suffix = `_${counter++}`;
    username = `${base.slice(0, MAX_USERNAME_LENGTH - suffix.length)}${suffix}`;
  }

  return username;
};
