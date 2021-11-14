/*
 * Parameters:
 *  graphValue: ,
 *  graphResourceUrl: ,
 *  tenant: ,
 */

import { AzureFunction, Context } from "@azure/functions"
import { createSettingsHash } from '../utils/createSettingsHash';
import { createErrorResponse } from '../utils/createErrorResponse';

var mongoose = require('mongoose');

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<any> {
    let functionName = "ACT3001AzureDataCollectHandleConfiguration"
    context.log(functionName, "Start Configuration Handeling");

    let configurationGraphValue = parameter.graphValue;
    let graphResourceUrl = parameter.graphResourceUrl;
    let tenant = parameter.tenant;

    let Configuration = mongoose.model('Configuration');
    let ConfigurationType = mongoose.model('ConfigurationType');
    let ConfigurationVersion = mongoose.model('ConfigurationVersion');

    let response = {
        ok: true,
        message: "",
        createdConfigurationId: null,
        createdConfigurationVersionId: null
    };

    // validated object
    if (configurationGraphValue && configurationGraphValue.id) {
        context.log("handle configuration: " + configurationGraphValue.id);

        let configurationObjectFromGraph = configurationGraphValue;
        let configurations = await Configuration.find({ graphId: configurationObjectFromGraph.id });
        // we are unable to use the version property as it does not exist on all graph resources => use md5 hash instead
        let configurationObjectFromGraphVersion = createSettingsHash(configurationObjectFromGraph);

        // ****
        // New Configuration
        // if id does not exist in db, we found a new config
        // ****
        if (configurations.length == 0) {
            context.log(functionName, "found new configuration " + configurationObjectFromGraph.id);

            // define configurationType from configuration we received via graph
            // this information is important to link the configuration to a configurationType
            let configurationTypeName = null

            if (configurationObjectFromGraph["@odata.type"]) {
                configurationTypeName = configurationObjectFromGraph["@odata.type"].replace("#microsoft.graph.", "");
            } else {
                // Graph Exceptions
                // Exception: Some resource do not contain a odata property (example: App Protection Policy)
                // we take the url, use the last part => resource identifier and remove the plural 's' if it exists
                let graphResourceUrlArray = graphResourceUrl.split('/');
                configurationTypeName = graphResourceUrlArray[graphResourceUrlArray.length - 1];
                // get last char
                if (configurationTypeName.slice(-1) == "s") {
                    // remove plurar s
                    configurationTypeName = configurationTypeName.slice(0, -1);
                }
            }

            // check data Type
            if (configurationTypeName) {
                context.log(functionName, "configurationTypeName defined: " + configurationTypeName);

                // find configurationType Id
                let configurationTypes = await ConfigurationType.find({ name: configurationTypeName });
                // context.log("found configurationtypes: " + JSON.stringify(configurationTypes));

                if (configurationTypes.length > 0 && configurationTypes[0].id) {
                    // Create Configuration
                    let addConfigurationResponse = await Configuration.create({
                        graphIsDeleted: false,
                        graphId: configurationObjectFromGraph.id,
                        graphCreatedAt: configurationObjectFromGraph.createdDateTime,
                        configurationType: configurationTypes[0].id,
                        tenant: tenant
                    });

                    // context.log("created new configuration element");
                    // context.log("created configuration response: " + JSON.stringify(addConfigurationResponse));

                    // complete object
                    let configurationObjectFromGraphJSON = JSON.stringify(configurationObjectFromGraph);

                    // configuration added succedfully, add configVersion
                    if (addConfigurationResponse && addConfigurationResponse._id) {
                        response.createdConfigurationId = addConfigurationResponse._id;

                        let addConfigurationVersionResponse = await ConfigurationVersion.create({
                            displayName: configurationObjectFromGraph.displayName,
                            graphModifiedAt: configurationObjectFromGraph.lastModifiedDateTime,
                            value: configurationObjectFromGraphJSON,
                            version: configurationObjectFromGraphVersion,
                            isNewest: true,
                            configuration: addConfigurationResponse._id
                        });

                        if (addConfigurationVersionResponse._id) {
                            response.createdConfigurationVersionId = addConfigurationVersionResponse._id;
                            response.message = configurationObjectFromGraph.displayName + ": saved, new configuration" 
                            return response; // all done
                        }
                        else {
                            context.log.error(configurationObjectFromGraphJSON)
                            return createErrorResponse("error: unable to save configuration version," + configurationObjectFromGraph.displayName, context, functionName)
                        }
                    } else {
                        return createErrorResponse("error: unable to save configuration, " + configurationObjectFromGraph.id, context, functionName)
                    }
                } else {
                    return createErrorResponse("error: configurationType not defined in Db, " + configurationTypeName, context, functionName)
                }
            } else {
                context.log(configurationObjectFromGraph);
                return createErrorResponse('error: configurationType name not defined', context, functionName)
            }
        }
        // ****
        // Existing Configuration
        // Configuration does already exist
        // ****
        else {
            let configuration = configurations[0];
            let newestStoredConfigurationVersion;
            // store version separate -> avoid ts conflict
            let newestStoredConfigurationVersionVersion = null;

            context.log(functionName, "configuration does already exist: " + configuration._id);

            // get newest configuration versions of this configuration
            let storedConfigurationVersions = await ConfigurationVersion.find({ configuration: configuration._id, isNewest: true });
            // context.log("stored version", storedConfigurationVersions[0]);

            // check if object was found and the version property exists
            if (storedConfigurationVersions[0] && storedConfigurationVersions[0].version) {
                newestStoredConfigurationVersion = storedConfigurationVersions[0];
                newestStoredConfigurationVersionVersion = storedConfigurationVersions[0].version;
                // context.log("newest stored version: ", newestStoredConfigurationVersion);
            }

            // context.log("graph hash version", configurationObjectFromGraphVersion);
            // context.log("stored hash version", newestStoredConfigurationVersion.version);

            // ****
            // New Configuration Version
            // New version found, need to add the new version
            // ****
            if (configurationObjectFromGraphVersion != newestStoredConfigurationVersionVersion) {
                // context.log("configuration " + configuration.id + " new version found, add new configuration version");
                let configurationObjectFromGraphJSON = JSON.stringify(configurationObjectFromGraph)

                let addConfigurationVersionResponse = await ConfigurationVersion.create({
                    value: configurationObjectFromGraphJSON,
                    version: configurationObjectFromGraphVersion,
                    configuration: configuration._id,
                    isNewest: true,
                    state: "modified",
                    displayName: configurationObjectFromGraph.displayName,
                    graphModifiedAt: configurationObjectFromGraph.lastModifiedDateTime
                });

                if (addConfigurationVersionResponse._id) {
                    response.createdConfigurationVersionId = addConfigurationVersionResponse._id
                    response.message = configurationObjectFromGraph.displayName + ": saved, new configuration version" 
                }
                else {
                    context.log.error(configurationObjectFromGraphJSON)
                    return createErrorResponse("error: unable to create configuration version, " + configurationObjectFromGraph.displayName, context, functionName);
                }
                // context.log("new version: ", addConfigurationVersionResponse);

                // set active configurationversion to old state if the objects exists
                if (newestStoredConfigurationVersion) {
                    newestStoredConfigurationVersion.isNewest = false;
                    newestStoredConfigurationVersion.save();
                }
            } else {
                response.message = configurationObjectFromGraph.displayName + ": no change, newest configuration version already stored" 
            }
        }
    }
    return response;
};
export default activityFunction;