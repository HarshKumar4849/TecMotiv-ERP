const { passwordVerfication } = require('../../../emailTemplate/emailVerfication');
const mailHandler = require('../../../handlers/mail');

const sendMail = async ({
  email,
  name,
  link,
  otp,
  idurar_app_email,
  subject = 'Verify your email | TecMotiv ERP',
  type = 'emailVerfication',
  emailToken,
}) => {
  return await mailHandler.send({
    to: email,
    subject,
    html: passwordVerfication({ name, link, otp }),
  });
};

module.exports = sendMail;
