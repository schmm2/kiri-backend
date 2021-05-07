import { ApolloServer } from "apollo-server-azure-functions";
const graphqlSchema = require('./schemas/index');
const createMongooseClient = require('../shared/mongodb');
const { ConfigurationType } = require('../models/configurationtype');
const { MsGraphResource } = require('../models/msgraphresource');
import * as msgraphResourcesTemplate from '../models/documentTemplates/msgraphresources.json';
import IsValidJSONString from '../utils/isvalidjsonstring';

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
};

// connect db
createMongooseClient();


// fill database with predefined data
for (let m = 0; m < msgraphResourcesTemplate.length; m++) {
  let msgraphResourceTemplate = msgraphResourcesTemplate[m];
  //console.log( msgraphResourcesTemplate[m]);
  // check if element already exists
  MsGraphResource.find({ name: msgraphResourceTemplate.name }).
    then(async msGraphResources => {
      let msGraphResourceCreated = null;
      if (msGraphResources.length == 0) {
        // entry not found so we need to add the element
        msGraphResourceCreated = await MsGraphResource.create({
          name: msgraphResourceTemplate.name,
          resource: msgraphResourceTemplate.resource,
          version: msgraphResourceTemplate.version
        });
        console.log("mongoose, created msgraphresource document " + msGraphResourceCreated.name);
      }
      else {
        msGraphResourceCreated = msGraphResources[0];
      }
      //console.log(msGraphResource);

      // now the graphresource exists, add related configurationtypes
      if (msgraphResourceTemplate.configurationTypes) {
        for (let r = 0; r < msgraphResourcesTemplate[m].configurationTypes.length; r++) {
          let configurationTypeTemplate = msgraphResourcesTemplate[m].configurationTypes[r];
          ConfigurationType.find({ name: configurationTypeTemplate.name }).
            then(async configurationTypes => {
              if (configurationTypes.length == 0) {
                // configtype not yet created
                try {
                  let configurationTypeCreated = await ConfigurationType.create({
                    name: configurationTypeTemplate.name,
                    platform: configurationTypeTemplate.platform,
                    category: configurationTypeTemplate.category,
                    msGraphResource: msGraphResourceCreated.id
                  });
                  console.log("mongoose, created resourcetype document: " + configurationTypeCreated.name);

                  // establish relationship, update msGraphResource
                  MsGraphResource.update(
                    { _id: msGraphResourceCreated._id },
                    { $push: { configurationTypes: configurationTypeCreated } },
                    (err, doc) => { if (err) { console.log("mongoose: error updating msgraphresource") } }
                  )
                } catch (error) {
                  console.log("unable to create configurationtype: " + configurationTypeTemplate.name)
                  console.log(error);
                }
              }
            });
        }
      }
    });
}


const server = new ApolloServer({
  schema: graphqlSchema,
  plugins: [BASIC_LOGGING]
});

export default server.createHandler();