import nodemailer from "nodemailer";

const escapeHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Today";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "Today";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const createTransporter = () => {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

const buildWelcomeEmailHtml = (client) => {
  const fullName = (client.clientName || "there").trim();
  const firstName = escapeHtml(fullName.split(/\s+/)[0] || "there");
  const organizationName = escapeHtml(client.organizationName || "your team");
  const clientService = escapeHtml(client.clientService || "your upcoming project");
  const onboardingDate = escapeHtml(formatDate(client.onboardingDate));
  const engagementNote = client.isRecurringService
    ? `${escapeHtml(
        client.recurring_frequency === "Quaterly"
          ? "Quarterly"
          : client.recurring_frequency || "Ongoing"
      )} partnership`
    : "Project engagement";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Dextor MediaTech</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EFE9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1A1512;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F5EFE9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;width:100%;background-color:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid #EAE1D7;">

          <!-- Warm Letterhead -->
          <tr>
            <td style="padding:32px 36px 22px 36px;border-bottom:1px solid #F1EAE2;">
              <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#C79F6F;">
                Dextor MediaTech
              </p>
              <h1 style="margin:10px 0 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#111625;">
                So glad you&rsquo;re here, ${firstName}.
              </h1>
            </td>
          </tr>

          <!-- Personal Letter Body -->
          <tr>
            <td style="padding:28px 36px 32px 36px;">
              <p style="margin:0 0 16px 0;font-size:15.5px;line-height:1.75;color:#2D2722;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 16px 0;font-size:15.5px;line-height:1.75;color:#3D352E;">
                Welcome aboard! All of us at Dextor MediaTech are genuinely excited to start working with you and everyone at <strong>${organizationName}</strong>.
              </p>
              <p style="margin:0 0 20px 0;font-size:15.5px;line-height:1.75;color:#3D352E;">
                Starting a new partnership is always something we look forward to. We&rsquo;ve got your <strong>${clientService}</strong> (${engagementNote}) lined up from <strong>${onboardingDate}</strong>, and our team is already getting things ready on our end so everything feels effortless for you from day one.
              </p>

              <!-- Subtle Keepsake Note -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF7F4;border-left:3px solid #E8623A;border-radius:0 10px 10px 0;margin:22px 0;">
                <tr>
                  <td style="padding:14px 18px;font-size:14px;line-height:1.65;color:#4A4139;">
                    We&rsquo;ll reach out shortly to say hello properly and pick a good time for a quick kickoff chat. Until then, if there&rsquo;s anything on your mind—big or small—just hit reply to this email.
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 0 0;font-size:15.5px;line-height:1.75;color:#2D2722;">
                Here&rsquo;s to building great things together!
              </p>
              <p style="margin:18px 0 0 0;font-size:15px;line-height:1.6;color:#111625;">
                Warmly,<br />
                <strong style="color:#E8623A;">The Dextor MediaTech Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#FAF7F4;padding:18px 36px;border-top:1px solid #F1EAE2;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8C7E72;">
                Dextor MediaTech &bull; &copy; ${new Date().getFullYear()}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const buildWelcomeEmailText = (client) => {
  const fullName = (client.clientName || "there").trim();
  const firstName = fullName.split(/\s+/)[0] || "there";
  const organizationName = client.organizationName || "your team";
  const clientService = client.clientService || "your upcoming project";
  const onboardingDate = formatDate(client.onboardingDate);

  return [
    `Hi ${firstName},`,
    ``,
    `Welcome aboard! All of us at Dextor MediaTech are genuinely excited to start working with you and everyone at ${organizationName}.`,
    ``,
    `We've got your ${clientService} lined up from ${onboardingDate}, and our team is already getting things ready so everything feels effortless from day one.`,
    ``,
    `We'll reach out shortly to say hello properly and pick a good time for a quick kickoff chat. Until then, if there's anything on your mind, just hit reply to this email.`,
    ``,
    `Here's to building great things together!`,
    ``,
    `Warmly,`,
    `The Dextor MediaTech Team`,
  ].join("\n");
};

export const sendClientWelcomeEmail = async (client) => {
  if (!client?.clientEmail || !client.clientEmail.trim()) {
    return { sent: false, reason: "No client email provided" };
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.warn(
      "[Mailer] SMTP_USER / SMTP_PASS not configured. Skipping welcome email for:",
      client.clientEmail
    );
    return { sent: false, reason: "SMTP credentials not configured" };
  }

  const senderEmail = process.env.SMTP_USER || process.env.EMAIL_USER;
  const rawFrom = process.env.SMTP_FROM?.trim();
  const fromAddress =
    rawFrom && rawFrom.includes("<")
      ? rawFrom
      : `"Dextor MediaTech" <${senderEmail}>`;

  const info = await transporter.sendMail({
    from: fromAddress,
    to: client.clientEmail.trim(),
    subject: `Welcome to Dextor MediaTech, ${client.clientName || client.organizationName}!`,
    text: buildWelcomeEmailText(client),
    html: buildWelcomeEmailHtml(client),
  });

  return { sent: true, messageId: info.messageId };
};
