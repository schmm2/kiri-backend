/*
    Update Configuration in MEM

    tenantDbId: Update a configuration in the destination Tenant
    configurationVersionDbId: Source configurationVersion db id can be submitted as parameter
    accessToken: Graph API AccessToken
 */

import * as df from "durable-functions"
import { createErrorResponse } from "../utils/createErrorResponse"
import { createSettingsHash } from '../utils/createSettingsHash'
const functionName = "ORC1100MsGraphConfigurationUpdate"

const orchestrator = df.orchestrator(function* (context) {
    // if (!context.df.isReplaying) context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();
    // if (!context.df.isReplaying) context.log(queryParameters);

    let tenantDbId = queryParameters.tenantDbId;
    let configurationVersionDbId = queryParameters.configurationVersionDbId;
    let accessToken = queryParameters.accessToken ? queryParameters.accessToken : null;

    // Create Job
    let jobData = {
        type: "CONFIGURATION_UPDATE",
        state: "STARTED",
        tenant: tenantDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);

    // check parameters
    if (!tenantDbId || !configurationVersionDbId) {
        job.log.push({ message: 'invalid parameters', state: "ERROR" });
        job.state = 'ERROR'
    }
    else {
        job.log.push({ message: 'parameters in order', state: "DEFAULT" });

        // create accesToken if needed
        if (!accessToken) {
            // get Tenant & ccessToken
            let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);
            let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);
            // if (!context.df.isReplaying) context.log(functionName + ", accessToken", accessTokenResponse);

            if (accessTokenResponse.accessToken) {
                accessToken = accessTokenResponse.accessToken;
            }
        }

        if (accessToken) {
            // get full config version object
            let selectedConfigurationVersion = yield context.df.callActivity("ACT1040ConfigurationVersionGetById", configurationVersionDbId);
            let configurationDbId = selectedConfigurationVersion.configuration;
            // if (!context.df.isReplaying) context.log(selectedConfigurationVersion);

            if (selectedConfigurationVersion) {
                // get msgraphresource
                let msGraphResource = yield context.df.callActivity("ACT1060ConfigurationGetMsGraphResource", configurationDbId);
                // if (!context.df.isReplaying) context.log("msGraphResource");
                // if (!context.df.isReplaying) context.log(msGraphResource);

                // Search Destination Configuration via Graph
                let msGetParameter = {
                    graphResourceUrl: msGraphResource.resource,
                    accessToken: accessToken
                }

                // get config from tenant
                let destinationConfigurationSearchFromGraph = yield context.df.callActivity("ACT2001MsGraphGet", msGetParameter);
                // if (!context.df.isReplaying) context.log("config via graph");
                // if (!context.df.isReplaying) context.log(msGraphResource.resource);
                // if (!context.df.isReplaying) context.log(destinationConfigurationSearchFromGraph)

                // healthy graph response
                if (destinationConfigurationSearchFromGraph && destinationConfigurationSearchFromGraph.data) {
                    // filter result by attribut 'displayName' or 'name'
                    let destinationConfigurationFromGraphElement = (destinationConfigurationSearchFromGraph.data.value.filter(config => config.displayName === selectedConfigurationVersion.displayName))[0]
                    if (selectedConfigurationVersion.name) {
                        destinationConfigurationFromGraphElement = (destinationConfigurationSearchFromGraph.data.value.filter(config => config.name === selectedConfigurationVersion.name))[0]
                    }
                    // if (!context.df.isReplaying) context.log(destinationConfigurationFromGraphElement)

                    // destination config already exists, so we need to update -> Patch
                    if (destinationConfigurationFromGraphElement && destinationConfigurationFromGraphElement.id) {
                        job.log.push({ message: 'config found in tenant', state: "DEFAULT" });

                        // preparevalidation data
                        let newConfigurationVersionValue = JSON.parse(selectedConfigurationVersion.value);
                        let dataValidationParameter = {
                            msGraphResourceUrl: msGraphResource.resource,
                            dataObject: newConfigurationVersionValue
                        }
                        let newConfigurationVersionValueValidated = yield context.df.callActivity("ACT2010MsGraphPatchDataValidation", dataValidationParameter);
                        // if (!context.df.isReplaying) context.log("ORC1100MsGraphConfigurationUpdate, data validation parameter", dataValidationParameter);

                        // Get full Object from Tenant
                        // Search Destination Configuration via Graph
                        let configurationGraphUrl = msGraphResource.resource + "/" + destinationConfigurationFromGraphElement.id;

                        let parameter = {
                            graphResourceUrl: configurationGraphUrl,
                            accessToken: accessToken
                        }

                        // get config from tenant
                        let destinationConfigurationFromGraphResponse = yield context.df.callActivity("ACT2001MsGraphGet", parameter);

                        if (destinationConfigurationFromGraphResponse.data) {
                            // define destination url of config
                            let destinationUrl = msGraphResource.resource + "/" + destinationConfigurationFromGraphResponse.data.id;
                            //if (!context.df.isReplaying) context.log(destinationConfigurationFromGraphResponse);

                            // Calculate Hash of Settings to compare it to stored version
                            let configurationFromGraphSettingsHash = createSettingsHash(destinationConfigurationFromGraphResponse.data)
                            // if (!context.df.isReplaying) context.log(configurationFromGraphSettingsHash);

                            // Compare Hash
                            if (configurationFromGraphSettingsHash === selectedConfigurationVersion.version) {
                                // if (!context.df.isReplaying) context.log(functionName, "Tenant Config up to date");
                                job.log.push({ message: selectedConfigurationVersion.displayName + ", config in tenant is up to date", state: "SUCCESS" });
                            } else {
                                job.log.push({ message: 'config needs to be updated', state: "DEFAULT" });
                                let parameter = {
                                    accessToken: accessToken,
                                    dataObject: newConfigurationVersionValueValidated,
                                    msGraphApiUrl: destinationUrl
                                }

                                let msGraphPatchResponse = yield context.df.callActivity("ACT2002MsGraphPatch", parameter);
                                // if (!context.df.isReplaying) context.log("ORC1100MsGraphConfigurationUpdate, patch parameter", patchParameter);
                                // if (!context.df.isReplaying) context.log(parameter)
                                // if (!context.df.isReplaying) context.log(msGraphPatchResponse)

                                if (msGraphPatchResponse.ok) {
                                    job.log.push({ message: 'config updated', state: "SUCCESS" });
                                }
                            }
                        }
                    } else {
                        job.log.push({ message: 'unable to find config tenant, create new config', state: "DEFAULT" });

                        let parameter = {
                            tenantDbId: tenantDbId,
                            configurationVersionDbId: configurationVersionDbId,
                            accessToken: accessToken,
                        }

                        const child_id = context.df.instanceId + `:1101`;
                        let createConfigResponse = yield context.df.callSubOrchestrator("ORC1100MEMConfigurationUpdate", parameter, child_id);
                        // if (!context.df.isReplaying) context.log(createConfigResponse)

                        if (createConfigResponse.id) {
                            job.log.push({ message: 'config created', state: "SUCCESS" });
                        }
                    }
                    job.state = "FINISHED"
                }
                else {
                    job.log.push({ message: 'graph error' + destinationConfigurationSearchFromGraph.message, state: "ERROR" });
                    job.state = "ERROR"
                    if (!context.df.isReplaying) context.log(msGetParameter)
                    if (!context.df.isReplaying) context.log(destinationConfigurationSearchFromGraph)
                }
            } else {
                job.log.push({ message: 'unable to find config in db', state: "ERROR" });
                job.state = "ERROR"
            }
        }
    }

    yield context.df.callActivity("ACT1021JobUpdate", job);

    if (job.state == "ERROR") {
        return createErrorResponse(JSON.stringify(job.log), context, functionName);
    } else {
        return job;
    }
});

export default orchestrator;
