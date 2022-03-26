import { AzureFunction, Context, HttpRequest } from "@azure/functions"
const { Deployment } = require("../models/deployment");
const { ConfigurationType } = require('../models/configurationtype');
const { MsGraphResource } = require('../models/msgraphresource');
const { Configuration } = require('../models/configuration');
const { ConfigurationVersion } = require('../models/configurationVersion');
const { Device } = require('../models/device');
const { Job } = require('../models/job');

async function clearDatabase(context) {
    context.log("start clear database");
    let msGraphResources = await MsGraphResource.deleteMany({});
    let configurationTypes = await ConfigurationType.deleteMany({});
    let configuration = await Configuration.deleteMany({});
    let configurationVersion = await ConfigurationVersion.deleteMany({});
    let devices = await Device.deleteMany({})
    let jobs = await Job.deleteMany({})
    let deployments = await Deployment.deleteMany({})

    return {
        msGraphResources,
        configurationTypes,
        configuration,
        configurationVersion,
        devices,
        jobs,
        deployments
    };
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');

    // prestage conent
    let reportCreatedObjects = await clearDatabase(context);
    const responseMessage = reportCreatedObjects;

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage
    };
};

export default httpTrigger;