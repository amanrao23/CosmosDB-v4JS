import { BulkOperationType, ClientEncryptionIncludedPath, ClientEncryptionPolicy, Container, EncryptionAlgorithm, EncryptionKeyResolverName, EncryptionKeyWrapMetadata, EncryptionType, KeyEncryptionAlgorithm, OperationInput } from "@azure/cosmos";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { getEncryptedCosmosClient } from "./cosmosClient";
dotenv.config();

const databaseId = process.env.COSMOS_DB_DATABASE_ID!;
const containerId = process.env.COSMOS_DB_RAW_CONTAINER_ID!;

async function main() {
    const container = await createEncryptedContainer();
    const filePath = "data/movies.json";
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    const movies = JSON.parse(fileContent);

    const operationInput: OperationInput[] = movies.map((movie: any) => {
        const id = uuidv4();
        movie.id = id;
        return {
            operationType: BulkOperationType.Create,
            resourceBody: movie,
            partitionKey: movie.id,
        };
    });
    const res = await container.items.executeBulkOperations(operationInput);
    console.log("Bulk upload completed");
}

async function createEncryptedContainer(): Promise<Container> {

    const client = getEncryptedCosmosClient();
    const { database } = await client.databases.createIfNotExists({ id: databaseId });

    const metadata: EncryptionKeyWrapMetadata = {
        type: EncryptionKeyResolverName.AzureKeyVault,
        name: "akvKey",
        value: process.env.KEY_VAULT_KEY_PATH!, // key-vault url
        algorithm: KeyEncryptionAlgorithm.RSA_OAEP,
    };
    // Create a client encryption key
    await database.createClientEncryptionKey(
        "cek1",
        EncryptionAlgorithm.AEAD_AES_256_CBC_HMAC_SHA256,
        metadata,
    );
    const paths = ["/licensing"].map(
        (path) =>
            ({
                path: path,
                clientEncryptionKeyId: "cek1",
                encryptionType: EncryptionType.DETERMINISTIC,
                encryptionAlgorithm: EncryptionAlgorithm.AEAD_AES_256_CBC_HMAC_SHA256,
            }) as ClientEncryptionIncludedPath,
    );
    const clientEncryptionPolicy: ClientEncryptionPolicy = {
        includedPaths: paths,
        policyFormatVersion: 2,
    };

    const containerDefinition = {
        id: containerId,
        partitionKey: {
            paths: ["/id"],
        },
        clientEncryptionPolicy: clientEncryptionPolicy,
        throughput: 11000
    };
    // Create the container with client encryption policy
    const { container } = await database.containers.createIfNotExists(containerDefinition);
    return container;
}


main().catch((err) => {
    console.error("Error uploading data:", err);
    process.exit(1);
});
