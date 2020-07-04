import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { Routes } from '../Routes';
import { Nav } from '../Nav';

import { Loader } from '@src/components/ui';

export const App = () => (
  <BrowserRouter>
    <Suspense fallback={<Loader />}>
      <Nav />
    </Suspense>
    <Suspense fallback={<Loader />}>
      <Routes />
    </Suspense>
  </BrowserRouter>
);
