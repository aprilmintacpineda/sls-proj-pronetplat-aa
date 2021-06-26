const AWS = require('aws-sdk');

const apiGateway = new AWS.ApiGatewayManagementApi({
  apiVersion: '2018-11-29',
  endpoint: '__webSocketUrl__'
});

module.exports.postToConnection = (...args) => {
  return apiGateway.postToConnection(...args).promise();
};
