import { readFileSync } from "node:fs";
import { EmailParams, MailerSend, Recipient, Sender } from "mailersend";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const apiKey = process.env.MAILERSEND_API_KEY;
const fromEmail = process.env.MAILERSEND_FROM_EMAIL;
const fromName = process.env.MAILERSEND_FROM_NAME || "iAM-check";
const toEmail = process.argv[2] ?? "jazzng@delettucebear.com";
const toName = process.argv[3] ?? "Client";

const text = [
  "Client Declaration Portal",
  "",
  "Sign in: https://iam-check.vercel.app",
  `Email: ${toEmail}`,
  "Temporary password: Yhi8h!nb",
  "",
  "First visit: complete onboarding, then open your assigned declaration.",
  "Change your password after your first sign-in.",
].join("\n");

const escaped = text
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");
const html = `<pre style="font-family: ui-sans-serif, system-ui, sans-serif; white-space: pre-wrap; line-height: 1.5;">${escaped}</pre>`;

const mailerSend = new MailerSend({ apiKey });
const emailParams = new EmailParams()
  .setFrom(new Sender(fromEmail, fromName))
  .setTo([new Recipient(toEmail, toName)])
  .setSubject("Your client portal access")
  .setText(text)
  .setHtml(html);

try {
  const result = await mailerSend.email.send(emailParams);
  console.log("Sent successfully");
  console.log("Status:", result.statusCode);
  console.log("To:", toEmail);
  console.log("From:", `${fromName} <${fromEmail}>`);
} catch (error) {
  console.error("Send failed");
  console.error(error?.body ?? error?.message ?? error);
  process.exit(1);
}
