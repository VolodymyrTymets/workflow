const AWS = require('aws-sdk');
const config = require('../config');


const fileName = link => {
  const names = link.split('/');
  return names[names.length - 1];
};

/**
 Provide insert single object via promise

 @param file || Files
 @return String -url of file
 **/

const uploadToS3 = file => new Promise(resolve => {
  const s3 = new AWS.S3({
    signatureVersion: 'v4',
    region: config.AS3.region,
  });

const fileS3Data = {
  Bucket: config.AS3.bucket,
  Key: `${config.AS3.dirName}/${file.name}`,
  Body: file.data,
  ACL: 'public-read',
  Expires: 60,
};

s3.upload(fileS3Data, (err, data) => {
  if (err) {
    throw new Error(err.message);
  }
  resolve(data.Location);
});
});

/**
 Provide remove single object via promise

 @param String
 **/
const deleteFromS3 = link => new Promise(resolve => {
  const fileS3Data = {
    Bucket: config.AS3.bucket,
    Key: `${config.AS3.dirName}/${fileName(link)}`,
  };
const s3 = new AWS.S3({
  signatureVersion: 'v4',
  region: config.AS3.region,
});

s3.deleteObject(fileS3Data, err => {
  if (err) {
    throw new Error(err.message);
  }
  return resolve();
});
});


module.exports =  { uploadToS3, deleteFromS3 };