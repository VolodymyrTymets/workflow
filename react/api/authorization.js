const getAuthToken = () => localStorage.getItem('token');
const getTokenHeaderValue = () => `Bearer ${getAuthToken()}`;
const getTokenHeaderObject = () => ({ 'Authorization': getTokenHeaderValue() });

export {
  getAuthToken,
  getTokenHeaderValue,
  getTokenHeaderObject,
};
