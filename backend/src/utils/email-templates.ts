export const getPasswordResetTemplate = (url: string) => ({
  subject: 'Password Reset Request',
  text: `You requested a password reset. Click on the link to reset your password: ${url}`,
  html: `<!doctype html><html lang="en-US"><head><meta content="text/html; charset=utf-8" http-equiv="Content-Type"/><title>Reset Password Email Template</title><meta name="description" content="Reset Password Email Template."><style type="text/css">a:hover{text-decoration:underline!important}</style></head><body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0"><!--100%body table--><table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8" style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;"><tr><td><table style="background-color: #f2f3f8; max-width:670px;  margin:0 auto;" width="100%" border="0" align="center" cellpadding="0" cellspacing="0"><tr><td style="height:80px;">&nbsp;</td></tr><tr><td style="text-align:center;"></a></td></tr><tr><td style="height:20px;">&nbsp;</td></tr><tr><td><table width="95%" border="0" align="center" cellpadding="0" cellspacing="0" style="max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);"><tr><td style="height:40px;">&nbsp;</td></tr><tr><td style="padding:0 35px;"><h1 style="color:#1e1e2d; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;">You have requested to reset your password</h1><span style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span><p style="color:#455056; font-size:15px;line-height:24px; margin:0;">A unique link to reset your password has been generated for you. To reset your password, click the following link and follow the instructions.</p><a target="_blank" href="${url}" style="background:#2f89ff;text-decoration:none !important; font-weight:500; margin-top:24px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:50px;">Reset Password</a></td></tr><tr><td style="height:40px;">&nbsp;</td></tr></table></td><tr><td style="height:20px;">&nbsp;</td></tr><tr><td style="text-align:center;"><p style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">&copy;</p></td></tr><tr><td style="height:80px;">&nbsp;</td></tr></table></td></tr></table><!--/100%body table--></body></html>`,
});

export const getPasswordResetOTPtemplate = (code: string) => ({
  subject: 'Yêu cầu đặt lại mật khẩu FoodieDash',
  text: `Mã xác thực để đặt lại mật khẩu của bạn là: ${code}. Mã này sẽ hết hạn sau 15 phút.`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
      <h2 style="color: #ea580c; text-align: center;">Đặt lại mật khẩu FoodieDash</h2>
      <p>Chào bạn,</p>
      <p>Bạn đã yêu cầu đặt lại mật khẩu tài khoản tại <strong>FoodieDash</strong>. Vui lòng sử dụng mã xác thực dưới đây để hoàn tất việc đặt lại mật khẩu:</p>
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${code}</span>
      </div>
      <p>Mã này sẽ hết hạn sau <strong>15 phút</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ ngay với chúng tôi nếu bạn nghi ngờ có sự xâm nhập trái phép.</p>
      <hr style="border: 0; border-top: 1px solid #e1e1e1; margin: 20px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">Đây là email tự động, vui lòng không trả lời.</p>
    </div>
  `,
});

export const getVerifyEmailOTPtemplate = (code: string) => ({
  subject: 'Mã xác thực tài khoản FoodieDash',
  text: `Mã xác thực của bạn là: ${code}. Mã này sẽ hết hạn sau 15 phút.`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
      <h2 style="color: #ea580c; text-align: center;">Xác thực tài khoản FoodieDash</h2>
      <p>Chào bạn,</p>
      <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>FoodieDash</strong>. Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã xác thực dưới đây:</p>
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${code}</span>
      </div>
      <p>Mã này sẽ hết hạn sau <strong>15 phút</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
      <hr style="border: 0; border-top: 1px solid #e1e1e1; margin: 20px 0;">
      <p style="font-size: 12px; color: #6b7280; text-align: center;">Đây là email tự động, vui lòng không trả lời.</p>
    </div>
  `,
});

