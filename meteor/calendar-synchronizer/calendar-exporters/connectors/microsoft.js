import { moment, logger, R } from 'meteor/hospohero:core';
import { Meteor } from 'meteor/meteor';

import { CalendarConnector } from './connector';
import { ServiceAccessToken } from 'meteor/hospohero:services-tokens';

import { Areas } from 'meteor/hospohero:users';

const capitalize = string => string[0].toUpperCase() + string.substr(1);

/**
 * Microsoft outlook calendar connector,
 * communicate via api: https://msdn.microsoft.com/en-us/office/office365/api/calendar-rest-operations
 **/
class MicrosoftConnector extends CalendarConnector {
  constructor(user, service) {
    super(user);
    this._service = service;
    this._serviceCapitalized = capitalize(service);
    this._servicePath = ['services', service];
    this._refreshTokenFunction = ServiceAccessToken[`refreshFor${this._serviceCapitalized}`];
    this._notFoundCalendarMessage = `${this._serviceCapitalized} calendar not found`;
  }

  _getBaseUrl() {
    return 'https://outlook.office.com/api/v2.0/me/calendars';
  }

  _getBaseImportUrl() {
    return 'https://outlook.office.com/api/v2.0/me/calendarview';
  }

  _getCalendarIdFromService() {
    const url = this._getBaseUrl();
    const response = this._doAccessTokenProofRequest('GET', url);
    const calendars = R.path(['data', 'value'], response);


    if (!(calendars && calendars.length && calendars[0].Id)) {
      throw new Meteor.Error(404, this._notFoundCalendarMessage);
    }
    return calendars[0].Id;
  }

  /** Try get user calendar id,
   *  and hash him to next  items
   * @return { String }
   * **/
  _getCalendarId() {
    this._calendarId = this._calendarId || this._getCalendarIdFromService();
    return this._calendarId;
  }


  _getBaseApiUrl(responseType) {
    return `${this._getBaseUrl()}/${this._getCalendarId()}/events${responseType || ''}`;
  }

  _getEventApiUrl(id) {
    return `${this._getBaseApiUrl()}/${id || ''}`;
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

      if (code === 'ErrorItemNotFound') { // continue
        return true;
      }

      this._logError(`[${code}] in ${requestInfo.type} -> ${requestInfo.url}`);
      throw new Meteor.Error(responseErrorData.code, responseErrorData.message);
    } else {
      const httpErr = error.response;
      this._logError(`http [${httpErr.statusCode}]
       in ${requestInfo.type} -> ${requestInfo.url}`, requestInfo.data);
      throw new Meteor.Error(httpErr.statusCode, httpErr.content);
    }
  }

  _logError(message, data) {
    logger.error(`${this._serviceCapitalized} connector: ${message}`, { data });
  }

  /**
   * Public Api
   **/

  insert(data) {
    if (this._isCalendarAllowed()) {
      const url = this._getEventApiUrl('?$Select=Id');
      const result = this._doAccessTokenProofRequest('POST', url, { data });
      return R.path(['data', 'Id'], result);
    }
    return false;
  }

  update(data, id) {
    if (this._isCalendarAllowed()) {
      const url = this._getEventApiUrl(id);
      const result = this._doAccessTokenProofRequest('PATCH', url, { data });
      return R.path(['data', 'Id'], result);
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

  importation(fromDate, toDate) {
    if (this._isCalendarAllowed()) {
      const data = {
        params: {
          startDateTime: fromDate.toISOString(),
          endDateTime: toDate.toISOString(),
        },
      };
      let items = [];
      const url = this._getBaseImportUrl();
      const result = this._doAccessTokenProofRequest('GET', url, data);
      let nextLink = R.path(['data', '@odata.nextLink'], result);
      items = R.union(items, R.path(['data', 'value'], result));

      while (nextLink) {
        const nextResult = this._doAccessTokenProofRequest('GET', nextLink);
        nextLink = R.path(['data', '@odata.nextLink'], nextResult);
        items = R.union(items, R.path(['data', 'value'], nextResult));
      }

      return items;
    }
    return false;
  }

  getImportedItems(events, collection) {
    const condition = event =>
      !!collection.findOne({ [`${this._service}CalendarEventId`]: event.Id });
    return R.filter(condition, events);
  }

  getNotImportedItems(events, collection) {
    const condition = event =>
      !collection.findOne({ [`${this._service}CalendarEventId`]: event.Id });
    return R.filter(condition, events);
  }

  importEventToMeeting(event) {
    if (!event.IsCancelled) {
      const currentUser = this._user;
      if (currentUser) {
        const area = Areas.findOne({ _id: currentUser.currentAreaId });
        const attendees = this._getUserIdsbyEmails(event.Attendees);
        if (!R.contains(currentUser._id, attendees)) {
          attendees.push(currentUser._id);
        }

        return {
          title: event.Subject,
          startTime: moment(event.Start.DateTime).toDate(),
          endTime: moment(event.End.DateTime).toDate(),
          location: (event.Location && event.Location.DisplayName) || '',
          attendees,
          locationId: area.locationId,

          createdBy: currentUser._id,
          createdAt: moment(event.CreatedDateTime).toDate(),
          imported: {
            from: this._service,
            eventId: event.Id,
          },
        };
      }
    }
    return false;
  }
}

export { MicrosoftConnector };
