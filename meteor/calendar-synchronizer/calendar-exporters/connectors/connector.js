import { HTTP } from 'meteor/http';
import { Meteor } from 'meteor/meteor';

import { R } from 'meteor/hospohero:core';

/**
 * Base class for service calendar connector
 **/
class CalendarConnector {
  constructor(user) {
    this._user = user;
  }

  _servicePathFor(field) {
    return R.append(field, this._servicePath);
  }

  _isCalendarAllowed() {
    return R.path(this._servicePathFor('allowUseCalendar'), this._user);
  }

  // User -> Token
  _getAccessTokenByUser() {
    return R.path(this._servicePathFor('accessToken'), this._user);
  }

  /** Send request for API
   * @param accessToken {String}
   * @param type {String} (GET,POST...)
   * @param url {String}
   * @param data {Object}
   * @param errorHandler {function}
   **/
  _doRequestToService(accessToken, type, url, data, errorHandler) {
    try {
      const options = {
        headers: {
          Authorization: `Bearer ${accessToken}`, // authorization access token
        },
      };
      if (data) {
        if (data.params) {
          options.params = data.params;
        }
        if (data.headers) {
          Object.assign(options.headers, data.headers);
        }
        if (data.data) {
          options.data = data.data;
        }
      }
      return HTTP.call(type, url, options);
    } catch (error) {
      const requestInfo = {
        accessToken,
        type,
        url,
        data,
      };
      return errorHandler ? errorHandler(error, requestInfo) : error;
    }
  }

  _updateAccessToken() {
    return this._refreshTokenFunction && this._refreshTokenFunction(this._user);
  }

  /**
   * Try send Api request, if fail try update accessToken
   **/
  _doAccessTokenProofRequest(type, url, data) {
    const accessToken = this._getAccessTokenByUser();

    let result = this._doRequestToService(accessToken, type, url, data);

    if (result && result.message) { // we need to update token
      const updatedAccessToken = this._updateAccessToken();
      if (updatedAccessToken) {
        result = this._doRequestToService(updatedAccessToken,
          type, url, data, this._errorHandler.bind(this));
      } else {
        this._errorHandler(result, { accessToken, type, url, data });
      }
    }
    return result;
  }

  _getUserIdsbyEmails(emails = []) {
    return Meteor.users.find({ 'emails.address': { $in: emails } },
      { fields: { _id: 1 } }).map(user => user._id);
  }
}

export { CalendarConnector };
