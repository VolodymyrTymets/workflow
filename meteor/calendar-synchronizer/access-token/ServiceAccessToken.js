import { Meteor } from 'meteor/meteor';
import { OAuth } from 'meteor/oauth';
import { HTTP } from 'meteor/http';

// eslint-disable-next-line import/no-unresolved
import { AzureAd } from 'meteor/wiseguyeh:azure-active-directory';

import { logger, R } from 'meteor/hospohero:core';


// appendSource :: String -> String
const prependSource = R.concat('[ServiceAccessToken] ');


export class ServiceAccessToken {

  /**
   * get Microsoft Access Token in offline mode via:
   * https://msdn.microsoft.com/en-us/library/hh243647.aspx#authcodegrant
   *
   * @param {User} user
   * @return {String|Boolean} newAccessToken
   * @private
   * */
  static _getMicrosoftAccessToken(user) {
    logger.info(prependSource('Try get Microsoft Access Token'), { userId: user._id });
    let accessToken;
    const service = Meteor.settings.services.find(item => item.service === 'microsoft');
    try {
      const postResult = HTTP.post('https://login.live.com/oauth20_token.srf', {
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        params: {
          client_id: service.clientId,
          client_secret: service.secret,
          grant_type: 'refresh_token',
          refresh_token: user.services.microsoft.refreshToken,
        },
      });
      accessToken = postResult.data.access_token;
    } catch (error) {
      logger.error(prependSource('Can\'t get  Access Token'));
    }
    return accessToken;
  }

  /**
   * get Google Access Token in offline mode via:
   * https://developers.google.com/identity/protocols/OAuth2WebServer#offline
   *
   * @param {User} user
   * @return {String|Boolean} newAccessToken
   * @private
   * */
  static _getGoogleAccessToken(user) {
    logger.info(prependSource('Try get Google Access Token'), { userId: user._id });
    const service = Meteor.settings.services.find(item => item.service === 'google');
    let newAccessToken = false;
    try {
      const result = HTTP.post(
        'https://www.googleapis.com/oauth2/v3/token',
        {
          params: {
            client_id: service.clientId,
            client_secret: OAuth.openSecret(service.secret),
            redirect_uri: OAuth._redirectUri('microsoft', service),
            refresh_token: user.services.google.refreshToken,
            grant_type: 'refresh_token',
          },
        });
      newAccessToken = result.data.access_token;
    } catch (error) {
      logger.error(prependSource('Can\'t get Google Access Token'));
    }

    return newAccessToken;
  }

  /**
   * Provides new access token for Google services
   *
   * @param {Object} user
   * @return {String|Boolean} newAccessToken
   *
   **/
  static refreshForGoogle(user) {
    if (user.services && user.services.google && user.services.google.refreshToken) {
      const newAccessToken = ServiceAccessToken._getGoogleAccessToken(user);
      if (newAccessToken) {
        const updateQuery = { $set: { 'services.google.accessToken': newAccessToken } };
        Meteor.users.update({ _id: user._id }, updateQuery);
        logger.info(prependSource('User Google Access Token was updated'), { userId: user._id });
        return newAccessToken;
      }
    }
    return false;
  }

  /**
   * Provides new access token for Microsoft services
   *
   * @param {Object} user
   * @return {String|Boolean} newAccessToken
   *
   **/
  static refreshForMicrosoft(user) {
    if (user.services && user.services.microsoft && user.services.microsoft.refreshToken) {
      const newAccessToken = ServiceAccessToken._getMicrosoftAccessToken(user);

      if (newAccessToken) {
        const updateQuery = { $set: { 'services.microsoft.accessToken': newAccessToken } };
        Meteor.users.update({ _id: user._id }, updateQuery);
        logger.info(prependSource('User Microsoft Access Token was updated'), { userId: user._id });
        return newAccessToken;
      }
    }
    return false;
  }

  /**
   * Provides new access token for AzureAd services
   *
   * @param {Object} user
   * @return {String|Boolean} newAccessToken
   *
   **/
  static refreshForAzureAd(user) {
    if (user.services && user.services.azureAd && user.services.azureAd.refreshToken) {
      const resources = AzureAd.resources;
      const getOrUpdateUserAccessToken = resources.getOrUpdateUserAccessToken;
      const newAccessToken = getOrUpdateUserAccessToken(resources.office365.friendlyName, user);
      if (newAccessToken) {
        logger.info(prependSource('User AzureAd Access Token was updated'), { userId: user._id });
        return newAccessToken;
      }
    }
    return false;
  }
}
