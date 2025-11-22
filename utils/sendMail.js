// utils/sendMail.js
import nodemailer from "nodemailer";

const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: 'abinayajegadeeshwaran@gmail.com', // your gmail
      pass: 'tkve tklx gkgn dqmq', // your app password
    },
  });

  await transporter.sendMail({
    from: `"BlogSpace- Blogging Platform" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
};

export default sendEmail;
