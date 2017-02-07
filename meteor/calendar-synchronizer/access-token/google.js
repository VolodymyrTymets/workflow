import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';

import { R } from 'meteor/hospohero:core';

import { ServiceAccessToken } from './ServiceAccessToken';

import { getServicePathFor, getApiUrl, needRefreshToken } from './common';

// Google Service entry stuff

const googleServicePath = ['services', 'google'];

// googleServicePathFor :: String -> [String]
const googleServicePathFor = getServicePathFor(googleServicePath);

// getServiceUserId :: User -> String
//    User = Object
const getServiceUserId = R.path(googleServicePathFor('email'));

const accessTokenPath = googleServicePathFor('accessToken');

// getAccessTokenByUser :: User -> Token
//    User = Object
//    Token = String
const getAccessTokenByUser = R.path(accessTokenPath);

// Api URL Stuff

const baseUrl = 'https://www.googleapis.com/';

const getBaseApiUrl = getApiUrl(baseUrl);

// Access Token Stuff

// refreshAccessToken :: User -> Token
//    User = Object
//    Token = String
const refreshAccessToken = user => ServiceAccessToken.refreshForGoogle(user);

// Request stuff
function doRequestToGmail(accessToken, type, url, data) {
  try {
    return HTTP.call(type, url, {
      headers: {
        Authorization: `Bearer ${accessToken}`, // authorization access token
      },
      data,
    });
  } catch (error) {
    const { statusCode, content } = error.response;

    if (needRefreshToken(statusCode)) {
      return false; // we need update token
    }

    // impossible to solve => report about problem
    throw new Meteor.Error(`[Google]: ${statusCode} ${content}`);
  }
}


function doAccessTokenProofRequest(user, type, url, data) {
  const accessToken = getAccessTokenByUser(user);
  let result = doRequestToGmail(accessToken, type, url, data);

  if (result === false) { // we need to update token
    const updatedAccessToken = refreshAccessToken(user);

    if (updatedAccessToken) {
      Meteor.users.update({ // save token for future use
        _id: user._id,
      }, {
        $set: { [R.join('.', accessTokenPath)]: updatedAccessToken },
      });
      result = doRequestToGmail(updatedAccessToken, type, url, data);
    }
  }
  return result;
}

export {
  getServiceUserId,
  getBaseApiUrl,
  doAccessTokenProofRequest,
};
