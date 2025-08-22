import {
  notificationService,
  EmailNotification,
  SMSNotification,
} from "@/services/NotificationService";

/**
 * Helper functions for common notification scenarios
 */

export interface LeadNotificationData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  intakeToken?: string;
  businessName?: string;
}

/**
 * Send initial intake notification to a lead
 */
export async function sendIntakeNotification(
  leadId: number,
  leadData: LeadNotificationData
) {
  const { firstName, lastName, email, phone, intakeToken, businessName } =
    leadData;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "there";
  const businessText = businessName ? ` for ${businessName}` : "";

  const intakeUrl = `${process.env.INTAKE_BASE_URL}/${intakeToken}`;

  const results = [];

  // Send email if available
  if (email && intakeToken) {
    const emailNotification: EmailNotification = {
      to: email,
      subject: "Complete Your MerchantFund Application",
      text: `Hi ${fullName},

Thank you for your interest in merchant funding${businessText}. To complete your application, please click the link below:

${intakeUrl}

This secure link will allow you to:
- Review and confirm your information
- Upload required documents
- Complete your application

If you have any questions, please don't hesitate to contact us.

Best regards,
Merchant Funding Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Complete Your MerchantFund Application</h2>
          <p>Hi ${fullName},</p>
          <p>Thank you for your interest in merchant funding${businessText}. To complete your application, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${intakeUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Application</a>
          </div>
          <p>This secure link will allow you to:</p>
          <ul>
            <li>Review and confirm your information</li>
            <li>Upload required documents</li>
            <li>Complete your application</li>
          </ul>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Merchant Funding Team</p>
        </div>
      `,
      leadId,
    };

    const emailResult = await notificationService.sendEmail(emailNotification);
    results.push({ type: "email", ...emailResult });
  }

  // Send SMS if available
  if (phone && intakeToken) {
    const smsNotification: SMSNotification = {
      to: phone,
      message: `Hi ${fullName}, complete your merchant funding application${businessText}: ${intakeUrl}`,
      leadId,
    };

    const smsResult = await notificationService.sendSMS(smsNotification);
    results.push({ type: "sms", ...smsResult });
  }

  return results;
}

/**
 * Send follow-up notification to a lead
 */
export async function sendFollowUpNotification(
  leadId: number,
  leadData: LeadNotificationData,
  followUpType: "3h" | "9h" | "24h" | "72h"
) {
  const { firstName, lastName, email, phone, intakeToken, businessName } =
    leadData;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "there";
  const businessText = businessName ? ` for ${businessName}` : "";

  const intakeUrl = `${process.env.INTAKE_BASE_URL}/${intakeToken}`;

  // Customize message based on follow-up type
  const getFollowUpMessage = (type: string) => {
    switch (type) {
      case "3h":
        return "We noticed you started your merchant funding application but haven't finished yet.";
      case "9h":
        return "Your merchant funding application is still waiting to be completed.";
      case "24h":
        return "Don't miss out on your merchant funding opportunity - complete your application today.";
      case "72h":
        return "Final reminder: Your merchant funding application expires soon.";
      default:
        return "Please complete your merchant funding application.";
    }
  };

  const followUpMessage = getFollowUpMessage(followUpType);
  const results = [];

  // Send email if available
  if (email && intakeToken) {
    const emailNotification: EmailNotification = {
      to: email,
      subject: "Reminder: Complete Your MerchantFund Application",
      text: `Hi ${fullName},

${followUpMessage}

Complete your application here: ${intakeUrl}

This will only take a few minutes and you can save your progress at any time.

Best regards,
Merchant Funding Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reminder: Complete Your Application</h2>
          <p>Hi ${fullName},</p>
          <p>${followUpMessage}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${intakeUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Now</a>
          </div>
          <p>This will only take a few minutes and you can save your progress at any time.</p>
          <p>Best regards,<br>Merchant Funding Team</p>
        </div>
      `,
      leadId,
    };

    const emailResult = await notificationService.sendEmail(emailNotification);
    results.push({ type: "email", ...emailResult });
  }

  // Send SMS if available
  if (phone && intakeToken) {
    const smsNotification: SMSNotification = {
      to: phone,
      message: `${followUpMessage} Complete your application${businessText}: ${intakeUrl}`,
      leadId,
    };

    const smsResult = await notificationService.sendSMS(smsNotification);
    results.push({ type: "sms", ...smsResult });
  }

  return results;
}

/**
 * Send status change notification to staff
 */
export async function sendStatusChangeNotification(
  leadId: number,
  leadData: LeadNotificationData,
  oldStatus: string,
  newStatus: string,
  changedBy: string
) {
  const { firstName, lastName, email, phone, businessName } = leadData;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
  const businessText = businessName ? ` (${businessName})` : "";

  // This would typically be sent to a staff notification email/SMS
  // For now, we'll log it - in a real implementation, you'd have staff notification preferences
  console.log(
    `Lead status changed: ${fullName}${businessText} - ${oldStatus} → ${newStatus} by ${changedBy}`
  );

  return { success: true, message: "Status change logged" };
}

/**
 * Validate notification configuration on startup
 */
export function validateNotificationConfig(): boolean {
  return notificationService.validateConfiguration();
}

/**
 * Get notification statistics for a lead
 */
export async function getLeadNotificationStats(leadId: number) {
  return notificationService.getNotificationStats(leadId);
}

/**
 * Get recent notification logs for monitoring
 */
export async function getRecentNotificationLogs(limit?: number) {
  return notificationService.getRecentNotifications(limit);
}
