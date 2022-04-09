/**
 * @type {import('@remix-run/dev/config').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  browserBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildDirectory: "build",
  /**
   * Don't forget to set REMIX_DEV_SERVER_WS_PORT to 3001 as well
   */
  devServerPort: 3001,
};
