import React from 'react';
import ReactDOM from 'react-dom';

// eslint-disable-next-line
import i18n from '@config/i18n';

import { App } from '@src/components';

// eslint-disable-next-line react/no-render-return-value
const render = ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
);

if (module.hot) {
  module.hot.accept('@src/components', render);
}
