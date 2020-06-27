import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

// eslint-disable-next-line
import injectGlobal from '../GlobalStyle';

import Routes from '../Routes';
import Nav from '../Nav';

import Loader from '../Loader';

const App = () => (
  <>
    <BrowserRouter>
      {/* TODO: Move into layout */}
      <Suspense fallback={<Loader />}>
        <Nav />
      </Suspense>
      <Suspense fallback={<Loader />}>
        <Routes />
      </Suspense>
    </BrowserRouter>
  </>
);

export default App;
