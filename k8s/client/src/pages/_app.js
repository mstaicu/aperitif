import { buildClient } from "../utils";

const AppComponent = ({ Component, ...rest }) => <Component {...rest} />;

AppComponent.getInitialProps = async ({ Component, ctx }) => {
  const client = buildClient(ctx);

  const {
    data: { user },
  } = await client.get("/api/auth/currentuser");

  let pageProps = {};

  if (Component.getInitialProps) {
    pageProps = await Component.getInitialProps(ctx, client, user);
  }

  return {
    user,
    ...pageProps,
  };
};

export default AppComponent;
