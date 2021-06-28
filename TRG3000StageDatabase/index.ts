import { AzureFunction, Context, HttpRequest } from "@azure/functions"
const createMongooseClient = require('../shared/mongodb');
const { ConfigurationType } = require('../models/configurationtype');
const { MsGraphResource } = require('../models/msgraphresource');
import * as msgraphResourcesTemplate from '../models/documentTemplates/msgraphresources.json';

// fill database with predefined data
async function stageDatabase(context) {
    let msGraphResourceObjectCount = 0;
    let configurationTypeObjectCount = 0;

    context.log("processing " + msgraphResourcesTemplate.length + " msgraphResources");

    for (let m = 0; m < msgraphResourcesTemplate.length; m++) {
        let msgraphResourceTemplate = msgraphResourcesTemplate[m];
        //context.log( msgraphResourcesTemplate[m]);

        // check if element already exists
        await MsGraphResource.find({ name: msgraphResourceTemplate.name }).
            then(async msGraphResources => {
                let msGraphResourceCreated = null;
                if (msGraphResources.length == 0) {
                    // entry not found so we need to add the element
                    msGraphResourceCreated = await MsGraphResource.create({
                        name: msgraphResourceTemplate.name,
                        resource: msgraphResourceTemplate.resource,
                        version: msgraphResourceTemplate.version
                    });
                    context.log("mongoose, created msgraphresource document: " + msGraphResourceCreated.name);
                    msGraphResourceObjectCount++;
                }
                else {
                    context.log("mongoose, msgraphresource document already exists: " + msGraphResources[0].name);
                    msGraphResourceCreated = msGraphResources[0];
                }
                //context.log(msGraphResource);

                // now the graphresource exists, add related configurationtypes
                if (msgraphResourceTemplate.configurationTypes) {             
                    for (let r = 0; r < msgraphResourcesTemplate[m].configurationTypes.length; r++) {
                        let configurationTypeTemplate = msgraphResourcesTemplate[m].configurationTypes[r];
                        await ConfigurationType.find({ name: configurationTypeTemplate.name }).
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
                                        context.log("mongoose, created resourcetype document: " + configurationTypeCreated.name);
                                        configurationTypeObjectCount++;

                                        // establish relationship, update msGraphResource
                                        MsGraphResource.update(
                                            { _id: msGraphResourceCreated._id },
                                            { $push: { configurationTypes: configurationTypeCreated } },
                                            (err, doc) => { if (err) { context.log("mongoose: error updating msgraphresource") } }
                                        )
                                    } catch (error) {
                                        context.log("unable to create configurationtype: " + configurationTypeTemplate.name)
                                        context.log(error);
                                    }
                                }else{
                                    context.log("mongoose, configurationType document already exists: " + configurationTypes[0].name);
                                }
                            });
                    }
                }
            });
    }

    return {
        "msGraphResources": msGraphResourceObjectCount,
        "configurationTypes": configurationTypeObjectCount
    }
}


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');

    // establish db connection
    createMongooseClient();

    // prestage conent
    let reportCreatedObjects = await stageDatabase(context);
    const responseMessage = reportCreatedObjects;
    
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage
    };
};

export default httpTrigger;