import transporter from '@/config/nodemailer';
import { GOOGLE_APP_USER } from '@/constants/env';

type Params = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export const sendMail = async ({ to, subject, text, html }: Params) => {
  try {
    const info = await transporter.sendMail({
      from: GOOGLE_APP_USER,
      to: to,
      subject,
      text,
      html,
    });

    return { info };
  } catch (error) {
    return { error };
  }
};
