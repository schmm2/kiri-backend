import * as df from "durable-functions"
import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const terminateReason = "stopped by user"
const functionName = "TRG1002OrchestratorTerminateRunningInstance"

const httpStart: AzureFunction = async function (context: Context, req: HttpRequest): Promise<any> {
    context.log(functionName, "Start");

    const client = df.getClient(context);
    const instances = await client.getStatusAll();
    let terminatedTasks = [];
    let purgedTasks = [];

    await Promise.all(instances.map(async (instance) => {
        if (instance.runtimeStatus === df.OrchestrationRuntimeStatus.Running) {
            //context.log(JSON.stringify(instance));
            context.log(functionName, "stop instance: " + instance.name)

            terminatedTasks.push({
                name: instance.name,
                action: "terminated",
                instanceId: instance.instanceId,
                createdTime: instance.createdTime,
                lastUpdatedTime: instance.lastUpdatedTime
            })
            await client.terminate(instance.instanceId, terminateReason);
        }

        if (instance.runtimeStatus === df.OrchestrationRuntimeStatus.Terminated) {
            context.log(functionName, "purge instance: " + instance.name)

            purgedTasks.push({
                name: instance.name,
                action: "purged",
                instanceId: instance.instanceId,
                createdTime: instance.createdTime,
                lastUpdatedTime: instance.lastUpdatedTime
            })
            await client.purgeInstanceHistory(instance.instanceId);
        }
    }));

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: JSON.stringify({ terminated: terminatedTasks, purged: purgedTasks })
    };
};

export default httpStart;