import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { ConfigurationTypeTC } from "../models/configurationtype";
const createMongooseClient = require('../shared/mongodb');
const { ConfigurationType } = require('../models/configurationtype');
const { MsGraphResource } = require('../models/msgraphresource');

async function clearDatabase(context) {
    context.log("start clear database");
    let msGraphResources = await MsGraphResource.deleteMany({});
    let configurationTypes = await ConfigurationType.deleteMany({});

    return {
        msGraphResources,
        configurationTypes
    };
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');

    // establish db connection
    createMongooseClient();

    // prestage conent
    let reportCreatedObjects = await clearDatabase(context);
    const responseMessage = reportCreatedObjects;

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage
    };
};

export default httpTrigger;