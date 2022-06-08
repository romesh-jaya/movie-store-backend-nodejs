const nodemailer = require('../../utils/nodemailer');

const sendEmailDBDown = async () => {
  try {
    const subject = `Your MongoDB Atlas instance seems to be down`;
    const emailBody = `Hi,
    The NodeJS Server in the app Movie Shop Backend cannot connect to your MongoDB Atlas instance. Please rectify.`;
    await nodemailer.sendEmail(
      process.env.DB_DOWN_EMAIL_ALERT_ADDRESS,
      emailBody,
      subject
    );
    console.log('DB down email sent');
  } catch (error) {
    // TODO: implement Sentry for this case.
    // Allow the API call to succeed. Don't block the flow for the email error
    console.error('Send email error: ', err.message);
  }
};

module.exports = {
  sendEmailDBDown,
};
