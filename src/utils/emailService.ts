import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key");

resend.domains.create({ name: "no-reply@gurujiyog.com" });

export const sendOTPEmail = async (
  email: string,
  otp: string,
  name?: string
) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
    return { success: true, messageId: "dev-mode" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "no-reply@gurujiyog.com",
      to: [email],
      subject: "Your GurujiYog Login Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D97706; margin: 0;">GurujiYog</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Your Login Code</h2>
            ${name ? `<p style="color: #666; margin-bottom: 20px;">Hi ${name},</p>` : ""}
            <p style="color: #666; margin-bottom: 30px;">Use this code to complete your login:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #D97706; letter-spacing: 5px;">${otp}</span>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              © 2024 GurujiYog. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      throw new Error("Failed to send email");
    }
    console.log({ success: true, messageId: data?.id });
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email service error:", error);
    throw new Error("Failed to send email");
  }
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
