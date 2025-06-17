import { AzureKeyVaultEncryptionKeyResolver, CosmosClient } from '@azure/cosmos';
import { ClientSecretCredential } from '@azure/identity';
import * as dotenv from 'dotenv';
dotenv.config();
const endpoint = process.env.COSMOS_DB_ENDPOINT!;
const key = process.env.COSMOS_DB_KEY!;

let cosmosClient: CosmosClient | null = null;
let encryptedCosmosClient: CosmosClient | null = null;

export function getCosmosClient(): CosmosClient {
    if (!cosmosClient) {
        cosmosClient = new CosmosClient({ endpoint, key });
    }
    return cosmosClient;
}

export function getEncryptedCosmosClient(): CosmosClient {
    if (!encryptedCosmosClient) {
        const keyResolver = new AzureKeyVaultEncryptionKeyResolver(
            new ClientSecretCredential(
                process.env.AZURE_TENANT_ID!,
                process.env.AZURE_CLIENT_ID!,
                process.env.AZURE_CLIENT_SECRET!
            )
        );
        encryptedCosmosClient = new CosmosClient({
            endpoint, key, clientEncryptionOptions: {
                keyEncryptionKeyResolver: keyResolver,
                encryptionKeyTimeToLiveInSeconds: 3600,
            },
        });
    }
    return encryptedCosmosClient;
}