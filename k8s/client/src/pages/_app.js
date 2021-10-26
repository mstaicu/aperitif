import "../styles/globals.css";

import { buildClient } from "../utils";

const AppComponent = ({ Component, pageProps }) => <Component {...pageProps} />;

AppComponent.getInitialProps = async ({ Component, ctx }) => {
  const client = buildClient(ctx);

  const {
    data: { currentUser },
  } = await client.get("/api/auth/currentuser");

  /**
   * TODO: If the currentUser is undefined or null, redirect to sign in
   */

  let pageProps = {};

  if (Component.getInitialProps) {
    pageProps = await Component.getInitialProps(ctx, client, currentUser);
  }

  return {
    currentUser,
    ...pageProps,
  };
};

export default AppComponent;
