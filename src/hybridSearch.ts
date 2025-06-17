import { Container } from "@azure/cosmos";
import * as dotenv from "dotenv";
import { getCosmosClient } from "./cosmosClient";
import { generateEmbedding } from "./embeddingGeneration";
dotenv.config();

const client = getCosmosClient();
const databaseId = process.env.COSMOS_DB_DATABASE_ID!;
const containerId = process.env.COSMOS_DB_VECTOR_CONTAINER_ID!;

async function main() {
    const res = await queryVectorData();
    console.log(res, "Query Result");
}

async function queryVectorData(): Promise<any[]> {
    const container = await getContainer();
    const inputString = "World War II";
    const embedding = await generateEmbedding(inputString);
    const sqlQuerySpec1 = {
        query: "SELECT TOP 20 c.title FROM c ORDER BY VectorDistance(c.embedding, @embedding)",
        parameters: [
            {
                name: "@embedding", value: embedding
            }
        ]
    }
    const sqlQuerySpec2 = {
        query: "SELECT TOP 3 c.title FROM c where FullTextContains(c.director, 'Spielberg') ORDER BY VectorDistance(c.embedding, @embedding)",
        parameters: [
            {
                name: "@embedding", value: embedding
            }
        ]
    }
    const sqlQuerySpec3 = {
        query: "SELECT TOP 20 c.title FROM c ORDER BY VectorDistance(c.embedding, @embedding)",
        parameters: [
            {
                name: "@embedding", value: embedding
            }
        ]
    }
    const res = await container.items.query(sqlQuerySpec2).fetchAll();
    return res.resources;
}

async function getContainer(): Promise<Container> {
    const client = getCosmosClient();
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
