import nodemailer from "nodemailer";

type SurveyInviteInput = {
  to: string;
  surveyTitle: string;
  surveyUrl: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? user;
  const fromName = process.env.SMTP_FROM_NAME ?? "Customer Feedback Portal";

  if (!host || !user || !pass || !fromEmail) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    fromEmail,
    fromName,
  };
}

export function isEmailConfigured() {
  return getSmtpConfig() !== null;
}

export async function sendSurveyInvitation(input: SurveyInviteInput) {
  const smtp = getSmtpConfig();

  if (!smtp) {
    throw new Error(
      "Email is not configured. Add SMTP settings from Neon Console → Auth → Email provider.",
    );
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  await transporter.sendMail({
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to: input.to,
    subject: `You're invited to share feedback: ${input.surveyTitle}`,
    text: [
      "Hello,",
      "",
      "We would like your feedback. Please take a short survey:",
      input.surveyUrl,
      "",
      "Thank you.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 8px;">We'd love your feedback</h2>
        <p style="color: #555;">Please take a moment to complete our short survey:</p>
        <p style="font-size: 18px; font-weight: 600;">${input.surveyTitle}</p>
        <p style="margin: 24px 0;">
          <a href="${input.surveyUrl}" style="background: #171717; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
            Open survey
          </a>
        </p>
        <p style="color: #777; font-size: 13px;">Or copy this link: ${input.surveyUrl}</p>
      </div>
    `,
  });
}

export function getAppBaseUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}
