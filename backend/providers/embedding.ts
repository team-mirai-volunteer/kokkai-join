/**
 * Embedding Provider Abstraction
 *
 * This module provides an abstraction layer for embedding generation,
 * allowing switching between different embedding providers (Ollama, OpenAI, etc.)
 */

import { OllamaEmbedding } from "@llamaindex/ollama";
import { Settings } from "llamaindex";
import { OpenAI } from "openai";
import { ensureEnv } from "../utils/env.js";

/**
 * Interface for embedding providers
 */
export interface EmbeddingProvider {
  /**
   * Generate embedding for a single text
   * @param text The text to embed
   * @returns The embedding vector
   */
  getTextEmbedding(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts
   * @param texts Array of texts to embed
   * @returns Array of embedding vectors
   */
  getTextEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * Configuration for Ollama embedding provider
 */
export interface OllamaEmbeddingConfig {
  type: "ollama";
  model: string;
  baseUrl: string;
}

/**
 * Configuration for Novita embedding provider (OpenAI-compatible)
 */
export interface NovitaEmbeddingConfig {
  type: "novita";
  model: string;
  apiKey: string;
  baseUrl: string;
}

/**
 * Ollama Embedding Provider
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private embedModel: OllamaEmbedding;
  private modelName: string;
  private baseUrl: string;

  constructor(config: OllamaEmbeddingConfig) {
    this.modelName = config.model;
    this.baseUrl = config.baseUrl;
    this.embedModel = new OllamaEmbedding({
      model: this.modelName,
      config: {
        host: this.baseUrl,
      },
    });
    Settings.embedModel = this.embedModel;
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    return await this.embedModel.getTextEmbedding(text);
  }

  async getTextEmbeddings(texts: string[]): Promise<number[][]> {
    return await this.embedModel.getTextEmbeddings(texts);
  }
}

/**
 * Novita Embedding Provider (OpenAI-compatible service)
 */
export class NovitaEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private modelName: string;
  private baseUrl: string;

  constructor(config: NovitaEmbeddingConfig) {
    this.modelName = config.model;
    this.baseUrl = config.baseUrl;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: this.baseUrl,
    });
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      input: text,
      model: this.modelName,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error("Failed to get embedding from response");
    }
    return embedding;
  }

  async getTextEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      input: texts,
      model: this.modelName,
    });

    return response.data.map((item) => item.embedding);
  }
}

/**
 * Configuration for embedding provider factory
 */
export type EmbeddingProviderConfig =
  | OllamaEmbeddingConfig
  | NovitaEmbeddingConfig;

/**
 * Factory for creating embedding providers
 */
export class EmbeddingProviderFactory {
  /**
   * Create an embedding provider based on configuration
   * @param config The provider configuration
   * @returns The embedding provider instance
   */
  static create(config: EmbeddingProviderConfig): EmbeddingProvider {
    switch (config.type) {
      case "ollama":
        return new OllamaEmbeddingProvider(config);
      case "novita":
        return new NovitaEmbeddingProvider(config);
      default:
        throw new Error(`Unknown embedding provider type: ${config}`);
    }
  }

  /**
   * Create an embedding provider from environment variables
   * @returns The embedding provider instance
   */
  static createFromEnv(): EmbeddingProvider {
    const providerType = process.env.EMBEDDING_PROVIDER;
    console.log(
      `Using embedding provider: ${providerType || "ollama (default)"}`,
    );

    if (providerType === "novita") {
      // Novita provider (OpenAI-compatible)
      const apiKey = ensureEnv("EMBEDDING_API_KEY");
      const model = ensureEnv("EMBEDDING_MODEL");
      const baseUrl = ensureEnv("EMBEDDING_BASE_URL");

      return EmbeddingProviderFactory.create({
        type: "novita",
        model,
        apiKey,
        baseUrl,
      });
    } else {
      // Default to Ollama
      const model = ensureEnv("OLLAMA_EMBEDDING_MODEL");
      const baseUrl = ensureEnv("OLLAMA_BASE_URL");

      return EmbeddingProviderFactory.create({
        type: "ollama",
        model,
        baseUrl,
      });
    }
  }
}
