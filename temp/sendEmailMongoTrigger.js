//send email Mongoo Trigger fucntion
exports = async function () {
  //attached mongoDb , DataBase name and collection name
  const mongodb = context.services
    .get("Cluster0")
    .db("myFirstDatabase")
    .collection("emails");

  //get a first 4 emails data which emailSent status false
  const emails = await mongodb.find({ emailSent: false }).limit(4).toArray();

  //if emails data fetch then
  if (emails.length > 0) {
    emails.forEach(async (oneEmail) => {
      await sendEmail({
        email: oneEmail.emailTo,
        subject: oneEmail.subject,
        template: oneEmail.template,
        replacements: oneEmail.replacements,
        emailFrom: oneEmail.emailFrom
      });
      await mongodb.updateOne(
        { _id: oneEmail._id },
        {
          $set: {
            emailSent: true
          }
        }
      );
      return true;
    });
  }
};
//get  html file from S3 url
const getHTMLFromUrl = function (url, callback) {
  const XMLHttpRequest = require("xhr2");
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
  const handlebars = require("handlebars");

  const promise = new Promise((resolve, reject) => {
    let mailOptions = {
      sender: { email: options.emailFrom },
      to: [{ email: options.email }],
      subject: options.subject
    };

    const emailRequest = async (mailOptions) => {
      const axios = require("axios");
      var config = {
        method: "post",
        url: "https://api.sendinblue.com/v3/smtp/email",
        headers: {
          "Content-Type": "application/json",

          //create a sendInBlue apiKey and paste below
          "api-key": { ADD_SENINBLUE_API_KEY }
        },
        data: JSON.stringify(mailOptions)
      };

      try {
        const res = await axios(config);
        const data = JSON.stringify(res.data);
        resolve();
      } catch (err) {
        reject();
      }
    };

    if (options.template) {
      //if user want to use template
      getHTMLFromUrl({ ADD_S3_HTML_URL }, (err, data) => {
        if (err !== null) {
          console.log("Something went wrong: " + err);
        } else {
          const template = handlebars.compile(data);
          const htmlToSend = template(options.replacements);
          mailOptions.htmlContent = htmlToSend;
          emailRequest(mailOptions);
        }
      });
    } else {
      //if user send simple Message
      mailOptions.textContent = options.message;
      emailRequest(mailOptions);
    }
  });
  return promise;
};
