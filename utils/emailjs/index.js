const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';
const fetch = require('node-fetch');

// Note: couldn't use the EmailJS library directly, as it has references to client DOM within it,
// thus throwing errors during runtime when used from within Cloud functions
// Using REST calls instead
const sendEmail = async (toEmail, body, subject) => {
  const emailJSTemplateId = process.env.EMAILJS_TEMPLATE_ID;
  const emailJSPublicKey = process.env.EMAILJS_PUBLIC_KEY;

  if (!emailJSTemplateId || !emailJSPublicKey) {
    throw new Error('emailJSTemplateId and emailJSPublicKey must be specified');
  }

  const templateParams = {
    message: body.replace(/\n/g, '<br/>'), // EmailJS only supports this format of line breaks
    to_email: toEmail,
    subject,
  };
  const params = {
    service_id: 'default_service',
    template_id: emailJSTemplateId,
    user_id: emailJSPublicKey,
    template_params: templateParams,
  };

  console.log('params', params);

  let response = await fetch(EMAILJS_ENDPOINT, {
    method: 'post',
    body: JSON.stringify(params),
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
};

module.exports = {
  sendEmail,
};
