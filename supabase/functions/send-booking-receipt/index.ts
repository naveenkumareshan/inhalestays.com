import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReceiptEmailPayload {
  to: string;
  studentName: string;
  serialNumber?: string;
  propertyName?: string;
  seatOrBedNumber?: string | number;
  startDate?: string;
  endDate?: string;
  duration?: string;
  amount: number;
  discountAmount?: number;
  totalAmount: number;
  paymentMethod?: string;
  transactionId?: string;
  collectedByName?: string;
  advancePaid?: number;
  remainingDue?: number;
  bookingType: "reading_room" | "hostel" | "renewal" | "due_collection";
  securityDeposit?: number;
  lockerPrice?: number;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const getSubjectLine = (data: ReceiptEmailPayload) => {
  switch (data.bookingType) {
    case "due_collection":
      return `Payment Receipt - ${data.serialNumber || "InhaleStays"}`;
    case "renewal":
      return `Booking Renewal Confirmation - ${data.serialNumber || "InhaleStays"}`;
    case "hostel":
      return `Hostel Booking Confirmation - ${data.serialNumber || "InhaleStays"}`;
    default:
      return `Booking Confirmation - ${data.serialNumber || "InhaleStays"}`;
  }
};

const buildEmailHtml = (data: ReceiptEmailPayload): string => {
  const isDueCollection = data.bookingType === "due_collection";
  const title = isDueCollection ? "Payment Receipt" : "Booking Confirmation";

  const rows: string[] = [];
  if (data.serialNumber) rows.push(row("Receipt No.", data.serialNumber));
  rows.push(row("Student", data.studentName));
  if (data.propertyName) rows.push(row("Property", data.propertyName));
  if (data.seatOrBedNumber) rows.push(row(data.bookingType === "hostel" ? "Bed No." : "Seat No.", String(data.seatOrBedNumber)));
  if (data.startDate) rows.push(row("Start Date", formatDate(data.startDate)));
  if (data.endDate) rows.push(row("End Date", formatDate(data.endDate)));
  if (data.duration) rows.push(row("Duration", data.duration));

  // Price breakdown
  if (!isDueCollection) {
    rows.push(row("Base Amount", formatCurrency(data.amount)));
    if (data.lockerPrice && data.lockerPrice > 0) rows.push(row("Locker", formatCurrency(data.lockerPrice)));
    if (data.securityDeposit && data.securityDeposit > 0) rows.push(row("Security Deposit", formatCurrency(data.securityDeposit)));
    if (data.discountAmount && data.discountAmount > 0) rows.push(row("Discount", `- ${formatCurrency(data.discountAmount)}`));
    rows.push(rowBold("Total", formatCurrency(data.totalAmount)));
    if (data.advancePaid !== undefined && data.advancePaid > 0) {
      rows.push(row("Advance Paid", formatCurrency(data.advancePaid)));
    }
    if (data.remainingDue !== undefined && data.remainingDue > 0) {
      rows.push(rowHighlight("Remaining Due", formatCurrency(data.remainingDue)));
    }
  } else {
    rows.push(rowBold("Amount Paid", formatCurrency(data.totalAmount)));
  }

  if (data.paymentMethod) rows.push(row("Payment Method", data.paymentMethod));
  if (data.transactionId) rows.push(row("Transaction ID", data.transactionId));
  if (data.collectedByName) rows.push(row("Collected By", data.collectedByName));

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a1a2e;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">InhaleStays</h1>
          <p style="margin:4px 0 0;color:#a0a0b0;font-size:12px;">${title}</p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 16px;color:#333;font-size:14px;">Hi <strong>${data.studentName}</strong>,</p>
          <p style="margin:0 0 20px;color:#555;font-size:13px;">${isDueCollection ? "We have received your payment. Here are the details:" : "Thank you for your booking. Here is your receipt:"}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;">
            ${rows.join("")}
          </table>
          <p style="margin:24px 0 0;color:#888;font-size:11px;text-align:center;">This is an auto-generated receipt from InhaleStays. For any queries, please contact your property manager.</p>
        </td></tr>
        <tr><td style="background:#f9f9fb;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#aaa;font-size:10px;">© ${new Date().getFullYear()} InhaleStays. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

function row(label: string, value: string) {
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#666;font-size:12px;width:40%;">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#333;font-size:12px;font-weight:500;">${value}</td></tr>`;
}
function rowBold(label: string, value: string) {
  return `<tr style="background:#f9f9fb;"><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#333;font-size:13px;font-weight:700;">${label}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#1a1a2e;font-size:13px;font-weight:700;">${value}</td></tr>`;
}
function rowHighlight(label: string, value: string) {
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#dc2626;font-size:12px;font-weight:600;">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#dc2626;font-size:12px;font-weight:600;">${value}</td></tr>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ReceiptEmailPayload = await req.json();

    if (!payload.to || !payload.studentName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to, studentName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use Supabase's built-in email via auth.admin or a simple SMTP approach
    // For now, use the Lovable email API if available, otherwise log
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    const subject = getSubjectLine(payload);
    const html = buildEmailHtml(payload);

    // Try sending via Lovable email API
    if (LOVABLE_API_KEY) {
      const supabaseProjectId = SUPABASE_URL.replace("https://", "").replace(".supabase.co", "");
      const callbackUrl = `https://email.lovable.dev/api/send-email?projectId=${supabaseProjectId}`;
      
      const emailResponse = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          to: payload.to,
          subject,
          html,
          purpose: "transactional",
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("Email API error:", emailResponse.status, errorText);
        return new Response(
          JSON.stringify({ success: false, error: `Email API error: ${emailResponse.status}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Receipt email sent to ${payload.to} for ${payload.bookingType}`);
      return new Response(
        JSON.stringify({ success: true, message: "Email sent successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: log the email details
    console.log("LOVABLE_API_KEY not configured. Email not sent.", { to: payload.to, subject });
    return new Response(
      JSON.stringify({ success: false, error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-booking-receipt:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
