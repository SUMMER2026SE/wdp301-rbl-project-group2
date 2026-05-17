import { GOOGLE_APP_PASSWORD, GOOGLE_APP_USER } from '@/constants/env';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GOOGLE_APP_USER,
    pass: GOOGLE_APP_PASSWORD,
  },
});

export default transporter;
