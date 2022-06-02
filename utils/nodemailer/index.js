const nodemailer = require('nodemailer');

const sendEmail = async (toEmail, body, subject) => {
  const emailAddress = process.env.EMAIL_ADDRESS;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailAddress || !emailPassword) {
    throw new Error('emailAddress and emailPassword must be specified');
  }

  const transporter = nodemailer.createTransport({
    service: 'yahoo',
    auth: {
      user: emailAddress,
      pass: emailPassword,
    },
  });

  const mailOptions = {
    from: `Ultra Movie Shop <${emailAddress}>`,
    to: toEmail,
    subject,
    html: body.replace(/\n/g, '<br/>'),
  };

  await transporter.sendMail(mailOptions);
  console.log('Email sent to: ' + toEmail);
};

module.exports = {
  sendEmail,
};
