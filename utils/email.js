const handlebars = require("handlebars");
const axios = require("axios");
const XMLHttpRequest = require("xhr2");

const getHTMLFromUrl = function (url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = "html";
  xhr.onload = function () {
    var status = xhr.status;
    if (status === 200) {
      if (xhr.response === "") {
        callback(null, "empty response");
      } else {
        callback(null, xhr.response);
      }
    } else {
      callback(status, xhr.response);
    }
  };
  xhr.send();
};

const sendEmail = async (options) => {
  const promise = new Promise((resolve, reject) => {
    let mailOptions = {
      sender: { email: options.emailFrom },
      to: [{ email: options.email }],
      subject: options.subject
    };
    console.log("mailOptions", mailOptions);

    const emailRequest = async (mailOptions) => {
      var config = {
        method: "post",
        url: "https://api.sendinblue.com/v3/smtp/email",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.SEND_IN_BLUE_API_KEY
        },
        data: JSON.stringify(mailOptions)
      };

      try {
        await axios(config);
        console.log("Email sent successfully");
        resolve();
      } catch (err) {
        reject();
        console.log("Error in sending email", err);
      }
    };

    if (options.template) {
      getHTMLFromUrl(
        `https://ha-files-upload.s3.us-west-2.amazonaws.com/emailTemplates/${options.template}.html`,
        (err, html) => {
          if (html) {
            const template = handlebars.compile(html);
            const htmlToSend = template(options.replacements);
            mailOptions.htmlContent = htmlToSend;
            emailRequest(mailOptions);
          }
        }
      );
    } else {
      mailOptions.textContent = options.message;
      emailRequest(mailOptions);
    }
  });
  return promise;
};

module.exports = sendEmail;
