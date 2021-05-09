/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

import { AzureFunction, Context } from "@azure/functions"
var mongoose = require('mongoose');
const crypto = require('crypto')

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<string> {
    console.log("PAT0040HandleConfigurations: parameter");
    console.log(JSON.stringify(parameter));

    let configurationListGraph = parameter.graphValue;
    let graphResourceUrl = parameter.graphResourceUrl;
    let tenant = parameter.tenant;

    console.log("pat0040", tenant);
    // console.log("graphValue");
    // console.log(JSON.stringify(configurationListGraph));

    console.log("handle configurations")
    let Tenant = mongoose.model('Tenant');
    let Configuration = mongoose.model('Configuration');
    let ConfigurationType = mongoose.model('ConfigurationType');
    let ConfigurationVersion = mongoose.model('ConfigurationVersion');

    // check for new devices
    for (var i = 0; i < configurationListGraph.length; i++) {
        let configurationObjectFromGraph = configurationListGraph[i];
        console.log("handle configuration: " + configurationObjectFromGraph.id);

        let configurations = await Configuration.find({ graphId: configurationObjectFromGraph.id });
        // if id does not exist in db, we found a new config
        if (configurations.length == 0) {
            console.log("found new configuration " + configurationObjectFromGraph.id);

            // get config type from configuration
            // this information is important to link the configuration doc to a configurationType doc
            let dataType = null
            if (configurationObjectFromGraph["@odata.type"]) {
                dataType = configurationObjectFromGraph["@odata.type"].replace("#microsoft.graph.", "");
            }

            // Graph Exceptions
            // Exception: Some resource do not contain a odata property (example: App Protection Policy)
            else {
                switch (graphResourceUrl) {
                    case "/deviceManagement/iosManagedAppProtections":
                        dataType = "iosManagedAppProtection";
                        break;
                    case "/deviceManagement/androidManagedAppProtections":
                        dataType = "androidManagedAppProtection";
                        break;
                    case "/deviceManagement/groupPolicyConfigurations":
                        dataType = "groupPolicyConfiguration";
                        break;
                    default:
                        break;
                }
            }

            // check data Type
            if (!dataType) {
                console.log('dataType not defined');
                console.log(configurationObjectFromGraph);
            } else {
                console.log("dataType defined: " + dataType);
            }

            // find configurationType Id
            let configurationTypeId = null;
            let configurationTypes = await ConfigurationType.find({ name: dataType });
            console.log("found configurationtypes: " + JSON.stringify(configurationTypes));

            if (configurationTypes.length > 0) {
                console.log("found configuration type: " + configurationTypes[0].name);

                // Create Configuration
                configurationTypeId = configurationTypes[0].id
                let addConfigurationResponse = await Configuration.create({
                    graphIsDeleted: false,
                    graphId: configurationObjectFromGraph.id,
                    graphCreatedAt: configurationObjectFromGraph.createdDateTime,
                    configurationType: configurationTypeId,
                    tenant: tenant._id
                });

                // establish relationship, update tenant
                Tenant.update(
                    { _id: tenant._id },
                    { $push: { configurations: addConfigurationResponse._id } },
                    (err, doc) => { if (err) { console.log("mongoose: error updating tenant") } }
                )

                // console.log("created new configuration element");
                // console.log("created configuration response: " + JSON.stringify(addConfigurationResponse));

                // Create Configuration Version
                let configurationObjectFromGraphJSON = JSON.stringify(configurationObjectFromGraph);
                let version = crypto.createHash('md5').update(configurationObjectFromGraphJSON).digest("hex");

                let addConfigurationVersionResponse = await ConfigurationVersion.create({
                    displayName: configurationObjectFromGraph.displayName,
                    graphModifiedAt: configurationObjectFromGraph.lastModifiedDateTime,
                    value: configurationObjectFromGraphJSON,
                    version: version,
                    isNewest: true,
                    configuration: addConfigurationResponse._id
                });

                // establish relationship, update configuration
                Configuration.update(
                    { _id: addConfigurationResponse._id },
                    { $push: { configurationVersions: addConfigurationVersionResponse._id } },
                    (err, doc) => { if (err) { console.log("mongoose: error updating configuration") } }
                )

                console.log("created new configuration version element");
                console.log("created configuration version response: " + JSON.stringify(addConfigurationVersionResponse));

            } else {
                console.log("unable to find configuration type");
            }
        } else {
            console.log("configuration does already exist:" + configurationObjectFromGraph.id);
        }
    };
    return;
};
export default activityFunction;