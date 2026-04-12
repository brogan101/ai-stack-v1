import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttpModule from "pino-http";
import { logger } from "./lib/logger.js";
import { thoughtLog } from "./lib/thought-log.js";
import { stateOrchestrator } from "./lib/state-orchestrator.js";
import { distributedNodeAuthMiddleware, startDistributedNodeHeartbeat } from "./lib/network-proxy.js";
import routes from "./routes/index.js";

const pinoHttp = pinoHttpModule as unknown as typeof import("pino-http").default;

const app = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: { id: unknown; method: string; url?: string }) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res: { statusCode: number }) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(distributedNodeAuthMiddleware);
app.use("/api", routes);

// Initialise background services
void stateOrchestrator.hydrate();
startDistributedNodeHeartbeat();
thoughtLog.publish({
  category: "kernel",
  title: "API Startup",
  message: "Express application bootstrapped and core services initialized",
});

export default app;
