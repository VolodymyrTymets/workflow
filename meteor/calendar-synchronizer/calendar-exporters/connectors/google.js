import { moment, logger, R } from 'meteor/hospohero:core';
import { Meteor } from 'meteor/meteor';

import { CalendarConnector } from './connector';
import { ServiceAccessToken } from 'meteor/hospohero:services-tokens';

import { Areas } from 'meteor/hospohero:users';

/**
 * Google calendar connector,
 * communicate via api: https://developers.google.com/google-apps/calendar/v3/reference/
 **/
class GoogleConnector extends CalendarConnector {
  constructor(user) {
    super(user);
    this._servicePath = ['services', 'google'];
    this._refreshTokenFunction = ServiceAccessToken.refreshForGoogle;
  }

  _getCalendarId() {
    return R.path(this._servicePathFor('email'), this._user);
  }

  _getBaseApiUrl() {
    return `https://www.googleapis.com/calendar/v3/calendars/${this._getCalendarId()}/events`;
  }

  _getEventApiUrl(id) {
    return `${this._getBaseApiUrl()}/${id || ''}`;
  }

  _getNextSyncToken() {
    return R.path(this._servicePathFor('nextSyncToken'), this._user);
  }

  _setNextSyncToken(nextSyncToken) {
    Meteor.users.update({ _id: this._user._id },
      { $set: { 'services.google.nextSyncToken': nextSyncToken } });
  }
  /**
   * Handle response error here
   * @param error {Response object}
   * @param requestInfo.accessToken {String}
   * @param requestInfo.type {String} (GET,POST...)
   * @param requestInfo.url {String}
   * @param requestInfo.data {Object}
   **/
  _errorHandler(error, requestInfo) {
    const responseErrorData = R.path(['response', 'data', 'error'], error);

    if (responseErrorData) {
      const code = responseErrorData.code;

      if (code === 401 || code === 403) { // we need update token
        throw new Meteor.Error(code, responseErrorData.message);
      }

      if (code === 404 || code === 410) { // continue
        return true;
      }
      this._logError(`[${code}] in ${requestInfo.type} -> ${requestInfo.url}`);
      throw new Meteor.Error(responseErrorData.code, responseErrorData.message);
    } else {
      const httpErr = error.response;
      this._logError(`http [${httpErr.statusCode}] in ${requestInfo.type} -> ${requestInfo.url}`);
      throw new Meteor.Error(httpErr.statusCode, httpErr.content);
    }
  }

  _logError(message) {
    logger.error(`Google connector: ${message}`);
  }

  /**
   * Public Api
   **/

  insert(data) {
    if (this._isCalendarAllowed()) {
      const url = this._getEventApiUrl();
      const result = this._doAccessTokenProofRequest('POST', url, { data });
      return R.path(['data', 'id'], result);
    }
    return false;
  }

  update(data, id) {
    if (this._isCalendarAllowed()) {
      const url = this._getEventApiUrl(id);
      const result = this._doAccessTokenProofRequest('PUT', url, { data });
      return R.path(['data', 'id'], result);
    }
    return false;
  }

  remove(id) {
    if (this._isCalendarAllowed()) {
      const url = this._getEventApiUrl(id);
      this._doAccessTokenProofRequest('DELETE', url);
      return true;
    }
    return false;
  }

  importation() {
    if (this._isCalendarAllowed()) {
      const url = this._getEventApiUrl();
      let nextSyncToken = this._getNextSyncToken();
      const data = { params: { singleEvents: true } };
      if (!nextSyncToken) {
        // first time get nextSyncToken
        let result = this._doAccessTokenProofRequest('GET', url, data);
        nextSyncToken = R.path(['data', 'nextSyncToken'], result);

        while (!nextSyncToken) {
          const nextData = {
            params: {
              singleEvents: true,
              pageToken: R.path(['data', 'nextPageToken'], result),
            },
          };
          result = this._doAccessTokenProofRequest('GET', url, nextData);
          nextSyncToken = R.path(['data', 'nextSyncToken'], result);
        }
        if (nextSyncToken) {
          this._setNextSyncToken(nextSyncToken);
        }
      } else {
        data.params.syncToken = nextSyncToken;
        const result = this._doAccessTokenProofRequest('GET', url, data);
        nextSyncToken = R.path(['data', 'nextSyncToken'], result);
        this._setNextSyncToken(nextSyncToken);
        return R.path(['data', 'items'], result);
      }
    }
    return false;
  }

  getImportedItems(events, collection) {
    const condition = event => !!collection.findOne({ googleCalendarEventId: event.id });
    return R.filter(condition, events);
  }

  getNotImportedItems(events, collection) {
    const condition = event => !collection.findOne({ googleCalendarEventId: event.id });
    return R.filter(condition, events);
  }

  importEventToMeeting(event) {
    if (event.status !== 'cancelled') {
      const currentUser = this._user;
      if (currentUser) {
        const area = Areas.findOne({ _id: currentUser.currentAreaId });
        const attendees = this._getUserIdsbyEmails(event.attendees);
        if (!R.contains(currentUser._id, attendees)) {
          attendees.push(currentUser._id);
        }

        return {
          title: event.summary,
          startTime: moment(event.start.dateTime).toDate(),
          endTime: moment(event.end.dateTime).toDate(),
          location: event.location || '',
          attendees,
          locationId: area.locationId,

          createdBy: currentUser._id,
          createdAt: moment(event.created).toDate(),
          imported: {
            from: 'google',
            eventId: event.id,
          },
        };
      }
    }
    return false;
  }
}

export { GoogleConnector };
