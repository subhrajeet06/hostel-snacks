const nodemailer = require('nodemailer');

const testEmail = async () => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
      user: 'hostelbite7@gmail.com',
      pass: 'ghevnbnjcpvnzdxp',
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"HostelBite" <hostelbite7@gmail.com>',
      to: 'brainblitz06@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email for testing reset password feature',
    });
    console.log('Success:', info.messageId);
  } catch (err) {
    console.error('Error:', err);
  }
};

testEmail();
