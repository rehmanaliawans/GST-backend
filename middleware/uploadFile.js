const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.AWS_HA_SYSTEM_ACCESS_ID,
  secretAccessKey: process.env.AWS_HA_SYSTEM_SECRET_KEY,
});

exports.ToAWS = (req, res, next) => {
  const s3 = new AWS.S3();

  if (req.file) {
    const file = req?.file;
    const fileName = `${Date.now().toString()} - ${file?.originalname}`;
    const fileType = file?.mimetype;

    const bucketName = process.env.AWS_S3_DESIGN_BUCKET;
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ACL: "public-read",
      ContentType: fileType,
    };

    s3.upload(params, (err, data) => {
      if (err) {
        return res.status(500).json({
          error: err,
        });
      }
      req.body.logo = data.Location;

      next();
    });
  } else {
    next();
  }
};
