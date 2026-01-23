const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, text }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: "gladyce15@ethereal.email",
      pass: "mnyuZxGq9XtVdQ154M",
    },
  });

  await transporter.sendMail({
    from: `"MakeupMuse Security" <gladyce15@ethereal.email>`,
    to,
    subject,
    text,
  });
};

module.exports = sendEmail;
