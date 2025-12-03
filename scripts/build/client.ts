import axios, { type AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import { createRequire } from "module";
import { info } from "./utils.js";

// Handle CommonJS default export - axios-rate-limit is CommonJS
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rateLimit = require("axios-rate-limit") as <T extends AxiosInstance>(
    axiosInstance: T,
    options: {
        maxRequests?: number;
        perMilliseconds?: number;
        maxRPS?: number;
    }
) => T;

/**
 * Creates a rate-limited axios instance for downloading SVG files.
 * Rate limits to 50 requests per second (configurable via SVG_DOWNLOAD_RPS env var) and retries on 429 errors.
 */
export function createSvgClient(): AxiosInstance {
    const maxRPS = process.env["SVG_DOWNLOAD_RPS"]
        ? Number.parseInt(process.env["SVG_DOWNLOAD_RPS"], 10)
        : 50;
    const svgDownloader = rateLimit(axios.create(), {
        maxRequests: maxRPS,
        perMilliseconds: 1000,
    });

    // Add retry logic for SVG downloads
    axiosRetry(svgDownloader, {
        retries: 3,
        retryCondition: (error) => {
            return error.response?.status === 429;
        },
        retryDelay: (retryCount) => axiosRetry.exponentialDelay(retryCount),
    });

    return svgDownloader;
}

/**
 * Creates an axios instance for Figma API calls with retry logic.
 * Retries on 429 errors and respects the Retry-After header from Figma API responses.
 */
export function createFigmaClient(): AxiosInstance {
    const figmaDownloader = axios.create({
        baseURL: "https://api.figma.com/v1",
        headers: { "X-Figma-Token": process.env["FIGMA_ACCESS_TOKEN"] },
    });

    // Add retry logic for Figma API calls that respects Retry-After header
    axiosRetry(figmaDownloader, {
        retries: 3,
        retryCondition: (error) => {
            return error.response?.status === 429;
        },
        retryDelay: (_retryCount, error) => {
            // Retry-After is an integer in seconds, convert to milliseconds
            const retryAfter = error.response?.headers["retry-after"] as
                | string
                | undefined;
            const retryAfterSeconds = Number.parseInt(String(retryAfter), 10);
            const delaySeconds = Math.min(retryAfterSeconds, 60); // Cap at 60 seconds
            info(
                `Rate limited by Figma API. Retrying after ${delaySeconds} seconds...`
            );
            return delaySeconds * 1000;
        },
    });

    return figmaDownloader;
}
