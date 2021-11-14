/*
 * Get Deployment from Database -> tenants and configuration ids
 * Check every tenant if the configuration already exists -> Graph API, filter name
 * Update or create the configuration according to API response
 */

import * as df from "durable-functions"
import { createSettingsHash } from '../utils/createSettingsHash'

const orchestrator = df.orchestrator(function* (context) {
    let functionName = "ORC1300DeploymentRun";
    if (!context.df.isReplaying) context.log(functionName, "start");

    const queryParameters: any = context.df.getInput();
    // console.log(queryParameters);

    // get deployment
    let deploymentId = queryParameters.deploymentId;
    let deployment = yield context.df.callActivity("ACT1050DeploymentGetById", deploymentId);

    if (deployment) {
        if (!context.df.isReplaying) context.log(functionName, "found deployment " + deploymentId);

        // get deploymentreference for this deployment
        let deploymentReferences = yield context.df.callActivity("ACT1070DeploymentReferenceByDeploymentId", deploymentId);
        if (!context.df.isReplaying) context.log(deploymentReferences)

        let tenants = deployment.tenants
        let configurationIds = deployment.configurations

        for (let t = 0; t < tenants.length; t++) {
            let tenantId = tenants[t];
            if (!context.df.isReplaying) context.log(functionName, "handle tenant " + tenantId);

            // Get full tenant object
            let tenant = yield context.df.callActivity("ACT1030TenantGetById", tenantId);

            // Create Job
            let jobData = {
                type: "DEPLOYMENT",
                state: "STARTED",
                tenant: tenantId
            };

            let job = yield context.df.callActivity("ACT1020JobCreate", jobData);
            //if (!context.df.isReplaying) context.log("new job", job);

            let accessTokenResponse = yield context.df.callActivity("ACT2001MsGraphAccessTokenCreate", tenant);

            if (accessTokenResponse && accessTokenResponse.body) {
                if (accessTokenResponse.body.ok) {
                    if (!context.df.isReplaying) context.log(functionName, "got an accessToken");

                    for (let c = 0; c < configurationIds.length; c++) {
                        let configurationId = configurationIds[c];

                        // find deploymentReference per tenant and sourceConfiguration
                        let deploymentRefencesFiltered = deploymentReferences.filter(item => (item.sourceConfiguration === configurationId && item.tenant === tenant._id));
                        if (!context.df.isReplaying) context.log(deploymentRefencesFiltered)

                        // get full configuration
                        let configuration = yield context.df.callActivity("ACT1061ConfigurationGetById", configurationId);
                        //if (!context.df.isReplaying) context.log(configuration);

                        // get full configurationVersion
                        let newestConfigurationVersion = yield context.df.callActivity("ACT1062ConfigurationGetNewestConfigurationVersion", configurationId);
                        if (!context.df.isReplaying) context.log("yyyyyyyyyyyyyy");
                        if (!context.df.isReplaying) context.log(newestConfigurationVersion);

                        // get msgraphresource
                        let msGraphResource = yield context.df.callActivity("ACT1060ConfigurationGetMsGraphResource", configurationId);
                        //if (!context.df.isReplaying) context.log(msGraphResource);

                        // no deployment reference stored yet
                        if (deploymentRefencesFiltered.length == 0) {
                            // create destination policy
                            let payload = {
                                tenantDbId: tenant._id,
                                msGraphResourceUrl: msGraphResource.resource,
                                configurationVersionDbId: newestConfigurationVersion._id,
                                configurationName: newestConfigurationVersion.displayName
                            }

                            if (!context.df.isReplaying) context.log("--------- Create Config in Tenant ----------");
                            if (!context.df.isReplaying) context.log(payload);
                            const child_id = context.df.instanceId + '1';
                            let createdConfiguration = yield context.df.callSubOrchestrator("ORC1101MEMConfigurationCreate", payload, child_id);
                            if (!context.df.isReplaying) context.log("aaaaaaaaaaaaaaaaaaaaaaaa");
                            if (!context.df.isReplaying) context.log(createdConfiguration);

                            if (createdConfiguration.id) {
                                // store in database
                                let newConfigParameter = {
                                    graphValue: createdConfiguration,
                                    graphResourceUrl: msGraphResource.resource,
                                    tenant: tenant
                                }
                                let newConfigResponseResponse = yield context.df.callActivity("ACT3001AzureDataCollectHandleConfiguration", newConfigParameter);
                                if (!context.df.isReplaying) context.log("eeeeeeeeeeeeeeeeeeeeee")
                                if (!context.df.isReplaying) context.log(newConfigResponseResponse)

                                if (newConfigResponseResponse) {

                                    // add deploymentReference
                                    let deploymentReference = {
                                        tenant: tenant._id,
                                        sourceConfiguration: configurationId,
                                        destinationConfiguration: newConfigResponseResponse._id,
                                        deployment: deploymentId
                                    }
                                    if (!context.df.isReplaying) context.log("ccccccccccccccccc");
                                    if (!context.df.isReplaying) context.log(deploymentReference);

                                    let deploymentReferenceResponse = yield context.df.callActivity("ACT1071DeploymentReferenceCreate", deploymentReference);
                                    if (!context.df.isReplaying) context.log("bbbbbbbbbbbbbbbbbbb");
                                    if (!context.df.isReplaying) context.log(deploymentReferenceResponse);
                                }
                            }
                        } else {
                            if (!context.df.isReplaying) context.log("iiiiiiiiiii");
                            if (!context.df.isReplaying) context.log("already stored");

                            let deploymentReference = deploymentRefencesFiltered[0];
                            if (!context.df.isReplaying) context.log("mmmmmmmmmmmmmmmmmmm")
                            if (!context.df.isReplaying) context.log(deploymentReference)
                            // ### Compare Settings Values
                            // # Get Settings from Destination Configuration

                            if (deploymentReference.destinationConfiguration) {
                                // get full configuration
                                let destinationConfigurationInDB = yield context.df.callActivity("ACT1061ConfigurationGetById", deploymentReference.destinationConfiguration);
                                if (!context.df.isReplaying) context.log("sssssssssssss");
                                if (!context.df.isReplaying) context.log(destinationConfigurationInDB);

                                // get full configurationVersion
                                let newestConfigurationVersion = yield context.df.callActivity("ACT1062ConfigurationGetNewestConfigurationVersion", destinationConfigurationInDB._id);
                                if (!context.df.isReplaying) context.log("ttttttttttttt");
                                if (!context.df.isReplaying) context.log(newestConfigurationVersion);

                                if (destinationConfigurationInDB) {
                                    //let destinationConfigurationValue = JSON.parse(deploymentReference.destinationConfiguration.value)
                                    let configurationGraphUrl = msGraphResource.resource + "/" + destinationConfigurationInDB.graphId

                                    let payload = {
                                        graphResourceUrl: configurationGraphUrl,
                                        accessToken: accessTokenResponse.body.accessToken
                                    }

                                    if (!context.df.isReplaying) context.log(payload);
                                    let destinationConfigurationFromGraph = yield context.df.callActivity("ACT2000MsGraphQuery", payload);
                                    if (!context.df.isReplaying) context.log("dddddddddddddd");
                                    if (!context.df.isReplaying) context.log(destinationConfigurationFromGraph);

                                    let configurationFromGraphSettingsHash = createSettingsHash(destinationConfigurationFromGraph.result)
                                    if (!context.df.isReplaying) context.log(configurationFromGraphSettingsHash);

                                    if (configurationFromGraphSettingsHash === newestConfigurationVersion.version) {
                                        if (!context.df.isReplaying) context.log("Tenant Config up to date");
                                    } else {
                                        let payload = {
                                            tenantDbId: tenant._id,
                                            msGraphResourceUrl: msGraphResource.resource,
                                            configurationVersionDbId: newestConfigurationVersion._id,
                                        }
                                        if (!context.df.isReplaying) context.log("--------- Update Config in Tenant ----------");
                                        if (!context.df.isReplaying) context.log(payload);
                                        const child_id = context.df.instanceId + 'aaaaa';
                                        let updatedConfiguration = yield context.df.callSubOrchestrator("ORC1100MEMConfigurationUpdate", payload, child_id);
                                        if (!context.df.isReplaying) context.log("rrrrrrrrrrrrrrrrr");
                                        if (!context.df.isReplaying) context.log(updatedConfiguration);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return null;
});

export default orchestrator;
