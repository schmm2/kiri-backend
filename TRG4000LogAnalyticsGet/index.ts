import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { DefaultAzureCredential } from "@azure/identity";
import { Durations, LogsQueryClient, LogsQueryResultStatus, LogsTable } from "@azure/monitor-query";

const logAnalyticsWorkspaceId = process.env["LogAnalyticsWorkspace_ID"];
const logsQueryClient = new LogsQueryClient(new DefaultAzureCredential());

function processTables(context, tablesFromResult: LogsTable[]) {
    let objects = []
    for (const table of tablesFromResult) {

        for (const row of table.rows) {
            let json = {}

            // create a new json object, add column header as attribut to json
            for (let cH = 0; cH < table.columnDescriptors.length; cH++) {
                json[table.columnDescriptors[cH].name] = row[cH]
            }
            objects.push(json)
        }
    }
    return objects
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    // define query
    let kustoQuery = ""

    if (req && req.body && req.body.kustoQuery) {
        kustoQuery = req.body.kustoQuery
    }

    let data = null
    let result = await logsQueryClient.queryWorkspace(logAnalyticsWorkspaceId, kustoQuery, {
        duration: Durations.twentyFourHours
    });

    if (result.status === LogsQueryResultStatus.Success) {
        const tablesFromResult: LogsTable[] = result.tables;

        if (tablesFromResult.length === 0) {
            context.log(`No results for query '${kustoQuery}'`);
            return;
        }
        context.log(`This query has returned table(s)`);
        data = processTables(context, tablesFromResult);
    } else {
        context.log(`Error processing the query '${kustoQuery}' - ${result.partialError}`);
        if (result.partialTables.length > 0) {
            context.log(`This query has also returned partial data in the following table(s)`);
            data = processTables(context, result.partialTables);
        }
    }

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: data
    };

};

export default httpTrigger;