import { ApolloServer } from "apollo-server-azure-functions";
const graphqlSchema = require('./schemas/index');
const createMongooseClient = require('../shared/mongodb');

/*
const BASIC_LOGGING = {
  requestDidStart(requestContext) {
    console.log("request started");
    console.log(requestContext.request.query);
    console.log(requestContext.request.variables);
    return {
      didEncounterErrors(requestContext) {
        console.log("an error happened in response to query " + requestContext.request.query);
        console.log(requestContext.errors);
      }
    };
  },

  willSendResponse(requestContext) {
    console.log("response sent", requestContext.response);
  }
};*/

// Source: https://github.com/maximivanov/azure-function-graphql-typescript-starter/blob/main/graphql/index.ts

// connect db
createMongooseClient().then((dbConnectionEstablished) => {
  console.log("graphql", "mongodb connection established " + dbConnectionEstablished.toString());
});

const server = new ApolloServer({
  schema: graphqlSchema,
  /*plugins: [BASIC_LOGGING]*/
});

module.exports = server.createHandler({
  cors: {
    origin: '*',
    credentials: true,
  }
})