const { v4: uuidv4 } = require("uuid");
const aws = require("aws-sdk");

const dotenv = require("dotenv");

dotenv.config({
  path: "../config.env",
});

aws.config.update({
  accessKeyId: process.env.AWS_HA_SYSTEM_ACCESS_ID,
  secretAccessKey: process.env.AWS_HA_SYSTEM_SECRET_KEY,
  region: process.env.AWS_S3_REGION,
});
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_HA_SYSTEM_ACCESS_ID,
  secretAccessKey: process.env.AWS_HA_SYSTEM_SECRET_KEY,
  region: process.env.AWS_S3_REGION,
  Bucket: process.env.AWS_S3_DESIGN_BUCKET,
  signatureVersion: "v4",
});

const generateCandidateJobUrls = (jobData) => {
  const id = uuidv4();

  const addfileQuestionGetUrls = [];

  if (jobData?.customQuestions?.addFileQuestion?.length > 0) {
    jobData.customQuestions.addFileQuestion.forEach((fileQuestion) => {
      const answerArray = new Array(fileQuestion.noOfFiles);

      for (let i = 0; i < fileQuestion.noOfFiles; i++) {
        answerArray[
          i
        ] = `https://${process.env.AWS_S3_DESIGN_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileQuestion.id}/${i}`;
      }

      addfileQuestionGetUrls.push({
        id: fileQuestion.id,
        question: fileQuestion.question,
        answer: answerArray,
      });
    });
  }

  const cvFileName = jobData.firstName + "-" + jobData.lastName + "-CV.pdf";
  const cvGetUrl = `https://${process.env.AWS_S3_DESIGN_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${id}/${cvFileName}`;

  let getUrls;
  if (addfileQuestionGetUrls?.length > 0) {
    getUrls = {
      cvGetUrl: cvGetUrl,
      addfileQuestionGetUrls,
    };
  } else {
    getUrls = {
      cvGetUrl: cvGetUrl,
    };
  }

  const addfileQuestionPutUrls = [];

  if (jobData?.customQuestions?.addFileQuestion?.length > 0) {
    jobData.customQuestions.addFileQuestion.forEach((fileQuestion) => {
      const answerArray = new Array(fileQuestion.noOfFiles);

      for (let i = 0; i < fileQuestion.noOfFiles; i++) {
        const params = {
          Bucket: process.env.AWS_S3_DESIGN_BUCKET,
          Key: `${fileQuestion.id}/${i}`,
          Expires: 60 * 5,
          ContentType: "application/*",
        };

        const URL = s3.getSignedUrl("putObject", params);
        answerArray[i] = URL;
      }

      addfileQuestionPutUrls.push({
        id: fileQuestion.id,
        question: fileQuestion.question,
        answer: answerArray,
      });
    });
  }

  const cvUrlParams = {
    Bucket: process.env.AWS_S3_DESIGN_BUCKET,
    Key: `${id}/${cvFileName}`,
    Expires: 60 * 5,
  };

  const cvUrl = s3.getSignedUrl("putObject", cvUrlParams);
  let putUrls;
  if (addfileQuestionPutUrls.length > 0) {
    putUrls = {
      cvPutUrl: cvUrl,
      addfileQuestionPutUrls,
    };
  } else {
    putUrls = {
      cvPutUrl: cvUrl,
    };
  }

  return {
    getUrls,
    putUrls,
  };
};

module.exports = {
  generateCandidateJobUrls,
};
