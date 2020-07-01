import React from 'react';
import { Route, Switch } from 'react-router-dom';

import Home from '@src/components/screens/Home';

const Dummy1 = React.lazy(() =>
  import(/* webpackPrefetch: true */ '@src/components/screens/Dummy1'),
);
const Dummy2 = React.lazy(() =>
  import(/* webpackPrefetch: true */ '@src/components/screens/Dummy2'),
);

export const Routes = () => (
  <Switch>
    <Route exact path="/" component={Home} />
    <Route exact path="/dummy1" component={Dummy1} />
    <Route exact path="/dummy2" component={Dummy2} />
  </Switch>
);
