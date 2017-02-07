import { R } from 'meteor/hospohero:core';

// getServicePathFor :: String -> String
//                   :: [] -> String
const getServicePathFor = (servicePath) => R.ifElse(R.is(Array), R.concat(servicePath),
  R.flip(R.append)(servicePath));

const getApiUrl = (baseUrl) => (path) => {
  const stringPath = R.ifElse(R.is(String), R.identity, R.join('/'));
  return baseUrl + stringPath(path);
};

// needRefreshToken :: Error -> Boolean
//    Error = Number
const needRefreshToken = code => code === 401 || code === 403;

export {
  getServicePathFor,
  getApiUrl,
  needRefreshToken,
};
