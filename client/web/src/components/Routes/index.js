import React from 'react';
import { Route, Switch } from 'react-router-dom';

import Home from '../Home';

const Dummy1 = React.lazy(() =>
  import(/* webpackPrefetch: true */ '../Dummy1'),
);
const Dummy2 = React.lazy(() =>
  import(/* webpackPrefetch: true */ '../Dummy2'),
);

const Routes = () => (
  <Switch>
    <Route exact path="/" component={Home} />
    <Route exact path="/dummy1" component={Dummy1} />
    <Route exact path="/dummy2" component={Dummy2} />
  </Switch>
);

export default Routes;
