const nodemailer = require('nodemailer')

const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })
}

const baseLayout = (title, preheader, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; background-color: #0f1419; }
    a { color: #3b82f6; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .btn a { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0f1419;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${preheader}
  </div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0f1419;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" class="email-container" style="width:560px;max-width:560px;background-color:#1a2332;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#0d9488 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">
                Account Security
              </h1>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding:36px 40px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#94a3b8;text-align:center;border-top:1px solid #243044;">
              This is an automated message. If you did not request this, you can safely ignore this email.
              <br />
              &copy; ${new Date().getFullYear()} Auth Service
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

const buttonBlock = (url, label) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="btn" style="margin:28px auto;">
    <tr>
      <td align="center" style="border-radius:8px;background-color:#0d9488;">
        <a href="${url}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block;padding:14px 28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>
`

const linkFallback = (url) => `
  <p style="margin:0;font-size:13px;line-height:20px;color:#94a3b8;word-break:break-all;">
    Or copy and paste this link into your browser:<br />
    <a href="${url}" style="color:#38bdf8;">${url}</a>
  </p>
`

const buildVerificationEmail = ({ username, verifyUrl, expiresInHours }) => {
    const body = `
      <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#f8fafc;">Hi ${username},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#cbd5e1;">
        Thanks for signing up. Please verify your email address to activate your account.
        This link expires in <strong style="color:#f8fafc;">${expiresInHours} hour${expiresInHours === 1 ? '' : 's'}</strong>.
      </p>
      ${buttonBlock(verifyUrl, 'Verify Email Address')}
      ${linkFallback(verifyUrl)}
      <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#64748b;">
        After this link expires or is used once, you will need to request a new verification email.
      </p>
    `
    return {
        subject: 'Verify your email address',
        html: baseLayout('Verify your email', 'Confirm your email to activate your account.', body)
    }
}

const buildPasswordResetEmail = ({ username, resetUrl, expiresInMinutes }) => {
    const body = `
      <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#f8fafc;">Hi ${username},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#cbd5e1;">
        We received a request to reset your password. Click the button below to choose a new password.
        This link expires in <strong style="color:#f8fafc;">${expiresInMinutes} minute${expiresInMinutes === 1 ? '' : 's'}</strong>
        and can only be used once.
      </p>
      ${buttonBlock(resetUrl, 'Reset Password')}
      ${linkFallback(resetUrl)}
      <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#64748b;">
        If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      </p>
    `
    return {
        subject: 'Reset your password',
        html: baseLayout('Reset your password', 'Use this secure link to reset your password.', body)
    }
}

const sendEmail = async ({ to, subject, html }) => {
    const transporter = createTransporter()
    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        html
    })
    return info
}

const sendVerificationEmail = async ({ to, username, plainToken }) => {
    const apiUrl = process.env.API_URL || '/api/v1'
    const baseUrl = (process.env.BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
    const verifyUrl = `${baseUrl}${apiUrl}/verify-email?token=${plainToken}`
    const expiresMs = Number(process.env.EMAIL_VERIFICATION_EXPIRES_MS) || 86400000
    const expiresInHours = Math.max(1, Math.round(expiresMs / (60 * 60 * 1000)))
    const { subject, html } = buildVerificationEmail({ username, verifyUrl, expiresInHours })
    return sendEmail({ to, subject, html })
}

const sendPasswordResetEmail = async ({ to, username, plainToken }) => {
    const apiUrl = process.env.API_URL || '/api/v1'
    const baseUrl = (process.env.BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
    const resetUrl = `${baseUrl}${apiUrl}/reset-password?token=${plainToken}`
    const expiresMs = Number(process.env.PASSWORD_RESET_EXPIRES_MS) || 900000
    const expiresInMinutes = Math.max(1, Math.round(expiresMs / (60 * 1000)))
    const { subject, html } = buildPasswordResetEmail({ username, resetUrl, expiresInMinutes })
    return sendEmail({ to, subject, html })
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendEmail
}
