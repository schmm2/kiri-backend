import { ApolloServer } from "apollo-server-azure-functions";
const graphqlSchema = require('./schemas/index');
const createMongooseClient = require('../shared/mongodb');

// Source: https://github.com/maximivanov/azure-function-graphql-typescript-starter/blob/main/graphql/index.ts
// connect db
createMongooseClient();

const server = new ApolloServer({
  schema: graphqlSchema
});

module.exports = server.createHandler({
  cors: {
    origin: '*',
    credentials: true,
  }
})