import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import { R } from 'meteor/hospohero:core';

import { ServiceAccessToken } from './ServiceAccessToken';

import { getServicePathFor, getApiUrl, needRefreshToken } from './common';

// Microsoft Service entry stuff

const microsoftServicePath = ['services', 'microsoft'];

// microsoftServicePathFor :: String -> [String]
const microsoftServicePathFor = getServicePathFor(microsoftServicePath);

// getServiceUserId :: User -> String
//    User = Object

const getServiceUserId = R.path(microsoftServicePathFor(['emails', 'preferred']));

const accessTokenPath = microsoftServicePathFor('accessToken');

// getAccessTokenByUser :: User -> Token
//    User = Object
//    Token = String
const getAccessTokenByUser = R.path(accessTokenPath);

// Api URL Stuff

const baseUrl = 'https://outlook.office.com/api/v2.0/me/';

const getBaseApiUrl = getApiUrl(baseUrl);

// Access Token Stuff

// refreshAccessToken :: User -> Token
//    User = Object
//    Token = String
const refreshAccessToken = user => ServiceAccessToken.refreshForMicrosoft(user);

// Request stuff
function doRequestToOutlook(accessToken, userEmail, type, url, requestData) {
  try {
    return HTTP.call(type, url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`, // authorization access token
        'X-AnchorMailbox': userEmail,
      },
      data: requestData,
    });
  } catch (error) {
    const { statusCode, data } = error.response;
    const errorText = R.path(['error', 'message'], data);

    if (needRefreshToken(statusCode)) {
      return false; // we need update token
    }

    // impossible to solve => report about problem
    throw new Meteor.Error(`[Microsoft]: ${statusCode} ${errorText}`);
  }
}


function doAccessTokenProofRequest(user, type, url, data = {}) {
  const accessToken = getAccessTokenByUser(user);
  const userEmail = getServiceUserId(user);

  let result = doRequestToOutlook(accessToken, userEmail, type, url, data);

  if (result === false) { // we need to update token
    const updatedAccessToken = refreshAccessToken(user);

    if (updatedAccessToken) {
      Meteor.users.update({ // save token for future use
        _id: user._id,
      }, {
        $set: { [R.join('.', accessTokenPath)]: updatedAccessToken },
      });
      result = doRequestToOutlook(updatedAccessToken, userEmail, type, encodeURI(url), data);
    }
  }

  return result;
}

export {
  getServiceUserId,
  getBaseApiUrl,
  doAccessTokenProofRequest,
};
