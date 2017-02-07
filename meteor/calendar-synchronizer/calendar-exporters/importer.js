import { moment, R } from 'meteor/hospohero:core';

import { BaseSynchronizer } from './base-synchronizer';
import { CalendarEvents } from '../../common/calendar';
import { CalendarApp } from '../../common/CalendarApp';


/**
* Import Calendar Events from Service
**/

class CalendarImporter extends BaseSynchronizer {
  constructor(service, userId) {
    super(service, userId);
    this._updateQuery = {
      $set: { },
    };
    this._setConnector(this._getUser(userId));
  }

  _updateQueryForField(fieldName, eventField, calendarEventField) {
    if (moment(eventField).diff(calendarEventField)) {
      this._updateQuery.$set[fieldName] = new Date(eventField);
    } else {
      delete this._updateQuery.$set[fieldName];
    }
  }

  _googleUpdateEvent(event) {
    const calendarEvent = CalendarEvents.findOne({ googleCalendarEventId: event.id });
    if (calendarEvent) {
      this._updateQueryForField('startTime', event.start.dateTime, calendarEvent.startTime);
      this._updateQueryForField('endTime', event.end.dateTime, calendarEvent.endTime);
      return calendarEvent;
    }
    return false;
  }

  _commonUpdateEvent(event, service) {
    const calendarEvent = CalendarEvents.findOne({ [`${service}CalendarEventId`]: event.Id });
    if (calendarEvent) {
      this._updateQueryForField('startTime', event.Start.DateTime, calendarEvent.startTime);
      this._updateQueryForField('endTime', event.End.DateTime, calendarEvent.endTime);
      return calendarEvent;
    }
    return false;
  }

  _microsoftUpdateEvent(event) {
    return this._commonUpdateEvent(event, 'microsoft');
  }

  _azureAdUpdateEvent(event) {
    return this._commonUpdateEvent(event, 'azureAd');
  }

  _createEvent(event) {
    CalendarApp.call('onNewEventFromService', this._service, event, this.user);
  }

  _updateEvent(event) {
    const calendarEvent = this[`_${this._service}UpdateEvent`](event);

    if (calendarEvent && !R.isEmpty(this._updateQuery.$set)) {
      CalendarEvents.update({ _id: calendarEvent._id }, this._updateQuery);
    }
  }

  /**
    Public Api
  **/

  importAll(fromDate, toDate) {
    const events = this._connector.importation(fromDate, toDate);
    if (events && events.length > 0) {
      const eventToCreate = this._connector.getNotImportedItems(events, CalendarEvents);
      const eventsToUpdate = this._connector.getImportedItems(events, CalendarEvents);
      if (eventToCreate) {
        eventToCreate.forEach(this._createEvent.bind(this));
      }
      if (eventsToUpdate) {
        eventsToUpdate.forEach(this._updateEvent.bind(this));
      }
    }
  }

  importEventToMeeting(event) {
    return this._connector.importEventToMeeting(event);
  }
}

export { CalendarImporter };
