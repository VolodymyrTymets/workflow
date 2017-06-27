const actions = require('./constants');

module.exports = {
  owner: [
    actions.INVITE_USER,
  ],
  user: [
    actions.UPLOAD_FILES,
  ],
  admin: [
    actions.ALL_RIGHT,
  ],
};
