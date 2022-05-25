/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  /**
   * Don't forget to set REMIX_DEV_SERVER_WS_PORT to 3001 as well
   * We need this because Docker runs on the default port of Remix's WSS, which is 8002
   */
  devServerPort: 3001,
  ignoredRouteFiles: ["**/.*"],
  publicPath: "/build/",
  serverBuildPath: "build/index.js",
  serverBuildTarget: "node-cjs",
};
