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
import createSubTasksForEachItem from "../utils/createSubTasksForEachItem"

const orchestrator = df.orchestrator(function* (context) {
    const outputs = [];

    const queryParameters: any = context.df.getInput();
    // if (!context.df.isReplaying) context.log(queryParameters);

    let tenantDbId = queryParameters.tenantDbId;
    let accessToken = queryParameters.accessToken ? queryParameters.accessToken : null;

    // Create Job
    let jobData = {
        type: "CONFIGURATION_CREATE_TEST",
        state: "STARTED",
        tenant: tenantDbId
    };
    let job = yield context.df.callActivity("ACT1020JobCreate", jobData);

    // get Tenant
    let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantDbId);

    // get accessToken if needed, not executed if received an accessToken via Parameter
    if (!accessToken) {
        // get Tenant & accessToken

        let accessTokenResponse = yield context.df.callActivity("ACT2000MsGraphAccessTokenCreate", tenant);
        // if (!context.df.isReplaying) context.log(functionName + ", accessToken", accessTokenResponse);

        if (accessTokenResponse.accessToken) {
            accessToken = accessTokenResponse.accessToken;
        }
    }

    let allreadyTestedConfigurationTypes = []

    // AccessToken available
    if (accessToken) {
        // get all configs of tenant
        let configurations = yield context.df.callActivity("ACT1064ConfigurationGetByTenant", tenantDbId);

        for (let index = 0; index < configurations.length; index++) {
            const configuration = configurations[index]

            // lookup list if we tested this type already
            const alreadyTestedConfigurationType = allreadyTestedConfigurationTypes.some(el => el === configuration.configurationType);

            if (!alreadyTestedConfigurationType) {
                allreadyTestedConfigurationTypes.push(configuration.configurationType);
                job.log.push({ message: 'start test configTypeId: ' + configuration.configurationType, state: 'DEFAULT' })

                let configurationVersion = yield context.df.callActivity("ACT1062ConfigurationGetNewestConfigurationVersion", configuration._id);
                let child_id = configurationVersion._id

                let parameter = {
                    accessToken: accessToken,
                    tenantDbId: tenantDbId,
                    configurationVersionDbId: configurationVersion._id,
                    configurationName: configurationVersion.displayName,
                    whatif: true
                }
                yield context.df.callSubOrchestrator("ORC1101MEMConfigurationCreate", parameter, child_id);
            }
        }
    }

    job.log.push({ message: 'tasks finished', state: "SUCCESS" });
    job.state = "FINISHED"
    let updatedJobResponse = yield context.df.callActivity("ACT1021JobUpdate", job);

    return outputs;
});

export default orchestrator;
