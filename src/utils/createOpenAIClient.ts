// src/utils/createOpenAIClient.ts (server-side utility)

import { OpenAI } from "openai";

export const getOpenAIClient = () => {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT as string;
  const apiKey = process.env.AZURE_OPENAI_API_KEY as string;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION as string;

  const openai = new OpenAI({
    apiKey, // required by SDK type, but Azure uses `api-key` header below
    baseURL: `${endpoint}/openai`,
    defaultQuery: { "api-version": apiVersion },
    defaultHeaders: { "api-key": apiKey },
    dangerouslyAllowBrowser: true, // mirrors prior behavior in your app
  });
  return openai;
};