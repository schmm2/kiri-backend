# kiri-backend
## Development
Local installation
- [Functions Cli](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash#v2)
- [Azure Storage Emulator](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio)
- Yarn
- Nodejs

### Setup
- Git clone
- yarn install
- Start azurite: azurite --silent --location c:\azurite --debug c:\azurite\debug.log
- Create local config file

    {
        "IsEncrypted": false,
        "Values": {
            "AzureWebJobsStorage": "UseDevelopmentStorage=true",
            "AzureWebJobsDashboard": "UseDevelopmentStorage=true"
        },
        "Host": {
            "LocalHttpPort": 7071,
            "CORS": "*"
        }
    }
