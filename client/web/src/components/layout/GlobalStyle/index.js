import React from 'react';
import { Global, css } from '@emotion/core';

/**
 * These 3 types weigh 188 KiB
 */
import OpenSansRegularWoff from '@src/assets/fonts/open-sans-v17-latin-regular.woff';
import OpenSansRegularWoffTwo from '@src/assets/fonts/open-sans-v17-latin-regular.woff2';

import OpenSansBoldWoff from '@src/assets/fonts/open-sans-v17-latin-700.woff';
import OpenSansBoldWoffTwo from '@src/assets/fonts/open-sans-v17-latin-700.woff2';

import OpenSansItalicWoff from '@src/assets/fonts/open-sans-v17-latin-700.woff';
import OpenSansItalicWoffTwo from '@src/assets/fonts/open-sans-v17-latin-700.woff2';

export const GlobalStyles = () => (
  <Global
    styles={css`
      @font-face {
        font-family: 'Open Sans';
        font-style: normal;
        font-weight: normal;
        src: url(${OpenSansRegularWoff}) format('woff'),
          url(${OpenSansRegularWoffTwo}) format('woff2');
      }
      @font-face {
        font-family: 'Open Sans';
        font-style: bold;
        font-weight: 700;
        src: url(${OpenSansBoldWoff}) format('woff'),
          url(${OpenSansBoldWoffTwo}) format('woff2');
      }
      @font-face {
        font-family: 'Open Sans';
        font-style: italic;
        font-weight: normal;
        src: url(${OpenSansItalicWoff}) format('woff'),
          url(${OpenSansItalicWoffTwo}) format('woff2');
      }
      html,
      body {
        font-family: 'Open Sans', sans-serif;
      }
      html {
        box-sizing: border-box;
      }
      *,
      *:before,
      *:after {
        box-sizing: inherit;
      }
    `}
  />
);
