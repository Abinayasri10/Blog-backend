// routes/emailRoutes.js
import express from "express";
import sendEmail from "../utils/sendMail.js";

const router = express.Router();

router.post("/connect-request", async (req, res) => {
  try {
    const { mentorEmail, menteeName, menteeEmail } = req.body;

    if (!mentorEmail || !menteeName || !menteeEmail) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const subject = `New Connection Request from ${menteeName}`;
    const message = `
      Hello,
      
      ${menteeName} (${menteeEmail}) would like to connect with you through the mentorship program.
      
      Please reach out to them if you’re interested.
      
      Regards,
      BlogSpace Team
    `;

    await sendEmail(mentorEmail, subject, message);

    return res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending connection email:", error);
    res.status(500).json({ success: false, message: "Error sending email" });
  }
});

export default router;
