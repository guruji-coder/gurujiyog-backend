import plivo from "plivo";

const client = new plivo.Client(
  process.env.PLIVO_AUTH_ID!,
  process.env.PLIVO_AUTH_TOKEN!
);

export const sendSMS = async (phoneNumber: string, message: string) => {
  if (process.env.PLIVO_TRIAL_MODE === "true") {
    console.log(`[TRIAL] SMS to ${phoneNumber}: ${message}`);
    return { success: true, messageId: "trial-mode-" + Date.now() };
  }

  try {
    const response = await client.messages.create({
      src: process.env.PLIVO_PHONE_NUMBER || "GURUJIYOG",
      dst: phoneNumber,
      text: message,
    });
    return { success: true, messageId: response.messageUuid };
  } catch (error) {
    throw new Error("Failed to send SMS");
  }
};

export const sendOTPSMS = async (
  phoneNumber: string,
  otp: string,
  name?: string
) => {
  const message = `Hi${name ? ` ${name}` : ""}! Your GurujiYog verification code is: ${otp}. Valid for 10 minutes.`;
  return sendSMS(phoneNumber, message);
};

export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const phoneRegex = /^\+1\d{10}$/;
  return phoneRegex.test(phoneNumber.replace(/\s/g, ""));
};
