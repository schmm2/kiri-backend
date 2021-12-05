/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 * Before running this sample, please:
 * - create a Durable activity function (default name is "Hello")
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your 
 *    function app in Kudu
 */

import * as df from "durable-functions"
import { createErrorResponse } from "../utils/createErrorResponse"
const functionName = "ORC1100MsGraphConfigurationUpdate"

const orchestrator = df.orchestrator(function* (context) {
    if (!context.df.isReplaying) context.log(functionName, "start");
    let response = "";

    const queryParameters: any = context.df.getInput();
    // if (!context.df.isReplaying) context.log(queryParameters);

    let tenantDbId = queryParameters.tenantDbId;
    let configurationVersionDbId = queryParameters.configurationVersionDbId;
    let msGraphResourceUrl = queryParameters.msGraphResourceUrl;
    let accessToken = queryParameters.accessToken ? queryParameters.accessToken : null;

    // Create Job
    let jobData = {
        type: "CONFIGURATION_UPDATE",
        state: "STARTED",
        tenant: tenantDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);

    // check parameters
    if (!configurationVersionDbId || !tenantDbId || !msGraphResourceUrl) {
        job.log.push({ message: 'invalid parameters', state: "ERROR" });
        job.state = 'ERROR'
    }
    else {
        // get accessToken if needed, not executed if received an accessToken via Parameter
        if (!accessToken) {
            // get Tenant
            let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);

            // get accessToken
            let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);
            // if (!context.df.isReplaying) context.log("ORC1100MsGraphConfigurationUpdate, accessTokenResponse", accessTokenResponse);

            if (accessTokenResponse.accessToken) {
                accessToken = accessTokenResponse.accessToken;
            }
        }

        if (accessToken) {
            if (!context.df.isReplaying) context.log(functionName, "acccesToken available");

            // get ConfigurationVersion
            let newConfigurationVersion = yield context.df.callActivity("ACT1040ConfigurationVersionGetById", configurationVersionDbId);

            if (newConfigurationVersion) {
                // if (!context.df.isReplaying) context.log("ORC1100MsGraphConfigurationUpdate, new Configuration Version", newConfigurationVersion);
                // if (!context.df.isReplaying) context.log(functionName, "configurationVersion ok");

                let newConfigurationVersionValue = JSON.parse(newConfigurationVersion.value);

                let dataValidationParameter = {
                    msGraphResourceUrl: msGraphResourceUrl,
                    dataObject: newConfigurationVersionValue
                }

                // if (!context.df.isReplaying) context.log("ORC1100MsGraphConfigurationUpdate, data validation parameter", dataValidationParameter);
                let newConfigurationVersionValueValidated = yield context.df.callActivity("ACT2010MsGraphPatchDataValidation", dataValidationParameter);

                let patchParameter = {
                    accessToken: accessToken,
                    dataObject: newConfigurationVersionValueValidated,
                    msGraphApiUrl: msGraphResourceUrl + "/" + newConfigurationVersionValueValidated.id
                }

                // if (!context.df.isReplaying) context.log("ORC1100MsGraphConfigurationUpdate, patch parameter", patchParameter);
                let msGraphPatchResponse = yield context.df.callActivity("ACT2002MsGraphPatch", patchParameter);
                response = msGraphPatchResponse;

                // if (!context.df.isReplaying) context.log(msGraphPatchResponse);

                if (!msGraphPatchResponse.ok) {
                    job.log.push({ message: 'error msGraph Post', state: "ERROR" });
                    job.log.push({ message: msGraphPatchResponse.message, state: "ERROR" });
                    job.state = 'ERROR'
                } else {
                    //if (!context.df.isReplaying) context.log(msGraphPatchResponse)
                    //job.message = msGraphPatchResponse

                    // group policy objects need to be handled differently, need to change definitionValues too
                    if (msGraphResourceUrl == "/deviceManagement/groupPolicyConfigurations" &&
                        (newConfigurationVersionValue.gpoSettings && newConfigurationVersionValue.gpoSettings.length > 0)) {

                        let groupPolicyUrl = "/deviceManagement/groupPolicyConfigurations/" + newConfigurationVersionValue.id + "/definitionValues";

                        // first query all defined active definitonValues
                        let graphQueryDefinitionValues = {
                            graphResourceUrl: groupPolicyUrl,
                            accessToken: accessToken
                        }

                        // query existing ids
                        let definitionValuesResponse = yield context.df.callActivity("ACT2001MsGraphGet", graphQueryDefinitionValues);

                        if (definitionValuesResponse.ok) {
                            let definitonValues = definitionValuesResponse.data.value;
                            // extract all ids
                            let definitonValuesIds = definitonValues.map(definitonValue => definitonValue.id);
                            let updateDefinitionValuesUrl = "/deviceManagement/groupPolicyConfigurations/" + newConfigurationVersionValue.id + "/updateDefinitionValues"

                            // delete all existing definitionValues
                            let deleteDefinitionValuesPayload = {
                                "added": [],
                                "updated": [],
                                "deletedIds": definitonValuesIds
                            }

                            let graphPostDefinitionValues = {
                                msGraphApiUrl: updateDefinitionValuesUrl,
                                accessToken: accessToken,
                                dataObject: deleteDefinitionValuesPayload
                            }
                            // delete existing ids
                            if (!context.df.isReplaying) context.log(graphPostDefinitionValues);
                            let deleteDefinitionValuesResponse = yield context.df.callActivity("ACT2003MsGraphPost", graphPostDefinitionValues);
                            if (!context.df.isReplaying) context.log(deleteDefinitionValuesResponse);

                            // add new definitionValues
                            for (let i = 0; i < newConfigurationVersionValue.gpoSettings.length; i++) {
                                let gpoSetting = newConfigurationVersionValue.gpoSettings[i];

                                let newGpoDefinitionValue = {
                                    msGraphApiUrl: groupPolicyUrl,
                                    accessToken: accessToken,
                                    dataObject: gpoSetting
                                }
                                let createDefinitionValuesResponse = yield context.df.callActivity("ACT2003MsGraphPost", newGpoDefinitionValue);
                            }
                        }
                    }
                    job.log.push({ message: 'msGraph Patch ok', state: "SUCCESS" });
                    job.state = 'FINISHED'
                }
            }
            else {
                job.log.push({ message: 'Invalid Parameters, unable to find configurationVersion', state: "ERROR" });
                job.state = 'ERROR'
            }
        } else {
            job.log.push({ message: 'unable to aquire accessToken', state: "ERROR" });
            job.state = 'ERROR'
        }
    }

    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", job);
    // if (!context.df.isReplaying) context.log(updatedJobResponse);

    if (job.state == "ERROR") {
        return createErrorResponse(JSON.stringify(job.log), context, functionName);
    } else {
        return job;
    }
});

export default orchestrator;
