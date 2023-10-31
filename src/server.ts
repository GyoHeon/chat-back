import app from "./app";
import { httpServer } from "./socket";

/**
 * Start Express server.
 */
const server = httpServer.listen(app.get("port"), () => {
  console.log(
    "App is running at http://localhost:%d in %s mode",
    app.get("port"),
    app.get("env")
  );
});

export default server;
