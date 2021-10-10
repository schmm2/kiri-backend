import * as df from "durable-functions"
import { AzureFunction, Context, HttpRequest } from "@azure/functions"

const terminateReason = "stopped by user"

const httpStart: AzureFunction = async function (context: Context, req: HttpRequest): Promise<any> {
    context.log("TRG1002OrchestratorTerminateRunningInstance", "Start");

    const client = df.getClient(context);
    const instances = await client.getStatusAll();
    let terminatedTasks = [];

    await Promise.all(instances.map(async (instance) => {
        if (instance.runtimeStatus === df.OrchestrationRuntimeStatus.Running) {
            //context.log(JSON.stringify(instance));

            terminatedTasks.push({
                name: instance.name,
                instanceId: instance.instanceId,
                createdTime: instance.createdTime,
                lastUpdatedTime: instance.lastUpdatedTime
            })
            await client.terminate(instance.instanceId, terminateReason);
        }
    }));

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: JSON.stringify(terminatedTasks)
    };
};

export default httpStart;