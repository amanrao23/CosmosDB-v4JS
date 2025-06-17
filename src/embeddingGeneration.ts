import { AzureOpenAI } from "openai";
import * as dotenv from "dotenv";
dotenv.config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;

const deployment = "text-embedding-ada-002";
const client = new AzureOpenAI({ apiKey, endpoint, apiVersion: "2023-05-15", deployment });

export async function generateEmbedding(input: string): Promise<number[]> {
    const response = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: input,
        // dimensions: 1536
    });
    if (response.data && response.data[0]?.embedding) {
        return response.data[0].embedding;
    }
    throw new Error("Failed to generate embedding");
}