export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const notifications = Array.isArray(body?.notifications) ? body.notifications : [];

    const emailFrom = process.env.EMAIL_FROM_ADDRESS;
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM_NUMBER;

    let emailCount = 0;
    let smsCount = 0;
    const errors = [];

    for (const n of notifications) {
      if (n.email && emailFrom && sendgridKey) {
        const emailResp = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${sendgridKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: n.email, name: n.name || "" }] }],
            from: { email: emailFrom, name: "Incident Simulation Studio" },
            subject: `Incident Notification: ${body.scenarioTitle || "Simulation"}`,
            content: [{ type: "text/plain", value: n.message || "" }]
          })
        });
        if (emailResp.ok) emailCount += 1;
        else errors.push(`Email failed for ${n.email}`);
      }

      if (n.phone && twilioSid && twilioToken && twilioFrom) {
        const form = new URLSearchParams();
        form.set("To", n.phone);
        form.set("From", twilioFrom);
        form.set("Body", n.message || "");
        const smsResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: form.toString()
        });
        if (smsResp.ok) smsCount += 1;
        else errors.push(`SMS failed for ${n.phone}`);
      }
    }

    return res.status(200).json({
      ok: true,
      emailCount,
      smsCount,
      errors
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
