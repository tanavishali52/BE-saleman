/**
 * Reusable HTML email templates.
 */

exports.passwordResetTemplate = (code) => `
<div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px 0;">
  <div style="max-width:500px;margin:auto;background:#ffffff;
              border-radius:10px;padding:30px;text-align:center;
              box-shadow:0 5px 15px rgba(0,0,0,0.05);">

    <h2 style="color:#111827;margin-bottom:10px;">
      Password Reset Request
    </h2>

    <p style="color:#6b7280;font-size:15px;">
      We received a request to reset your password.
      Use the verification code below:
    </p>

    <div style="margin:25px 0;">
      <span style="
        display:inline-block;
        font-size:30px;
        letter-spacing:8px;
        font-weight:bold;
        background:#eef2ff;
        padding:12px 25px;
        border-radius:8px;
        color:#4f46e5;
      ">
        ${code}
      </span>
    </div>

    <p style="color:#9ca3af;font-size:14px;">
      This code will expire in 10 minutes.
    </p>

    <hr style="margin:25px 0;border:none;border-top:1px solid #e5e7eb;" />

    <p style="font-size:12px;color:#9ca3af;">
      If you did not request this, you can safely ignore this email.
    </p>

  </div>
</div>
`;