export const getVerifyEmailTemplate = (url: string) => ({
  subject: 'Verify Email Address',
  text: `Click on the link to verify your email address: ${url}`,
  html: `<!doctype html><html lang="en-US"><head><meta content="text/html; charset=utf-8" http-equiv="Content-Type"/><title>Verify Email Address Email Template</title><meta name="description" content="Verify Email Address Email Template."><style type="text/css">a:hover{text-decoration:underline!important}</style></head><body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0"><!--100%body table--><table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8" style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;"><tr><td><table style="background-color: #f2f3f8; max-width:670px;  margin:0 auto;" width="100%" border="0" align="center" cellpadding="0" cellspacing="0"><tr><td style="height:80px;">&nbsp;</td></tr><tr><td style="text-align:center;"></a></td></tr><tr><td style="height:20px;">&nbsp;</td></tr><tr><td><table width="95%" border="0" align="center" cellpadding="0" cellspacing="0" style="max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);"><tr><td style="height:40px;">&nbsp;</td></tr><tr><td style="padding:0 35px;"><h1 style="color:#1e1e2d; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;">Please verify your email address</h1><span style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span><p style="color:#455056; font-size:15px;line-height:24px; margin:0;">Click on the following link to verify your email address.</p><a target="_blank" href="${url}" style="background:#2f89ff;text-decoration:none !important; font-weight:500; margin-top:24px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:50px;">Verify Email Address</a></td></tr><tr><td style="height:40px;">&nbsp;</td></tr></table></td><tr><td style="height:20px;">&nbsp;</td></tr><tr><td style="text-align:center;"><p style="font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;">&copy;</p></td></tr><tr><td style="height:80px;">&nbsp;</td></tr></table></td></tr></table><!--/100%body table--></body></html>`,
});

export const getStaffInviteTemplate = (url: string, staff?: { fullName?: string; email?: string }) => {
  const displayName = staff?.fullName?.trim() || 'bạn';
  const emailLine = staff?.email ? `\n- Email đăng nhập: ${staff.email}` : '';

  return {
    subject: 'Chúc mừng bạn đã trở thành nhân viên FoodieDash!',
    text: `Xin chào ${displayName},

Chúc mừng bạn! Bạn đã được phê duyệt trở thành nhân viên tại FoodieDash.${emailLine}

Để bắt đầu làm việc, vui lòng mở liên kết sau để thiết lập mật khẩu cho tài khoản của bạn:
${url}

Liên kết này sẽ hết hạn sau 1 giờ vì lý do bảo mật.

Sau khi thiết lập mật khẩu, bạn có thể đăng nhập vào hệ thống FoodieDash bằng email của mình.

Chúc bạn có một hành trình làm việc thật hiệu quả và nhiều niềm vui cùng FoodieDash!

Trân trọng,
Đội ngũ FoodieDash`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 16px; background: #fffaf5; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #ea580c; text-align: center; margin: 0 0 16px;">🎉 Chúc mừng bạn đã trở thành nhân viên FoodieDash!</h2>
        <p>Xin chào <strong>${displayName}</strong>,</p>
        <p>Chúc mừng bạn! Bạn đã được phê duyệt trở thành nhân viên tại <strong>FoodieDash</strong>.</p>
        ${staff?.email ? `<p><strong>Email đăng nhập:</strong> ${staff.email}</p>` : ''}
        <p>Để bắt đầu làm việc, vui lòng thiết lập mật khẩu cho tài khoản của bạn bằng nút bên dưới:</p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${url}" style="background-color: #ea580c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 999px; display: inline-block; font-weight: 700;">
            Thiết lập mật khẩu
          </a>
        </p>
        <p>Liên kết này sẽ hết hạn sau <strong>1 giờ</strong> vì lý do bảo mật.</p>
        <p>Sau khi thiết lập mật khẩu, bạn có thể đăng nhập vào hệ thống FoodieDash bằng email của mình.</p>
        <p>Chúc bạn có một hành trình làm việc thật hiệu quả và nhiều niềm vui cùng FoodieDash!</p>
        <hr style="border: 0; border-top: 1px solid #fed7aa; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9a3412; text-align: center; margin: 0;">Đây là email tự động, vui lòng không trả lời.</p>
      </div>
    `,
  };
};
