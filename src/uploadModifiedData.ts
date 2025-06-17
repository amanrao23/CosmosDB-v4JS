import { BulkOperationType, OperationInput, ChangeFeedIteratorOptions, ChangeFeedStartFrom, StatusCodes, VectorEmbeddingDataType, VectorEmbeddingDistanceFunction, VectorIndexType } from "@azure/cosmos";
import * as dotenv from "dotenv";
import { getEncryptedCosmosClient } from "./cosmosClient";
import { sleep } from "./utils";
import { Movie, RawMovie } from "../models/movie";
import { generateEmbedding } from "./embeddingGeneration"; // Assuming you have an embedding service to generate embeddings
dotenv.config();

const encryptedCosmosClient = getEncryptedCosmosClient();

const database = encryptedCosmosClient.database(process.env.COSMOS_DB_DATABASE_ID!);
const rawContainer = database.container(process.env.COSMOS_DB_RAW_CONTAINER_ID!);

async function main() {
    let continuationToken = undefined;
    while (true) {
        const { movies, continuationToken: newContinuationToken } = await readDataUsingChangeFeed(continuationToken ?? undefined);
        if (movies.length === 0) {
            await sleep(10000); // Wait for 10 seconds before checking again
            continue;
        }
        continuationToken = newContinuationToken;
        const newMovieData = await modifyMovieData(movies);
        const vectorContainer = await getVectorContainer();
        const res = await Promise.all(
            newMovieData.map(async (movie) => {
                return await vectorContainer.items.create(movie);
            })
        );
        console.log(new Date().toISOString(), "Processed", newMovieData.length, "movies");
    }
}

async function modifyMovieData(movies: RawMovie[]): Promise<Movie[]> {
    const modifiedMovies = await Promise.all(
        movies.map(async (movie) => {
            const embedding = await generateEmbedding(movie.synopsis); // Generate embedding
            const { licensing, ...movieWithoutLicensing } = movie; // Exclude licensing
            return {
                ...movieWithoutLicensing,
                embedding,
            };
        })
    );
    return modifiedMovies;
}

async function readDataUsingChangeFeed(continuation: string | undefined): Promise<{ movies: any[]; continuationToken: string | null }> {
    const cfOptions: ChangeFeedIteratorOptions = {
        maxItemCount: 100,
        changeFeedStartFrom: continuation ? ChangeFeedStartFrom.Continuation(continuation) : ChangeFeedStartFrom.Beginning(),
    };

    let continuationToken: string | null = null;
    const iterator = rawContainer.items.getChangeFeedIterator(cfOptions);
    const movies = [];

    const res = await iterator.readNext();
    if (res.statusCode === StatusCodes.NotModified) {
        console.log("No new results");
        continuationToken = res.continuationToken || null;
    }

    if (res.result && res.result.length > 0) {
        console.log("New results found:", res.result.length);
        movies.push(...res.result);
    }

    continuationToken = res.continuationToken || null; // Update the continuation token

    return { movies, continuationToken };
}

async function getVectorContainer() {
    const { database } = await encryptedCosmosClient.databases.createIfNotExists({ id: process.env.COSMOS_DB_DATABASE_ID! });
    const { container } = await database.containers.createIfNotExists({
        id: process.env.COSMOS_DB_VECTOR_CONTAINER_ID!,
        throughput: 11000,
        partitionKey: {
            paths: ["/id"],
        },
        fullTextPolicy: {
            defaultLanguage: "en-US",
            fullTextPaths: [
                { path: "/title", language: "en-US" },
                { path: "/director", language: "en-US" },
            ],
        },
        vectorEmbeddingPolicy: {
            vectorEmbeddings: [
                {
                    path: "/embedding",
                    dataType: VectorEmbeddingDataType.Float32,
                    dimensions: 1536,
                    distanceFunction: VectorEmbeddingDistanceFunction.Cosine,
                },
            ],
        },
        indexingPolicy: {
            vectorIndexes: [
                {
                    path: "/embedding",
                    type: VectorIndexType.QuantizedFlat
                }
            ]
        }
    });
    return container;
}
main().catch((err) => {
    console.error("Error uploading data:", err);
    process.exit(1);
});
