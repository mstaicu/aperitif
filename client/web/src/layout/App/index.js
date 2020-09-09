import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';

import { Routes } from '../Routes';

import { Loader, Nav } from '@src/components';

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
