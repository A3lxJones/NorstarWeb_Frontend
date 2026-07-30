/**
 * Safe in-process request dispatcher.
 *
 * Invokes an Express app directly (no network, no listening socket) using real
 * Node http request/response objects whose write path is overridden ONLY at the
 * instance level. Unlike light-my-request, it never mutates shared prototypes,
 * so it is safe to use inside a process that is also serving real HTTP traffic
 * (local dev and Vercel serverless alike).
 */
import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";

type AppLike = (req: IncomingMessage, res: ServerResponse) => void;

export interface DispatchOptions {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    payload?: string;
}

export interface DispatchResult {
    statusCode: number;
    headers: Record<string, string | string[] | number | undefined>;
    payload: string;
}

function toBuffer(chunk: unknown, encoding?: unknown): Buffer | null {
    if (chunk === null || chunk === undefined) return null;
    if (Buffer.isBuffer(chunk)) return chunk;
    const enc = typeof encoding === "string" ? (encoding as BufferEncoding) : "utf8";
    return Buffer.from(chunk as string, enc);
}

export function dispatch(app: AppLike, opts: DispatchOptions): Promise<DispatchResult> {
    return new Promise((resolve, reject) => {
        const socket = new Socket();
        const req = new IncomingMessage(socket);
        req.method = (opts.method ?? "GET").toUpperCase();
        req.url = opts.url;
        req.httpVersion = "1.1";
        req.httpVersionMajor = 1;
        req.httpVersionMinor = 1;

        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(opts.headers ?? {})) {
            headers[key.toLowerCase()] = value;
        }
        const payload = opts.payload ?? "";
        if (payload && headers["content-length"] === undefined) {
            headers["content-length"] = Buffer.byteLength(payload).toString();
        }
        req.headers = headers;

        const res = new ServerResponse(req);
        const chunks: Buffer[] = [];
        let settled = false;

        const finish = (): void => {
            if (settled) return;
            settled = true;
            resolve({
                statusCode: res.statusCode,
                headers: res.getHeaders(),
                payload: Buffer.concat(chunks).toString("utf8"),
            });
        };

        // Instance-level overrides — shadow the prototype without mutating it.
        /* eslint-disable @typescript-eslint/no-explicit-any */
        res.writeHead = function (statusCode: number, ...args: any[]): any {
            res.statusCode = statusCode;
            const headerArg = args.find((a) => a && typeof a === "object");
            if (headerArg) {
                for (const [key, value] of Object.entries(headerArg)) {
                    res.setHeader(key, value as any);
                }
            }
            return res;
        } as any;

        res.write = function (chunk: any, encoding?: any, cb?: any): boolean {
            const buf = toBuffer(chunk, encoding);
            if (buf) chunks.push(buf);
            const done = typeof encoding === "function" ? encoding : cb;
            if (typeof done === "function") done();
            return true;
        } as any;

        res.end = function (chunk?: any, encoding?: any, cb?: any): any {
            if (typeof chunk === "function") {
                cb = chunk;
                chunk = undefined;
            } else if (typeof encoding === "function") {
                cb = encoding;
                encoding = undefined;
            }
            const buf = toBuffer(chunk, encoding);
            if (buf) chunks.push(buf);
            res.emit("finish");
            finish();
            if (typeof cb === "function") cb();
            return res;
        } as any;
        /* eslint-enable @typescript-eslint/no-explicit-any */

        req.on("error", reject);
        res.on("error", reject);

        try {
            app(req, res);
        } catch (err) {
            reject(err);
            return;
        }

        // Feed the request body, then signal end-of-stream.
        if (payload) req.push(Buffer.from(payload));
        req.push(null);
    });
}
