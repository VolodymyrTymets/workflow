const  crypto = require('crypto');
const config = require('../../config');
const ALGORITHM = 'aes-256-ctr';

const encrypt = text => {
  const cipher = crypto.createCipher(ALGORITHM, config.secret);
  let crypted = cipher.update(text,'utf8','hex');
  crypted += cipher.final('hex');
  return crypted;
};

const decrypt = encrypted => {
  const decipher = crypto.createDecipher(ALGORITHM, config.secret);
  let dec = decipher.update(encrypted,'hex','utf8');
  dec += decipher.final('utf8');
  return dec;
};

module.exports = { encrypt, decrypt };