import { Meteor } from 'meteor/meteor';

import { R } from 'meteor/hospohero:core';
import { Locations } from 'meteor/hospohero:users';

import { BaseSynchronizer } from './base-synchronizer';
import { CalendarEvents } from '../../common/calendar';
import { EventTypesManager } from '../../common/EventTypesManager';


/**
* Export Calendar Events into Service
**/

class CalendarExporter extends BaseSynchronizer {
  /* eslint-disable no-useless-constructor*/
  constructor(service, userId) {
    super(service, userId);
    this._userId = userId;
    this._setConnector(this._getUser(userId));
  }
  /* eslint-enable no-useless-constructor*/

  _getEventById(event) {
    return typeof event === 'string' ?
      CalendarEvents.findOne({ _id: event }) : event;
  }

  _getUserByEvent(event) {
    return Meteor.users.findOne({ _id: event.userId });
  }

  _getColorIdByEventType(type) {
    const events = EventTypesManager.getEvents();
    return R.pipe(R.flip(R.indexOf)(R.keys(events)), R.inc)(type);
  }

  _googleEventParse(event) {
    const location = Locations.findOne({ _id: event.locationId });
    if (location) {
      const calendarEvent = {
        summary: EventTypesManager.getEventTitle(event),
        colorId: this._getColorIdByEventType(event.type),
        start: {
          dateTime: event.startTime,
          timeZone: location && location.timezone,
        },
        end: {
          dateTime: event.endTime,
          timeZone: location && location.timezone,
        },
        attendees: [],
      };

      // Add Event attendees
      const attendees = EventTypesManager.getEventAttendees(event);
      if (attendees) {
        const emails = this._mapUserEmail(R.without([event.userId], attendees));
        if (emails) {
          emails.forEach(email =>
          email && calendarEvent.attendees.push({ email: email.address }));
        }
      }
      return calendarEvent;
    }
    return false;
  }

  /**
   * @param event { CalendarEvent}
   * @return { Microsoft Calendar object }
   **/
  _commonEventParse(event) {
    const location = Locations.findOne({ _id: event.locationId });
    if (location) {
      const calendarEvent = {
        Subject: EventTypesManager.getEventTitle(event),
        Body: {
          ContentType: 'HTML',
          Content: EventTypesManager.getEventTitle(event),
        },
        Start: {
          DateTime: event.startTime,
          TimeZone: location && location.timezone,
        },
        End: {
          DateTime: event.endTime,
          TimeZone: location && location.timezone,
        },
        Attendees: [],
      };
      return calendarEvent;
    }
    return false;
  }

  _microsoftEventParse(event) {
    return this._commonEventParse(event);
  }

  _azureAdEventParse(event) {
    return this._commonEventParse(event);
  }

  _allowUseCalendar(allow) {
    const query = { $set: {} };
    query.$set[`services.${this._service}.allowUseCalendar`] = allow;
    Meteor.users.update({ _id: this._userId }, query);
    this._setConnector(this._getUser(this._userId));
  }

  _needUpdateEvent(event, newEvent) {
    const compareFields = R.pipe(this._isntEqual,
      R.flip(R.any)(['startTime', 'endTime', 'type']));

    return compareFields(event, newEvent);
  }

  _exportEvent(calendarEvent) {
    const event = this._getEventById(calendarEvent);
    const serviceEvent = this[`_${this._service}EventParse`](event);
    if (serviceEvent) {
      const calendarEventId = this._connector.insert(serviceEvent);

      if (calendarEventId) {
        const field = {};
        field[`${this._service}CalendarEventId`] = calendarEventId;
        CalendarEvents.direct.update({ _id: calendarEvent._id },
          { $set: field });
      }
    }
  }

  _unExportEvent(calendarEvent) {
    const event = this._getEventById(calendarEvent);
    const serviceEventId = event[`${this._service}CalendarEventId`];

    if (serviceEventId) {
      const isRemoved = this._connector.remove(serviceEventId);

      if (isRemoved) {
        const field = {};
        field[`${this._service}CalendarEventId`] = '';

        CalendarEvents.direct.update({ _id: event._id },
          { $unset: field });
      }
    }
  }

  /**
    Public Api
  **/
  exportAll() {
    const userId = this._userId;
    this._allowUseCalendar(true);
    const fieldName = `${this._service}CalendarEventId`;
    const query = {
      userId,
      $or: [{
        [fieldName]: { $exists: false },
      }, {
        [fieldName]: null,
      }],
    };

    CalendarEvents.find(query).forEach((event) => {
      try {
        this._exportEvent(event);
      } catch (error) {
        this._allowUseCalendar(userId, false);
        throw new Meteor.Error(error.error, error.message);
      }
    });
  }

  unExportAll() {
    const userId = this._userId;
    const query = { userId };
    query[`${this._service}CalendarEventId`] = { $exists: true };

    CalendarEvents.find(query).forEach(event =>
      this._unExportEvent(event));

    this._allowUseCalendar(false);
  }

  exportOne(eventId) {
    this._exportEvent(eventId);
  }

  unExportOne(eventId) {
    this._unExportEvent(eventId);
  }

  update(event, oldEvent) {
    if (event[`${this._service}CalendarEventId`] && this._needUpdateEvent(event, oldEvent)) {
      const serviceEvent = this[`_${this._service}EventParse`](event);
      const serviceItemId = serviceEvent && event[`${this._service}CalendarEventId`];
      if (serviceItemId) {
        this._connector.update(serviceEvent, serviceItemId);
      }
    }
    return false;
  }
}

export { CalendarExporter };
