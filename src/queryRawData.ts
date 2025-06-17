import { ClientEncryptionIncludedPath, ClientEncryptionPolicy, Container, EncryptionAlgorithm, EncryptionKeyResolverName, EncryptionKeyWrapMetadata, EncryptionType, KeyEncryptionAlgorithm, OperationInput } from "@azure/cosmos";
import * as dotenv from "dotenv";
import { getCosmosClient, getEncryptedCosmosClient } from "./cosmosClient";
dotenv.config();

const client = getCosmosClient();
const databaseId = process.env.COSMOS_DB_DATABASE_ID!;
const containerId = process.env.COSMOS_DB_RAW_CONTAINER_ID!;

async function main() {
    const res = await queryRawData();
    console.log(res.resources, "Query Result");
}

async function queryRawData(): Promise<any> {
    const container = await getEncryptedContainer();
    const sqlQuerySpec = {
        query: "SELECT * FROM c WHERE c.title = @title",
        parameters: [
            {
                name: "@title", value: "The Hidden Virtue"
            }
        ]
    }
    const res = await container.items.query(sqlQuerySpec).fetchAll();
    return res;
}

async function getEncryptedContainer(): Promise<Container> {

    const client = getEncryptedCosmosClient();
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    const { container } = await database.containers.createIfNotExists({
        id: containerId
    });

    return container;
}

main().catch((err) => {
    console.error("Error uploading data:", err);
    process.exit(1);
});
