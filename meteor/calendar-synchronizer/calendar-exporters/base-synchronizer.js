import { Meteor } from 'meteor/meteor';

import { R } from 'meteor/hospohero:core';

import { GoogleConnector } from './connectors/google';
import { MicrosoftConnector } from './connectors/microsoft';

/**
 * Base class for Export/Import Entity into service calendar
 * register new service connector in constructor
 * **/

class BaseSynchronizer {
  constructor(service) {
    this._serviceConnector = {
      google: GoogleConnector,
      microsoft: MicrosoftConnector,
      azureAd: MicrosoftConnector,
    };
    this._service = service;
  }
  _setConnector(user) {
    this._connector = new this._serviceConnector[this._service](user, this._service);
  }
  _getUser(userId) {
    return Meteor.users.findOne({ _id: userId });
  }

  _mapUserEmail(userIds) {
    return userIds && userIds.map((userId) => {
      const user = Meteor.users.findOne({ _id: userId });
      const address = user.emails && user.emails[0] && user.emails[0].address;

      return { userId, address };
    });
  }

  _isntEqual(newEvent, oldEvent) {
    return property => {
      const getCurrentProp = R.prop(property);

      const newValue = getCurrentProp(newEvent);
      const oldValue = getCurrentProp(oldEvent);

      return R.not(R.equals(newValue, oldValue));
    };
  }
}

export { BaseSynchronizer };
