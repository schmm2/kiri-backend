# kiri-backend
## Development
Local installation
- Git
- [Functions Cli](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash#v2)
- [Azure Storage Emulator](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio)
- Yarn
- Nodejs

### Setup
- Git clone
- yarn install
- Create local config file **local.settings.json**

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

- Start azurite: azurite --silent --location c:\azurite --debug c:\azurite\debug.log
- Create file .env
    - Add Mongo Connection string: mongodbConnectionString="string"