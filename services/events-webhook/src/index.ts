import "dotenv/config";
import Fastify from "fastify";
import { handler } from "./handler.ts";

const PORT = Number(process.env.PORT ?? 3030);

type StructuredResult = Exclude<Awaited<ReturnType<typeof handler>>, string>;

const app = Fastify({ logger: true });

app.post("/events", async (req, reply) => {
  const result = (await handler({
    version: "2.0",
    routeKey: "$default",
    rawPath: "/events",
    rawQueryString: "",
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v ?? "")]),
    ),
    requestContext: {
      accountId: "local",
      apiId: "local",
      domainName: "local",
      domainPrefix: "local",
      http: {
        method: req.method,
        path: req.url,
        protocol: "HTTP/1.1",
        sourceIp: req.ip,
        userAgent: String(req.headers["user-agent"] ?? ""),
      },
      requestId: req.id,
      routeKey: "$default",
      stage: "$default",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body: typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}),
    isBase64Encoded: false,
  })) as StructuredResult;

  reply.code(result.statusCode ?? 200);
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) reply.header(k, String(v));
  }
  reply.send(result.body);
});

app.listen({ port: PORT, host: "0.0.0.0" }).then((addr) => {
  app.log.info({ addr }, "events-webhook local dev");
});
