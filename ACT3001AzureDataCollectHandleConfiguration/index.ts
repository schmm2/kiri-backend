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

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<any> {
    console.log("ACT3001AzureDataCollectHandleConfiguration", "Start Configuration Handeling");
    // console.log(JSON.stringify(parameter));*/

    let configurationListGraph = parameter.graphValue;
    let graphResourceUrl = parameter.graphResourceUrl; 
    let tenant = parameter.tenant;

    let configurationTypeNotDefined = [];

    // console.log("pat0040", tenant);
    // console.log("graphValue");
    // console.log(JSON.stringify(configurationListGraph));

    // console.log("handle configurations")
    // console.log(graphResourceUrl);

    let Tenant = mongoose.model('Tenant');
    let Configuration = mongoose.model('Configuration');
    let ConfigurationType = mongoose.model('ConfigurationType');
    let ConfigurationVersion = mongoose.model('ConfigurationVersion');

    // check for new configurations
    for (var i = 0; i < configurationListGraph.length; i++) {
        let configurationObjectFromGraph = configurationListGraph[i];
        // console.log("handle configuration: " + configurationObjectFromGraph.id);

        let configurations = await Configuration.find({ graphId: configurationObjectFromGraph.id });
        // if id does not exist in db, we found a new config
        if (configurations.length == 0) {
            console.log("found new configuration " + configurationObjectFromGraph.id);

            // get config type from configuration
            // this information is important to link the configuration doc to a configurationType doc
            let configurationTypeName = null
            if (configurationObjectFromGraph["@odata.type"]) {
                configurationTypeName = configurationObjectFromGraph["@odata.type"].replace("#microsoft.graph.", "");
            }

            // Graph Exceptions
            // Exception: Some resource do not contain a odata property (example: App Protection Policy)
            else {
                switch (graphResourceUrl) {
                    case "/deviceAppManagement/targetedManagedAppConfigurations":
                        configurationTypeName = "targetedManagedAppConfiguration";
                        break;
                    case "/deviceAppManagement/iosManagedAppProtections":
                        configurationTypeName = "iosManagedAppProtection";
                        break;
                    case "/deviceAppManagement/androidManagedAppProtections":
                        configurationTypeName = "androidManagedAppProtection";
                        break;
                    case "/deviceManagement/groupPolicyConfigurations":
                        configurationTypeName = "groupPolicyConfiguration";
                        break;
                    default:
                        break;
                }
            }

            // check data Type
            if (!configurationTypeName) {
                console.log('configurationTypeName not defined');
                console.log(configurationObjectFromGraph);
            } else {
                console.log("configurationTypeName defined: " + configurationTypeName);
            } 

            // find configurationType Id
            let configurationTypeId = null;
            let configurationTypes = await ConfigurationType.find({ name: configurationTypeName });
            // console.log("found configurationtypes: " + JSON.stringify(configurationTypes));

            if (configurationTypes.length > 0) {
                // console.log("found configuration type: " + configurationTypes[0].name);

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

                // establish relationship, update configurationType
                ConfigurationType.update(
                    { _id: configurationTypeId },
                    { $push: { configurations: addConfigurationResponse._id } },
                    (err, doc) => { if (err) { console.log("mongoose: error updating configurationType") } }
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

                // console.log("created new configuration version element");
                // console.log("created configuration version response: " + JSON.stringify(addConfigurationVersionResponse));
            } else {
                console.log("unable to find configuration type for name: "+configurationTypeName);
                configurationTypeNotDefined.push(configurationTypeName);
            }
        } else {
            let configuration = configurations[0];
            // console.log("configuration does already exist:" + configuration._id);

            // get newest configuration versions of this configuration
            let newestStoredConfigurationVersion = null;
            let storedConfigurationVersions = await ConfigurationVersion.find({ configuration: configuration._id, isNewest: true });
            // console.log("stored version", storedConfigurationVersions[0]);

            if (storedConfigurationVersions[0]) {
                // we have to make sure the version property exists
                if (storedConfigurationVersions[0].version) {
                    newestStoredConfigurationVersion = storedConfigurationVersions[0];
                    // console.log("newest stored version: ", newestStoredConfigurationVersion);
                }
            }

            // we are unable to use the version property as it does not exist on all graph resources => use md5 hash instead
            let configurationObjectFromGraphVersion = crypto.createHash('md5').update(JSON.stringify(configurationObjectFromGraph)).digest("hex");
            // console.log("graph hash version", configurationObjectFromGraphVersion);
            // console.log("stored hash version", newestStoredConfigurationVersion.version);

            // compare version of object from graph and stored in dynamodb
            // new version found, need to add the new version
            if (configurationObjectFromGraphVersion != newestStoredConfigurationVersion.version) {
                // console.log("configuration " + configuration.id + " new version found, add new configuration version");

                let addConfigurationVersionResponse = await ConfigurationVersion.create({
                    value: JSON.stringify(configurationObjectFromGraph),
                    version: configurationObjectFromGraphVersion,
                    configuration: configuration._id,
                    isNewest: true,
                    displayName: configurationObjectFromGraph.displayName,
                    graphModifiedAt: configurationObjectFromGraph.lastModifiedDateTime
                });

                // console.log("new version: ", addConfigurationVersionResponse);

                // establish relationship, update configuration
                Configuration.update(
                    { _id: configuration._id },
                    { $push: { configurationVersions: addConfigurationVersionResponse._id } },
                    (err, doc) => { if (err) { console.log("mongoose: error updating configuration") } }
                )

                // set active configurationversion to old state
                newestStoredConfigurationVersion.isNewest = false;
                newestStoredConfigurationVersion.save();
            } else {
                // else: no newer version, nothing needs to be done
                // console.log("same version")
            }
        }
    };
    return {
        configurationTypeNotDefined
    };
};
export default activityFunction;